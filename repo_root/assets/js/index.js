// --- Theme (persist + Systemerkennung) ---
(function themeInit() {
  const saved = localStorage.getItem("theme");
  const html = document.documentElement;

  if (saved === "light" || saved === "dark") {
    html.setAttribute("data-theme", saved);
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    html.setAttribute("data-theme", prefersDark ? "dark" : "light");
    const mm = window.matchMedia("(prefers-color-scheme: dark)");
    mm.addEventListener?.("change", (e) => {
      if (!localStorage.getItem("theme")) {
        html.setAttribute("data-theme", e.matches ? "dark" : "light");
      }
    });
  }
})();
document.getElementById("themeToggle")?.addEventListener("click", () => {
  const html = document.documentElement;
  const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
});

// --- Utils ---
const $ = (id) => document.getElementById(id);
const useMock = new URLSearchParams(location.search).has("mock");

// --- Kontakt & Details Konfiguration (optional) ---
const CONTACT_EMAIL = "ansprechpartner@beispiel.de"; // <- hier deine Mail eintragen
const CONTACT_SUBJECT = "Anfrage zu LLMs";
const CONTACT_BODY = "Hallo,%0D%0A%0D%0Aich habe eine Frage zu den LLMs ...";
const mailLink = $("mailLink");
if (mailLink) {
  mailLink.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(CONTACT_SUBJECT)}&body=${CONTACT_BODY}`;
}

// --- Modelle & Dropdown (bestehend) ---
const LLM_CONFIG = {
  llama3: { name: "Llama 3", desc: "OpenAI-kompatibel" },
  mistral: { name: "Mistral", desc: "OpenAI-kompatibel" },
  gptj:   { name: "GPT-J",   desc: "Einfaches JSON" }
};

const dropdownBtn  = $("dropdownBtn");
const dropdownList = $("dropdownList");

dropdownBtn?.addEventListener("click", () => {
  const expanded = dropdownBtn.getAttribute("aria-expanded") === "true";
  dropdownBtn.setAttribute("aria-expanded", String(!expanded));
  dropdownList?.setAttribute("aria-hidden", String(expanded));
});

document.addEventListener("click", (e) => {
  if (!dropdownList?.contains(e.target) && e.target !== dropdownBtn) {
    dropdownBtn?.setAttribute("aria-expanded", "false");
    dropdownList?.setAttribute("aria-hidden", "true");
  }
});

(function renderLLMItems() {
  if (!dropdownList) return;
  dropdownList.innerHTML = "";
  Object.entries(LLM_CONFIG).forEach(([key, cfg]) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.className = "dropdown-item";
    btn.setAttribute("role", "option");
    btn.innerHTML = `<strong>${cfg.name}</strong><span class="dropdown-desc">${cfg.desc}</span>`;
    btn.addEventListener("click", () => {
      window.location.href = `chat.html?llm=${encodeURIComponent(key)}${useMock ? "&mock=1" : ""}`;
    });
    li.appendChild(btn);
    dropdownList.appendChild(li);
  });
})();

document.getElementById("logoutBtn")?.addEventListener("click", async () => {
  try {
    await API.logout(); // Backend-Logout / Token invalidieren
  } catch (err) {
    console.warn("Logout-Request fehlgeschlagen", err);
  }

  // Lokale Auth entfernen
  localStorage.clear();
  sessionStorage.clear();

  // zurück zum Login
  location.replace("auth.html");
});

// =====================================================
// VM-Templates Dropdown + Klonen (Proxmox-API)
// =====================================================

// Warten bis ALLE Skripte (inkl. config.js) geladen sind,
// damit window.CONFIG sicher verfügbar ist.
window.addEventListener("load", () => {
  const vmBtn  = $("vmDropdownBtn");
  const vmList = $("vmDropdownList");
  if (!vmBtn || !vmList) return;

  const API_BASE = (window.CONFIG && window.CONFIG.API_BASE_URL) || "";
  const VM_API = {
    list:  `${API_BASE}/pve/templates`,
    clone: `${API_BASE}/pve/templates/clone`,
  };

  // Optional: Token mitsenden (falls nach Login vorhanden)
  function authHeaders() {
    const token = localStorage.getItem("auth-token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Fallback für Mock-Modus
  const MOCK_TEMPLATES = [
    { id: "tmpl-debian-12-min", name: "Debian 12 minimal", desc: "Klein, schnell, CLI-only" },
    { id: "tmpl-ubuntu-24-lts", name: "Ubuntu 24.04 LTS", desc: "Server LTS, gängige Basis" },
    { id: "tmpl-win2022-core",  name: "Windows Server 2022 Core", desc: "ohne GUI, schlank" }
  ];

  // Normalisierung auf {id,name,desc}
  function normalizeTemplate(t) {
    const id   = t.id ?? t.templateId ?? t.template ?? t.vmid ?? t.name;
    const name = t.name ?? t.label ?? t.template ?? String(id);
    const desc = t.desc ?? t.description ?? t.notes ?? "";
    return { id, name, desc };
  }

  async function fetchTemplates() {
    if (useMock) return MOCK_TEMPLATES;

    try {
      const res = await fetch(VM_API.list, { headers: { ...authHeaders() } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // erlaubte Formen: [] oder { data: [] }
      const arr = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      return arr.map(normalizeTemplate).filter(x => !!x.id);
    } catch (e) {
      console.error("Templates laden fehlgeschlagen:", e);
      return [];
    }
  }

  async function cloneFromTemplate(templateId) {
    if (useMock) {
      alert(`✅ Mock: VM wird aus Template „${templateId}“ geklont…`);
      return;
    }
    const payload = { templateId }; // bei Bedarf um node/vmid/name/etc. erweitern

    try {
      const res = await fetch(VM_API.clone, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const out = await res.json();
      alert(`✅ Klon-Job gestartet${out?.task ? ` (Task: ${out.task})` : ""}`);
    } catch (e) {
      console.error("VM-Klon fehlgeschlagen:", e);
      alert("❌ VM-Klon fehlgeschlagen. Details in der Konsole.");
    }
  }

  // Dropdown togglen/schließen (gleiches Verhalten wie beim LLM-Menü)
  vmBtn.addEventListener("click", () => {
    const expanded = vmBtn.getAttribute("aria-expanded") === "true";
    vmBtn.setAttribute("aria-expanded", String(!expanded));
    vmList.setAttribute("aria-hidden", String(expanded));
  });
  document.addEventListener("click", (e) => {
    if (!vmList.contains(e.target) && e.target !== vmBtn) {
      vmBtn.setAttribute("aria-expanded", "false");
      vmList.setAttribute("aria-hidden", "true");
    }
  });

  // Rendern
  (async function renderVmTemplates() {
    vmList.innerHTML = "";

    const templates = await fetchTemplates();
    if (!templates.length) {
      const li = document.createElement("li");
      li.innerHTML = `<div class="dropdown-item" role="option" aria-disabled="true">
        <strong>Keine Templates gefunden</strong>
        <span class="dropdown-desc">Bitte Backend prüfen</span>
      </div>`;
      vmList.appendChild(li);
      return;
    }

    templates.forEach((t) => {
      const li  = document.createElement("li");
      const btn = document.createElement("button");
      btn.className = "dropdown-item";
      btn.setAttribute("role", "option");
      btn.innerHTML = `<strong>${t.name}</strong><span class="dropdown-desc">${t.desc || t.id}</span>`;
      btn.addEventListener("click", () => {
        vmBtn.textContent = t.name;
        vmBtn.setAttribute("aria-expanded", "false");
        vmList.setAttribute("aria-hidden", "true");
        cloneFromTemplate(t.id);
      });
      li.appendChild(btn);
      vmList.appendChild(li);
    });
  })();
});
