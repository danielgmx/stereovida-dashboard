const PB_URL = 'http://76.13.122.2:8090';

const Auth = (() => {
  const TOKEN_KEY = 'sv_token';
  const MODEL_KEY = 'sv_admin';

  function isLoggedIn() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    // Basic JWT expiry check
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  async function login(email, password) {
    try {
      const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, password }),
      });
      if (!res.ok) return { success: false };
      const data = await res.json();
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(MODEL_KEY, JSON.stringify(data.record ?? data.admin));
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(MODEL_KEY);
    window.location.href = 'login.html';
  }

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function requireAuth() {
    if (!isLoggedIn()) window.location.href = 'login.html';
  }

  return { isLoggedIn, login, logout, getToken, requireAuth };
})();
