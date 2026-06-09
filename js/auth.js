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

  function _saveSession(data) {
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(MODEL_KEY, JSON.stringify(data.record ?? data.admin));
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

  // Paso 2: verificar código OTP
  // Si PocketBase exige 2FA (OTP + contraseña), devuelve { needsMfa: true, mfaId }
  async function loginWithOtp(otpId, code) {
    try {
      const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpId, password: code }),
      });
      const data = await res.json().catch(() => ({}));
      // OTP correcto pero PocketBase pide segundo factor (contraseña)
      if (data.mfaId) {
        return { success: false, needsMfa: true, mfaId: data.mfaId };
      }
      if (!res.ok) {
        return { success: false, error: data.message || 'Código incorrecto o expirado.' };
      }
      _saveSession(data);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // Paso 3 (solo cuando needsMfa): completar con contraseña
  async function completeMfa(email, password, mfaId) {
    try {
      const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, password, mfaId }),
      });
      if (!res.ok) return { success: false };
      const data = await res.json();
      _saveSession(data);
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  // Fallback: login directo con contraseña
  async function loginWithPassword(email, password) {
    try {
      const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, password }),
      });
      if (!res.ok) return { success: false };
      const data = await res.json();
      _saveSession(data);
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

  return { isLoggedIn, requestOtp, loginWithOtp, completeMfa, loginWithPassword, logout, getToken, requireAuth };
})();
