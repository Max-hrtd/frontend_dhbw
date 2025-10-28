// assets/js/auth-guard.js
(function () {
  const KEY = window.CONFIG?.TOKEN_KEY || "authToken";
  const token = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
  const isAuthPage = location.pathname.endsWith("/auth.html") || location.pathname.endsWith("auth.html");

  if (!token && !isAuthPage) {
    location.replace("auth.html");
    return;
  }

  // Rollen-Guard (optional): <body data-require-role="admin">
  const required = document.body?.dataset?.requireRole;
  if (required && token) {
    // leichte Cache-Optimierung: erst localStorage prüfen
    const cached = localStorage.getItem("auth-role");
    if (cached && cached === required) return;

    (async () => {
      try {
        const me = await API.me();
        const role = me?.role || "";
        localStorage.setItem("auth-role", role);
        if (required && role !== required) {
          alert("Kein Zugriff: erforderliche Rolle " + required);
          location.replace("index.html");
        }
      } catch {
        location.replace("auth.html");
      }
    })();
  }
})();