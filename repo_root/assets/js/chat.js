// ================================
// chat.js – Chat mit Datei-Vorschau, Copy-Button & Dark-Mode
// ================================

// --- Theme init (persist + System) ---
(function themeInit() {
  const saved = localStorage.getItem("theme");
  const html = document.documentElement;
  if (saved) {
    html.setAttribute("data-theme", saved);
  } else {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    html.setAttribute("data-theme", prefersDark ? "dark" : "light");
  }
})();
document.getElementById("themeToggle")?.addEventListener("click", () => {
  const html = document.documentElement;
  const next = html.getAttribute("data-theme") === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
});

// --- Helpers ---
const qs = (k) => new URLSearchParams(window.location.search).get(k);
const el = (id) => document.getElementById(id);
const cloneTpl = (id) => document.getElementById(id)?.content.firstElementChild.cloneNode(true);
const messages = el("messages");
const useMock = new URLSearchParams(location.search).has("mock");

const isNearBottom = () => {
  if (!messages) return true;
  // präzise Kante (±1px)
  return (messages.scrollTop + messages.clientHeight) >= (messages.scrollHeight - 1);
};
function append(node) {
  if (!messages || !node) return;
  const shouldScroll = isNearBottom();
  messages.appendChild(node);
  if (shouldScroll) node.scrollIntoView({ behavior: "smooth", block: "end" });
}

// --- Modelle ---
const LLM_ENDPOINTS = {
  llama3: { name: "Llama 3", icon: "🦙", type: "openai" },
  mistral: { name: "Mistral", icon: "🌬️", type: "openai" },
  gptj:   { name: "GPT-J",   icon: "🧠", type: "custom" },
};

// --- State ---
const modelKey = qs("llm");
const modelCfg = LLM_ENDPOINTS[modelKey];
const history = [];

// --- Init ---
(function init() {
  el("modelBadge") && (el("modelBadge").textContent = modelCfg ? modelCfg.name : "Demo (Mock)");
  pushBot(
    `Hallo! ${modelCfg ? `Ich bin ${modelCfg.name}.` : "Dies ist der Mock-Modus für UI-Tests."}`,
    { botIcon: modelCfg?.icon ?? "🤖" }
  );
})();

// --- Push User/Bot Messages ---
function pushUser(text) {
  const n = cloneTpl("tpl-msg-user");
  if (!n) return;
  n.querySelector(".bubble").textContent = text;
  n.querySelector(".meta").textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const uicon = n.querySelector(".avatar__icon");
  if (uicon) uicon.textContent = "🤡";
  append(n);
}

function pushBot(text, opts = {}) {
  const n = cloneTpl("tpl-msg-bot");
  if (!n) return;
  n.querySelector(".bubble").textContent = text;
  n.querySelector(".meta").textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const bicon = n.querySelector(".avatar__icon");
  if (opts.botIcon && bicon) bicon.textContent = opts.botIcon;
  append(n);
}

// --- Typing Indicator ---
let typingNode = null;
function showTyping() {
  if (typingNode) return;
  const tpl = document.createElement("template");
  tpl.innerHTML = `
    <div class="msg bot typing">
      <div class="avatar avatar--bot"><span class="avatar__icon">${modelCfg?.icon ?? "🤖"}</span></div>
      <div class="stack">
        <div class="bubble"><span class="typing-dots"><span></span><span></span><span></span></span></div>
      </div>
    </div>`;
  typingNode = tpl.content.firstElementChild;
  append(typingNode);
}
function hideTyping() {
  typingNode?.remove();
  typingNode = null;
}

// --- Auto-resize Textarea ---
const ta = el("userInput");
if (ta) {
  const autoresize = () => {
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, window.innerHeight * 0.4) + "px";
  };
  ta.addEventListener("input", autoresize);
  autoresize();
  window.addEventListener("resize", () => requestAnimationFrame(autoresize));
}

// --- Datei-Vorschau im Textfeld (Pill, nicht sofort senden) ---
const fileInput = document.getElementById("fileInput");
const inputFieldWrap = document.querySelector(".input-field");
let selectedFile = null;

function prettyBytes(bytes) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0, n = bytes;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

function renderAttachmentPill() {
  if (!inputFieldWrap) return;
  inputFieldWrap.querySelector(".attach-pill")?.remove();

  if (!selectedFile) {
    inputFieldWrap.classList.remove("has-attachment");
    return;
  }
  inputFieldWrap.classList.add("has-attachment");

  const pill = document.createElement("div");
  pill.className = "attach-pill";
  pill.innerHTML = `
    <span>📎</span>
    <span class="attach-name" title="${selectedFile.name}">${selectedFile.name}</span>
    <span class="attach-size">(${prettyBytes(selectedFile.size)})</span>
    <button type="button" class="attach-remove" title="Anhang entfernen">×</button>
  `;
  pill.querySelector(".attach-remove").addEventListener("click", () => {
    selectedFile = null;
    if (fileInput) fileInput.value = "";
    renderAttachmentPill();
  });
  inputFieldWrap.appendChild(pill);
}

fileInput?.addEventListener("change", () => {
  selectedFile = fileInput.files && fileInput.files[0] ? fileInput.files[0] : null;
  renderAttachmentPill();
});

// --- Keyboard Shortcuts ---
const form = el("chatForm");
ta?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    form?.requestSubmit();
  }
  if (e.key === "Escape") {
    ta.value = "";
    ta.dispatchEvent(new Event("input"));
    // Anhang entfernen
    selectedFile = null;
    if (fileInput) fileInput.value = "";
    renderAttachmentPill();
    ta.focus();
  }
});

// --- Form Submit ---
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const baseText = ta ? ta.value.trim() : "";
  if (!baseText && !selectedFile) return;

  // sichtbarer Text: Text + optionaler Anhangshinweis
  let textToShow = baseText;
  if (selectedFile) {
    const hint = `\n📂 Anhang: ${selectedFile.name} (${prettyBytes(selectedFile.size)})`;
    textToShow = baseText ? `${baseText}${hint}` : hint;
  }

  // Eingabe & Vorschau zurücksetzen
  if (ta) {
    ta.value = "";
    ta.dispatchEvent(new Event("input"));
  }
  selectedFile = null;
  if (fileInput) fileInput.value = "";
  renderAttachmentPill();

  // im Verlauf anzeigen
  pushUser(textToShow);
  history.push({ role: "user", content: textToShow });

  // Bot simulieren
  showTyping();
  await new Promise((r) => setTimeout(r, 800));
  hideTyping();
  const reply = useMock ? "✅ Mock-Antwort: UI funktioniert" : "Antwort vom Server (Demo)";
  pushBot(reply, { botIcon: modelCfg?.icon });
  history.push({ role: "assistant", content: reply });
});

// --- Delegiertes Kopieren + „Kopiert!“-Feedback ---
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".tool-copy");
  if (!btn) return;
  const bubble = btn.closest(".stack")?.querySelector(".bubble");
  if (!bubble) return;

  navigator.clipboard.writeText(bubble.textContent.trim()).then(() => {
    btn.classList.add("copied");
    setTimeout(() => btn.classList.remove("copied"), 1000);
  });
});

// --- Scroll Button ---
const scrollBtn = el("scrollBtn");
messages?.addEventListener("scroll", () => {
  scrollBtn?.classList.toggle("show", !isNearBottom());
});
scrollBtn?.addEventListener("click", () => {
  messages?.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "end" });
});


