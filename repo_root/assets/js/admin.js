// assets/js/admin.js
(function () {
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Elemente aus deiner admin.html
  const guardInfo     = $("#guardInfo");

  // Create
  const formCreate    = $("#formCreate");
  const createEmail   = $("#createEmail");
  const createRole    = $("#createRole");
  const outCreate     = $("#outCreate");

  // Delete (per E-Mail -> wir mappen auf user_id)
  const formDelete    = $("#formDelete");
  const deleteEmail   = $("#deleteEmail");
  const outDelete     = $("#outDelete");

  // Search
  const formSearch    = $("#formSearch");
  const searchEmail   = $("#searchEmail");
  const searchResults = $("#searchResults");

  // List all + Filter
  const btnListAll    = $("#btnListAll");
  const filterRole    = $("#filterRole");
  const listResults   = $("#listResults");

  // Logout actions
  const btnLogoutAll     = $("#btnLogoutAll");
  const logoutRole       = $("#logoutRole");
  const btnLogoutByRole  = $("#btnLogoutByRole");
  const outLogout        = $("#outLogout");

  // Update (per E-Mail -> wir mappen auf user_id)
  const formUpdate   = $("#formUpdate");
  const updEmail     = $("#updEmail");     // E-Mail des Ziels (zum Finden der ID)
  const updRole      = $("#updRole");      // (alte Rolle? bleibt ungenutzt)
  const updName      = $("#updName");      // Backend kennt "name" nicht -> ignoriert
  const updNewRole   = $("#updNewRole");   // neue Rolle

  // Helpers
  function showOutput(el, msg, ok = true) {
    if (!el) return;
    el.textContent = msg;
    el.style.color = ok ? "#065f46" : "#b91c1c";
  }

  function renderTable(container, users) {
    const arr = Array.isArray(users) ? users : (users?.results || []);
    if (!container) return;
    const rows = arr.map(u => `
      <tr>
        <td>${u.id ?? ""}</td>
        <td>${u.email ?? ""}</td>
        <td>${u.role ?? ""}</td>
      </tr>
    `).join("");
    container.innerHTML = `
      <div class="table-wrap-inner">
        <table>
          <thead><tr><th>ID</th><th>E-Mail</th><th>Rolle</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="3">Keine Daten</td></tr>'}</tbody>
        </table>
      </div>
    `;
  }

  async function fetchUsers() {
    const data = await API.admin.listUsers();
    return Array.isArray(data) ? data : (data?.results || []);
  }

  function findByEmail(users, emailPart) {
    const q = String(emailPart || "").trim().toLowerCase();
    if (!q) return users;
    return users.filter(u => String(u.email || "").toLowerCase().includes(q));
  }

  async function resolveUserIdByEmail(email) {
    const all = await fetchUsers();
    const hit = all.find(u => String(u.email || "").toLowerCase() === String(email).trim().toLowerCase());
    if (!hit || !hit.id) throw new Error("Kein Benutzer mit dieser E-Mail gefunden.");
    return hit.id;
  }

  // --- Create ---
  formCreate?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showOutput(outCreate, "", true);
    try {
      const email = createEmail.value.trim();
      const role  = createRole.value;
      if (!email) throw new Error("E-Mail fehlt.");
      const res = await API.admin.createUser({ email, role });
      const temp = res?.temp_password ? ` (Temp-Passwort: ${res.temp_password})` : "";
      showOutput(outCreate, `Benutzer angelegt${temp}`, true);
    } catch (err) {
      showOutput(outCreate, err.message || "Fehler beim Anlegen", false);
    }
  });

  // --- Delete (via email -> map to id) ---
  formDelete?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showOutput(outDelete, "", true);
    try {
      const email = deleteEmail.value.trim();
      if (!email) throw new Error("E-Mail fehlt.");
      const id = await resolveUserIdByEmail(email);
      await API.admin.deleteUser(id);
      showOutput(outDelete, `Benutzer gelöscht (ID: ${id})`, true);
    } catch (err) {
      showOutput(outDelete, err.message || "Fehler beim Löschen", false);
    }
  });

  // --- Search (clientseitig, da kein Search-Endpoint sichtbar) ---
  formSearch?.addEventListener("submit", async (e) => {
    e.preventDefault();
    searchResults.textContent = "Suche…";
    try {
      const users = await fetchUsers();
      const filtered = findByEmail(users, searchEmail.value);
      renderTable(searchResults, filtered);
    } catch (err) {
      searchResults.innerHTML = `<div class="muted" style="color:#b91c1c">${err.message || "Fehler"}</div>`;
    }
  });

  // --- List all + filter role (clientseitig) ---
  btnListAll?.addEventListener("click", async () => {
    listResults.textContent = "Lade…";
    try {
      const users = await fetchUsers();
      const role = filterRole.value;
      const filtered = role ? users.filter(u => u.role === role) : users;
      renderTable(listResults, filtered);
    } catch (err) {
      listResults.innerHTML = `<div class="muted" style="color:#b91c1c">${err.message || "Fehler"}</div>`;
    }
  });

  filterRole?.addEventListener("change", async () => {
    // wenn schon geladen wurde, neu filtern
    if (!listResults.querySelector("table")) return;
    btnListAll.click();
  });

  // --- Logout all / by role (nur "all" ist verfügbar) ---
  btnLogoutAll?.addEventListener("click", async () => {
    showOutput(outLogout, "", true);
    if (!confirm("Alle Sitzungen wirklich abmelden?")) return;
    try {
      await API.admin.logoutAll();
      showOutput(outLogout, "Alle Sitzungen wurden beendet.", true);
    } catch (err) {
      showOutput(outLogout, err.message || "Fehler beim Logout-All", false);
    }
  });

  btnLogoutByRole?.addEventListener("click", async () => {
    // Backend bietet nur "alle". Ehrliche Info für die UI:
    const role = logoutRole.value || "(alle)";
    showOutput(outLogout, `Logout nach Rolle (${role}) wird vom Backend nicht unterstützt. Bitte 'Alle ausloggen' verwenden.`, false);
  });

 // --- Update (via email -> map to id) ---
formUpdate?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const out = $("#outUpdate");
  showOutput(out, "", true);
  try {
    const emailToFind = updEmail.value.trim();
    if (!emailToFind) throw new Error("Bitte E-Mail des zu aktualisierenden Benutzers angeben.");

    const id = await resolveUserIdByEmail(emailToFind);

    const payload = {};
    const newEmail = document.getElementById("updEmailNew")?.value.trim();
    const newRole  = document.getElementById("updNewRole")?.value;
    const newPw    = document.getElementById("updPassword")?.value.trim();

    if (newEmail) payload.email = newEmail;
    if (newRole)  payload.role = newRole;
    if (newPw)    payload.password = newPw;

    // >>> hinzugefügt: Nichts zu ändern -> abbrechen mit Hinweis
    if (Object.keys(payload).length === 0) {
      showOutput(out, "Keine änderbaren Felder gesetzt. (Unterstützt: email, role, password)", false);
      return;
    }

    await API.admin.updateUser(id, payload);
    showOutput(out, `Benutzer aktualisiert (ID: ${id})`, true);

    // optional UX:
    // document.getElementById("updEmailNew").value = "";
    // document.getElementById("updPassword").value = "";
    // document.getElementById("updNewRole").value = "";
  } catch (err) {
    showOutput(out, err.message || "Fehler beim Aktualisieren", false);
  }
});
  // Optional: Wenn du hier eine Admin-Rollenprüfung willst, brauchst du /users/me und eine Guard-Logik.
  // guardInfo.hidden = true/false – aktuell lassen wir es versteckt.

})();