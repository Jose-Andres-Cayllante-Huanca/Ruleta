(() => {
  /* ===== CONFIGURACIÓN DE LA DEMO (solo desde código) =====
     Número de giro -> texto exacto de la entrada que ganará.
     Ejemplo: en el giro 2 gana "Opción 3" y en el giro 5 gana "Opción 6". */
  const FIXED_ROUNDS = { 3: "Mariela", 5: "Mariela" };
  const REVEAL_FIXED = true; // true: al terminar avisa que el resultado estaba programado
  /* ======================================================== */
  const $ = id => document.getElementById(id);
  const cv = $("wheel"), ctx = cv.getContext("2d");
  const ta = $("entries");
  const PALETTES = [
    ["#dd0b0b", "#4f98d6", "#ffffff", "#e2f52f", "#5c1f8a", "#0fb12b", "#e67a08"],
    ["#e63946", "#f4a261", "#2a9d8f", "#264653", "#e9c46a", "#8d99ae", "#6a4c93"],
    ["#ff6b6b", "#feca57", "#48dbfb", "#1dd1a1", "#5f27cd", "#ff9ff3", "#576574"]
  ];
  const state = { pal: 0, rot: 0, busy: false, history: [], duration: 5, removeWinner: false };

  const lines = () => ta.value.split("\n").map(s => s.trim()).filter(Boolean);
  const isLight = c => { const n = parseInt(c.slice(1), 16); return ((n >> 16) * .3 + ((n >> 8) & 255) * .59 + (n & 255) * .11) > 150; };

  /* ---------- Dibujo ---------- */
  function draw() {
    const dpr = window.devicePixelRatio || 1;
    const size = cv.clientWidth * dpr;
    if (!size) return;
    cv.width = cv.height = size;
    const L = lines(), n = Math.max(L.length, 1), a = 2 * Math.PI / n, r = size / 2 - 4 * dpr;
    ctx.clearRect(0, 0, size, size);
    ctx.save(); ctx.translate(size / 2, size / 2); ctx.rotate(state.rot);
    const pal = PALETTES[state.pal];
    for (let i = 0; i < n; i++) {
      const c = pal[i % pal.length];
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, i * a, (i + 1) * a); ctx.closePath();
      ctx.fillStyle = c; ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = dpr; ctx.stroke();
      if (L[i]) {
        ctx.save(); ctx.rotate((i + .5) * a); ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillStyle = isLight(c) ? "#111" : "#fff";
        const fs = Math.min(size * .075, (r * a) * .6);
        ctx.font = fs + "px Roboto, Arial, sans-serif";
        let t = L[i]; while (t.length > 3 && ctx.measureText(t).width > r * .72) t = t.slice(0, -2) + "…";
        ctx.fillText(t, r - size * .04, 0); ctx.restore();
      }
    }
    ctx.beginPath(); ctx.arc(0, 0, size * .1, 0, Math.PI * 2);
    ctx.fillStyle = "#e9e9ee"; ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = 8 * dpr; ctx.fill();
    ctx.restore();
  }

  function refresh() {
    $("count").textContent = "Entradas: " + lines().length;
    draw();
  }

  /* ---------- Giro ---------- */
  function spin() {
    const L = lines();
    if (state.busy || L.length < 2) return;
    state.busy = true; $("hint").style.display = "none";
    const n = L.length, a = 2 * Math.PI / n, M = 2 * Math.PI;
    state.spins = (state.spins || 0) + 1;
    let idx = Math.floor(Math.random() * n);
    state.fixed = false;
    const target = FIXED_ROUNDS[state.spins];
    if (target) {
      const k = L.findIndex(x => x.toLowerCase() === target.toLowerCase());
      if (k >= 0) { idx = k; state.fixed = true; }
    }
    const jitter = Math.random() * .8 - .4;
    const delta = ((-(idx + .5 + jitter) * a - state.rot) % M + M) % M;
    const from = state.rot, to = from + M * (5 + Math.floor(Math.random() * 3)) + delta;
    const dur = state.duration * 1000, t0 = performance.now();
    (function frame(now) {
      const p = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
      state.rot = from + (to - from) * e; draw();
      if (p < 1) return requestAnimationFrame(frame);
      state.rot %= M; state.busy = false; win(L[idx], idx);
    })(t0);
  }

  function win(name, idx) {
    state.history.unshift(name); renderResults();
    const note = (state.fixed && REVEAL_FIXED)
      ? "": "";
    modal(`<h2>${esc(name)}</h2>${note}<button id="mRm">Quitar</button><button id="mOk">Cerrar</button>`);
    $("mOk").onclick = closeModal;
    $("mRm").onclick = () => { const L = lines(); L.splice(idx, 1); ta.value = L.join("\n"); refresh(); closeModal(); };
    if (state.removeWinner) $("mRm").click();
  }

  /* ---------- Utilidades UI ---------- */
  const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  function modal(html) { $("box").innerHTML = html; $("modal").classList.add("show"); }
  function closeModal() { $("modal").classList.remove("show"); }
  $("modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
  function renderResults() { const b = $("badge"); b.textContent = state.history.length; b.hidden = !state.history.length; $("pane-results").innerHTML = state.history.map(h => `<li>${esc(h)}</li>`).join("") || "<li>Sin resultados todavía</li>"; }

  function setTab(t) {
    document.querySelectorAll(".tab").forEach(b => b.classList.toggle("on", b.dataset.tab === t));
    $("pane-entries").hidden = t !== "entries";
    $("pane-results").hidden = t !== "results";
    $("pane-hide").hidden = t !== "hide";
  }
  document.querySelectorAll(".tab").forEach(b => b.onclick = () => setTab(b.dataset.tab));

  /* ---------- Eventos ---------- */
  ta.addEventListener("input", refresh);
  window.addEventListener("resize", draw);
  $("wheelBox").addEventListener("click", spin);
  $("shuffle").onclick = () => { const L = lines(); for (let i = L.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [L[i], L[j]] = [L[j], L[i]]; } ta.value = L.join("\n"); refresh(); };
  $("sort").onclick = () => { ta.value = lines().sort((x, y) => x.localeCompare(y, "es", { numeric: true })).join("\n"); refresh(); };
  $("add").onclick = () => { ta.value = (ta.value.trim() ? ta.value.trim() + "\n" : "") + "Opción " + (lines().length + 1); refresh(); };
  $("palette").onclick = () => { state.pal = (state.pal + 1) % PALETTES.length; draw(); };
  $("img").onclick = () => { const a = document.createElement("a"); a.download = "ruleta.png"; a.href = cv.toDataURL("image/png"); a.click(); };
  const save = () => { try { localStorage.setItem("ruleta", ta.value); modal("<h2>Guardado</h2><button id='mOk'>Cerrar</button>"); $("mOk").onclick = closeModal; } catch (e) { } };
  $("save").onclick = save;
  $("settings").onclick = () => {
    modal(`<h2>Ajustes</h2>
      <label>Duración del giro (s)<input type="number" id="sDur" min="1" max="20" value="${state.duration}"></label>
      <label>Quitar ganador automáticamente<input type="checkbox" id="sRm" ${state.removeWinner ? "checked" : ""}></label>
      <button id="sOk">Aceptar</button>`);
    $("sOk").onclick = () => { state.duration = Math.max(1, Math.min(20, +$("sDur").value || 5)); state.removeWinner = $("sRm").checked; closeModal(); };
  };
  $("burger").onclick = () => $("menu").classList.toggle("open");
  $("adX").onclick = () => { $("adBox").style.display = "none"; };
  $("m-new").onclick = e => { e.preventDefault(); ta.value = "Opción 1\nOpción 2\nOpción 3\nOpción 4\nOpción 5\nOpción 6\nOpción 7"; state.history = []; state.rot = 0; state.spins = 0; $("hint").style.display = ""; renderResults(); refresh(); };
  $("m-save").onclick = e => { e.preventDefault(); save(); };
  $("m-title").onclick = e => { e.preventDefault(); const t = prompt("Título de la rueda:"); if (t !== null) { $("title").textContent = t; $("title").hidden = !t; draw(); } };
  $("m-share").onclick = e => { e.preventDefault(); (navigator.share ? navigator.share({ title: document.title, url: location.href }) : navigator.clipboard.writeText(location.href)).catch(() => { }); };
  $("m-full").onclick = e => { e.preventDefault(); document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen(); };
  ["m-design", "m-lib", "m-mine"].forEach(id => $(id).onclick = e => e.preventDefault());

  /* ---------- Inicio ---------- */
  let saved = null; try { saved = localStorage.getItem("ruleta"); } catch (e) { }
  ta.value = saved || "Opción 1\nOpción 2\nOpción 3\nOpción 4\nOpción 5\nOpción 6\nOpción 7";
  renderResults(); refresh();
})();
