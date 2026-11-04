// Access can redirect an expired session to a 200 HTML login page. Never treat
// that page (or malformed JSON) as a successful upload or metadata mutation.
export async function protectedJson(response, recheck = () => {}) {
  if (response.redirected || !/^application\/json(?:;|$)/i.test(response.headers.get('content-type') || '')) {
    recheck();
    throw Error('Your access needs to be checked. Reload and sign in again if requested.');
  }
  let data;
  try { data = await response.json(); } catch { throw Error('The service returned an unreadable response. Please retry.'); }
  if (response.status === 401 || response.status === 403) recheck();
  if (!response.ok || data?.error || data == null)
    throw Error(data?.code === 'invalid_or_changed_record'
      ? 'Check the details, email uniqueness and dates, then refresh and retry.'
      : data?.error || 'The operation failed. Please retry.');
  return data;
}
