// Theme toggle (behält Setting wie auf anderen Seiten)
(function themeInit(){
    const saved = localStorage.getItem("theme");
    const html = document.documentElement;
    if (saved) html.setAttribute("data-theme", saved);
    document.getElementById("themeToggle")?.addEventListener("click", ()=>{
      const next = html.getAttribute("data-theme")==="dark" ? "light" : "dark";
      html.setAttribute("data-theme", next);
      localStorage.setItem("theme", next);
    });
  })();
  
  // Expand / Collapse Logik pro Kachel – NUR eine gleichzeitig offen
  document.querySelectorAll(".card").forEach((card)=>{
    const head = card.querySelector(".card-head");
    const panel = card.querySelector(".card-panel");
    if (!head || !panel) return;
  
    head.addEventListener("click", ()=>{
      // alle offenen schließen
      document.querySelectorAll('.card[data-open="true"]').forEach(c=>{
        if (c !== card) {
          c.setAttribute("data-open", "false");
          c.querySelector(".card-head")?.setAttribute("aria-expanded", "false");
          c.querySelector(".card-panel")?.style.setProperty("max-height","0px");
        }
      });
  
      const isOpen = card.getAttribute("data-open")==="true";
      card.setAttribute("data-open", String(!isOpen));
      head.setAttribute("aria-expanded", String(!isOpen));
  
      if (!isOpen) {
        // öffnen mit Animation
        panel.style.maxHeight = panel.scrollHeight + "px";
        setTimeout(()=> panel.style.maxHeight = "", 260);
      } else {
        // schließen mit Animation
        panel.style.maxHeight = panel.scrollHeight + "px";
        requestAnimationFrame(()=>{
          panel.style.maxHeight = "0px";
          setTimeout(()=> panel.style.maxHeight = "", 260);
        });
      }
    });
  
    // Tastaturbedienung: Enter/Space togglen
    head.addEventListener("keydown", (e)=>{
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        head.click();
      }
    });
  });
  