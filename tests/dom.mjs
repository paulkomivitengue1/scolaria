/**
 * Minimal jsdom environment for the Gestilys import tests.
 * Provides IndexedDB (fake-indexeddb), File/Blob (jsdom) and timers.
 */
import { JSDOM } from 'jsdom';
import 'fake-indexeddb/auto';

const FORCED = [
  'navigator', 'location', 'history', 'File', 'Blob', 'FileReader', 'FormData',
  'Event', 'CustomEvent', 'SubmitEvent', 'DOMException', 'Node', 'Element', 'Text',
  'DocumentFragment', 'HTMLElement', 'HTMLInputElement', 'HTMLAnchorElement',
  'HTMLTableElement', 'MouseEvent', 'KeyboardEvent', 'PointerEvent', 'FileList',
  'DragEvent', 'DataTransfer', 'getComputedStyle', 'requestAnimationFrame',
  'cancelAnimationFrame', 'sessionStorage', 'localStorage', 'DOMParser',
  'MutationObserver', 'NodeList', 'HTMLLabelElement', 'HTMLButtonElement',
];

export function setupDom(url = 'https://gestilys.test/') {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url,
    pretendToBeVisual: true,
  });
  const { window } = dom;

  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.self = window;

  for (const key of FORCED) {
    const value = window[key];
    if (value === undefined) continue;
    try {
      Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
    } catch {
      /* Some globals cannot be redefined; the test will surface it. */
    }
  }
  for (const key of Object.getOwnPropertyNames(window)) {
    if (key in globalThis) continue;
    try {
      const value = window[key];
      if (typeof value === 'function' || typeof value === 'object') {
        Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
      }
    } catch {
      /* Ignore non-configurable globals. */
    }
  }

  if (typeof globalThis.structuredClone !== 'function') {
    globalThis.structuredClone = (value) => JSON.parse(JSON.stringify(value));
  }

  // jsdom does not expose these on the global object by default.
  window.HTMLElement.prototype.scrollIntoView = window.HTMLElement.prototype.scrollIntoView || function () {};
  if (!globalThis.fetch) globalThis.fetch = window.fetch || (() => Promise.reject(new Error('pas de réseau')));

  return dom;
}

export async function waitFor(predicate, { timeout = 4000, interval = 20, label = 'condition' } = {}) {
  const started = Date.now();
  let last;
  while (Date.now() - started < timeout) {
    try {
      last = predicate();
      if (last) return last;
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error(`Délai dépassé en attendant ${label} (dernier: ${String(last).slice(0, 200)})`);
}

export async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Picks a file in the first <input type="file"> of the container. */
export function selectFile(container, file) {
  const input = container.querySelector('input[type="file"]');
  if (!input) throw new Error('Aucun champ de fichier trouvé');
  const list = { 0: file, length: 1, item: (index) => (index === 0 ? file : null), [Symbol.iterator]: function* () { yield file; } };
  Object.defineProperty(input, 'files', { value: list, configurable: true });
  input.dispatchEvent(new window.Event('change', { bubbles: true }));
  return input;
}

export function textOf(node) {
  return (node?.textContent || '').replace(/\s+/g, ' ').trim();
}
