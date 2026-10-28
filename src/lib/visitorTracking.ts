const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scolaria-admin`;
const VISITOR_KEY = 'gestilys_visitor_id';
const SESSION_KEY = 'gestilys_visit_session';

function stableId(storage: Storage, key: string): string {
  try {
    const existing = storage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    storage.setItem(key, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function browserName(ua: string): string {
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet';
  if (/Edg\//i.test(ua)) return 'Microsoft Edge';
  if (/OPR\//i.test(ua)) return 'Opera';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/CriOS|Chrome\//i.test(ua)) return 'Chrome';
  if (/Safari\//i.test(ua) && !/Chrome|Chromium/i.test(ua)) return 'Safari';
  return 'Autre / non identifié';
}

function osName(ua: string): string {
  if (/Android/i.test(ua)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Autre / non identifié';
}

function deviceType(ua: string): string {
  if (/iPad|Tablet/i.test(ua)) return 'Tablette';
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'Téléphone';
  return 'Ordinateur';
}

async function send(payload: Record<string, unknown>, keepalive = false): Promise<void> {
  try {
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
    await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify(payload),
      keepalive,
    });
  } catch {
    // Analytics must never interrupt the public site if tracking is unavailable.
  }
}

/** Tracks only the public landing/auth flow; it never collects a phone number or raw IP. */
export function trackPublicVisit(page: 'landing' | 'auth'): () => void {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return () => undefined;
  const visitId = crypto.randomUUID();
  const startedAt = Date.now();
  const ua = navigator.userAgent || '';
  const url = new URL(window.location.href);
  const visitorId = stableId(localStorage, VISITOR_KEY);
  const sessionId = stableId(sessionStorage, SESSION_KEY);
  const payload = {
    action: 'record_visit',
    visit: {
      id: visitId,
      visitor_id: visitorId,
      session_id: sessionId,
      page_path: page === 'auth' ? '/auth' : '/',
      referrer_origin: document.referrer ? safeOrigin(document.referrer) : null,
      utm_source: safeCampaign(url.searchParams.get('utm_source')),
      utm_medium: safeCampaign(url.searchParams.get('utm_medium')),
      utm_campaign: safeCampaign(url.searchParams.get('utm_campaign')),
      device_type: deviceType(ua),
      operating_system: osName(ua),
      browser: browserName(ua),
      screen_size: `${Math.min(window.screen.width || 0, 10000)}x${Math.min(window.screen.height || 0, 10000)}`,
      language: (navigator.language || '').slice(0, 24),
      timezone: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone.slice(0, 80); } catch { return null; } })(),
    },
  };
  void send(payload);
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    const durationSeconds = Math.max(0, Math.min(86400, Math.round((Date.now() - startedAt) / 1000)));
    void send({ action: 'finish_visit', visit_id: visitId, duration_seconds: durationSeconds }, true);
  };
  window.addEventListener('pagehide', finish, { once: true });
  return () => {
    window.removeEventListener('pagehide', finish);
    finish();
  };
}

function safeOrigin(value: string): string | null {
  try { return new URL(value).origin.slice(0, 200); } catch { return null; }
}

function safeCampaign(value: string | null): string | null {
  return value ? value.replace(/[<>\u0000-\u001f]/g, '').slice(0, 120) : null;
}
