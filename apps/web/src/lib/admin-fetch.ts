const ADMIN_LOGIN_PATH = '/admin/login';

let redirectingToLogin = false;

function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('adminToken') || localStorage.getItem('token');
  } catch {
    return null;
  }
}

/** A 401 means the admin session expired or was revoked: drop the token and send the admin to the login page. */
function handleAdminUnauthorized(res: Response): void {
  if (res.status !== 401 || typeof window === 'undefined') return;
  try {
    localStorage.removeItem('adminToken');
  } catch {
    // Storage unavailable: the redirect still ends the session in this tab.
  }
  if (redirectingToLogin || window.location.pathname === ADMIN_LOGIN_PATH) return;
  redirectingToLogin = true;
  // A plain function has no router; a full page load also discards everything loaded under the old session
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(ADMIN_LOGIN_PATH);
}

/**
 * fetch() for admin API calls: adds the admin Bearer token (keeping any headers passed in)
 * and handles an expired session. The response is always returned so callers keep working.
 */
export async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : undefined));
  const token = getAdminToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(input, { ...init, headers });
  handleAdminUnauthorized(res);
  return res;
}
