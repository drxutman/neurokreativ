// Общие помощники для страниц панели
window.NK = (function () {
  const P = window.PROGRAM;
  const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const $ = id => document.getElementById(id);
  const F = Object.fromEntries(P.fields.map(f => [f.k, f]));
  const fieldLabel = k => k === "vyzov" ? "стиль с карты-вызова, ждём ведущего" : ((F[k] || { l: k }).l).toLowerCase();
  // значение слота: своё (v), по умолчанию (d) или пусто (e)
  const slot = (k, card) => { const v = String(card[k] || "").trim(); if (v) return [v, "v"]; const f = F[k]; return f && f.def ? [f.def, "d"] : ["", "e"]; };
  const fillHTML = (t, card) => esc(t).replace(/\{(\w+)\}/g, (m, k) => { const [v, c] = slot(k, card); return c === "e" ? `<span class="e">[${esc(fieldLabel(k))}]</span>` : `<span class="${c}"${c === "d" ? ' title="Подставлено по умолчанию. Впишите своё в бренд-карту"' : ""}>${esc(v)}</span>`; }).replace(/([.!?]\s+(?:<span[^>]*>)?)([a-zа-яё])/g, (m, a, b) => a + b.toUpperCase());
  const fillTxt = (t, card) => t.replace(/\{(\w+)\}/g, (m, k) => { const [v, c] = slot(k, card); return c === "e" ? "[" + fieldLabel(k) + "]" : v; }).replace(/([.!?]\s+)([a-zа-яё])/g, (m, a, b) => a + b.toUpperCase());
  // варианты промпта шага: строка или список {l,p}
  const prompts = s => !s.p ? [] : Array.isArray(s.p) ? s.p : [{ l: "", p: s.p }];
  const tool = k => (P.tools && P.tools[k]) || null;
  const mod = n => P.modules.find(m => m.n === n);
  const fmt = s => { s = Math.max(0, Math.round(s)); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); };

  // Живые данные с сервера. offset выравнивает часы ноутбука и сервера.
  let offset = 0, state = null;
  function live(onState, onStatus) {
    let es, retry;
    const open = () => {
      es = new EventSource("/api/events");
      es.onopen = () => onStatus && onStatus(true);
      es.onmessage = e => { state = JSON.parse(e.data); offset = state.now - Date.now(); onState(state); };
      es.onerror = () => { onStatus && onStatus(false); es.close(); clearTimeout(retry); retry = setTimeout(open, 2000); };
    };
    open();
  }
  const left = h => h.running ? (h.endsAt - (Date.now() + offset)) / 1000 : h.left;
  async function post(url, data, headers = {}) {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(data) });
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok || j.ok === false) throw new Error(j.error || "Сервер не ответил");
    return j;
  }
  function toast(t) {
    let el = document.querySelector(".toast");
    if (!el) { el = document.createElement("div"); el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.textContent = t; el.hidden = false; clearTimeout(el._t); el._t = setTimeout(() => (el.hidden = true), 2600);
  }
  // превью работы
  function media(w, opts = {}) {
    if (w.kind === "text") return `<div class="txtwork">${esc(w.text).slice(0, 240)}</div>`;
    if (w.kind === "pdf") return `<div class="txtwork">PDF</div>`;
    const src = "/uploads/" + encodeURIComponent(w.file);
    if (w.kind === "video") return `<video src="${src}" muted loop playsinline ${opts.autoplay === false ? "" : "autoplay"} preload="metadata"></video>`;
    return `<img src="${src}" alt="" loading="lazy">`;
  }
  return { P, F, esc, $, fillHTML, fillTxt, prompts, tool, mod, fmt, live, left, post, toast, media, get state() { return state; } };
})();
