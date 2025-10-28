// assets/js/auth.js

// Theme-Teil aus deiner Datei unverändert lassen…
// …ab hier die Login-spezifische Logik:

const FORM = document.getElementById("authForm");
const EMAIL = document.getElementById("email");
const PASS = document.getElementById("password");
const REMEMBER = document.getElementById("remember");
const ERR = document.getElementById("error");
const TOGGLE_PASS = document.getElementById("togglePassword");

TOGGLE_PASS?.addEventListener("click", () => {
  const isHidden = PASS.type === "password";
  PASS.type = isHidden ? "text" : "password";
  TOGGLE_PASS.textContent = isHidden ? "🙈" : "👁️";
});

function isValidEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

FORM?.addEventListener("submit", async (e) => {
  e.preventDefault();
  ERR.style.display = "none";
  const email = (EMAIL?.value || "").trim();
  const pw    = (PASS?.value || "").trim();
  const remember = !!REMEMBER?.checked;

  if (!isValidEmail(email) || !pw) {
    ERR.style.display = "block";
    PASS?.focus();
    PASS?.select();
    return;
  }

  try {
    // 1) Login -> Token
    const token = await API.login(email, pw);
    API.setToken(token, remember);

    // 2) Rolle ermitteln
    let role = "user";
    try {
      const me = await API.me();  // erwartet z.B. { email, role: "admin"|"user", ... }
      if (me?.role) role = me.role;
      // optional speichern
      localStorage.setItem("auth-role", role);
      localStorage.setItem("auth-email", me?.email || email);
    } catch {
      // wenn /users/me nicht verfügbar sein sollte, weiter ohne
    }

    // 3) Weiterleitung je nach Rolle
    if (role === "admin") {
      location.replace("admin.html");
    } else {
      location.replace("index.html");
    }
  } catch (err) {
    ERR.textContent = "E-Mail oder Passwort ist ungültig.";
    ERR.style.display = "block";
    PASS?.focus();
    PASS?.select();
  }
});