/* Traducción al inglés de la interfaz del demo: diccionario exacto, reglas para textos con números
   y composiciones, y respaldo que traduce por partes los textos unidos con " · ". */
(() => {
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const one = k => {
    const D = window.I18N_EN || {};
    if (has(D, k)) return D[k];
    if (!window.__rx) window.__rx = (window.I18N_RX || []).map(([a, b]) => [new RegExp(a), b]);
    for (const [r, b] of window.__rx) if (r.test(k)) return k.replace(r, b);
    for (const [r, f] of (window.I18N_FN || [])) { const m = k.match(r); if (m) { const v = f(m); if (v != null) return v; } }
    return null;
  };
  const core = k => {
    const v = one(k); if (v != null) return v;
    if (k.includes(" · ")) {
      const parts = k.split(" · "); let hit = false;
      const out = parts.map(p => { const x = p.trim() ? one(p.trim()) : null; if (x != null) { hit = true; return x; } return p; });
      if (hit) return out.join(" · ");
    }
    return null;
  };
  const tr = s => {
    const k = s.trim(); if (!k || !/[A-Za-zÁÉÍÓÚáéíóúñÑ]/.test(k)) return null;
    const v = core(k); return v == null ? null : s.replace(k, v);
  };
  const ATTRS = ["placeholder", "aria-label", "title", "alt"];
  function apply(root) {
    if (window.__lang !== "en" || !root) return;
    const skip = n => n.parentElement && n.parentElement.closest("[data-notr],script,style,code");
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = []; let n; while ((n = w.nextNode())) nodes.push(n);
    nodes.forEach(t => { if (skip(t)) return; const v = tr(t.nodeValue); if (v !== null && v !== t.nodeValue) t.nodeValue = v; });
    (root.querySelectorAll ? [root, ...root.querySelectorAll("*")] : []).forEach(el => {
      if (!el.getAttribute || el.closest("[data-notr]")) return;
      ATTRS.forEach(a => { const v = el.getAttribute(a); if (v) { const x = tr(v); if (x !== null && x !== v) el.setAttribute(a, x); } });
      if (el.tagName === "INPUT" && (el.type === "submit" || el.type === "button") && el.value) { const x = tr(el.value); if (x) el.value = x; }
    });
    if (root === document.body) { const h = document.title.split(" · ")[0]; const x = tr(h); if (x) document.title = document.title.replace(h, x.trim()); }
  }
  /* Traduce un fragmento HTML (constancias, fichas) antes de abrirlo en otra ventana. */
  function html(str) {
    if (window.__lang !== "en") return str;
    const d = document.createElement("div"); d.innerHTML = str; apply(d); return d.innerHTML;
  }
  let busy = false;
  const mo = new MutationObserver(ms => {
    if (window.__lang !== "en" || busy) return; busy = true;
    try { ms.forEach(m => { if (m.type === "characterData") { const t = m.target; if (t.parentElement && !t.parentElement.closest("[data-notr]")) { const v = tr(t.nodeValue); if (v !== null && v !== t.nodeValue) t.nodeValue = v; } } else m.addedNodes.forEach(a => { if (a.nodeType === 1) apply(a); else if (a.nodeType === 3 && a.parentElement) apply(a.parentElement); }); }); }
    finally { busy = false; }
  });
  const start = () => mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
  window.I18N = { apply, tr, html };
})();
