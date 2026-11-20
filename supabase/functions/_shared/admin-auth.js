// Pure helpers for the scolaria-admin Edge Function (Deno). Kept dependency-free
// so they can be unit-tested with Node (tests/admin-auth.test.mjs).

/**
 * Email of the user whose token was successfully verified by Supabase Auth.
 * Returns "" when there is no token, when verification failed, or when no user
 * came back. The JWT payload is NEVER decoded or trusted here.
 * @param {string} bearerToken
 * @param {{ user?: { email?: string } | null } | null | undefined} authData
 * @param {unknown} authError
 * @returns {string}
 */
export function verifiedUserEmail(bearerToken, authData, authError) {
  if (!bearerToken || authError) return "";
  const email = authData && authData.user && authData.user.email;
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

/**
 * True only for a session verified by Supabase Auth and belonging to adminEmail.
 * @param {string} bearerToken
 * @param {{ user?: { email?: string } | null } | null | undefined} authData
 * @param {unknown} authError
 * @param {string} adminEmail
 * @returns {boolean}
 */
export function isAdminSession(bearerToken, authData, authError, adminEmail) {
  const expected = String(adminEmail || "").trim().toLowerCase();
  if (!expected) return false;
  const email = verifiedUserEmail(bearerToken, authData, authError);
  return email !== "" && constantTimeEqual(email, expected);
}

/**
 * Compares two secrets without leaking the position of the first difference.
 * Values are trimmed; an empty secret never matches.
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export function constantTimeEqual(a, b) {
  const x = String(a ?? "").trim();
  const y = String(b ?? "").trim();
  if (x.length === 0 || y.length === 0) return false;
  const length = Math.max(x.length, y.length);
  let diff = x.length ^ y.length;
  for (let i = 0; i < length; i++) {
    diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  }
  return diff === 0;
}
