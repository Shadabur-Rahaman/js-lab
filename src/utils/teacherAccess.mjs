export async function matchesTeacherCode(code, expectedHash, cryptoProvider = globalThis.crypto) {
  if (typeof code !== 'string' || !code.trim() || code.length > 200) return false;
  if (!cryptoProvider?.subtle) throw new Error('Secure code verification is unavailable.');
  const digest = await cryptoProvider.subtle.digest('SHA-256', new TextEncoder().encode(code.trim()));
  const actual = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  return actual === expectedHash;
}

export const TEACHER_IDLE_MS = 15 * 60 * 1000;
export const ATTEMPT_LIMIT = 5;
export const ATTEMPT_PAUSE_MS = 30 * 1000;

export function teacherSessionExpired(lastActivity, now = Date.now()) {
  return now - lastActivity >= TEACHER_IDLE_MS;
}
