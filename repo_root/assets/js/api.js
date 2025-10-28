// assets/js/api.js
(function () {
  const BASE = window.CONFIG?.API_BASE_URL || "";
  const KEY  = window.CONFIG?.TOKEN_KEY || "authToken";

  function getToken() {
    return sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
  }
  function setToken(token, remember = false) {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
    if (token) {
      (remember ? localStorage : sessionStorage).setItem(KEY, token);
    }
  }
  function clearToken() {
    sessionStorage.removeItem(KEY);
    localStorage.removeItem(KEY);
  }

  async function request(path, opts = {}) {
    const headers = new Headers(opts.headers || {});
    if (!(opts.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const tok = getToken();
    if (tok) headers.set("Authorization", `Bearer ${tok}`);

    const res = await fetch(`${BASE}${path}`, { ...opts, headers });
    const text = await res.text().catch(() => "");

    if (!res.ok) {
      throw new Error(text || `HTTP ${res.status}`);
    }

    if ((res.headers.get("content-type") || "").includes("application/json")) {
      return JSON.parse(text);
    }
    return text;
  }

  // ✅ Login laut Swagger
  async function login(username, password) {
    const body = new URLSearchParams({
      grant_type: "password",
      username,
      password
    });

    const res = await fetch(`${BASE}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    const text = await res.text().catch(() => "");

    if (!res.ok) throw new Error(text || "Login fehlgeschlagen");

    if ((res.headers.get("content-type") || "").includes("application/json")) {
      const data = JSON.parse(text);
      return data.access_token || data.token || data.jwt || data;
    }
    return text;
  }

  async function logout() {
    try { await request("/auth/logout", { method: "POST" }); }
    finally { clearToken(); }
  }

  // ✅ Benutzerinfo (für Rollenprüfung)
  async function me() {
    return request("/users/me");
  }

  // ✅ ADMIN-FUNKTIONEN übernommen & integriert
  const admin = {
    listUsers:      () => request("/admin/users"),
    createUser:     (data) => request("/admin/users", { method: "POST", body: JSON.stringify(data) }),
    getUser:        (id) => request(`/admin/users/${encodeURIComponent(id)}`),
    updateUser:     (id, data) => request(`/admin/users/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(data) }),
    deleteUser:     (id) => request(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
    logoutAll:      () => request("/admin/users/sessions", { method: "DELETE" }),
  };

  window.API = { request, getToken, setToken, clearToken, login, logout, me, admin };
})();