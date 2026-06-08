const PB_URL = '/pb';

const Auth = (() => {
  const TOKEN_KEY = 'sv_token';
  const MODEL_KEY = 'sv_admin';

  function isLoggedIn() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }

  // Paso 1: solicitar código OTP al correo
  async function requestOtp(email) {
    try {
      const res = await fetch(`${PB_URL}/api/collections/_superusers/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) return { success: false };
      const data = await res.json();
      return { success: true, otpId: data.otpId };
    } catch {
      return { success: false };
    }
  }

  // Paso 2: verificar código OTP e iniciar sesión
  async function loginWithOtp(otpId, code) {
    try {
      const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpId, password: code }),
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

  // Fallback: login con contraseña (por si SMTP no está configurado)
  async function loginWithPassword(email, password) {
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

  return { isLoggedIn, requestOtp, loginWithOtp, loginWithPassword, logout, getToken, requireAuth };
})();
