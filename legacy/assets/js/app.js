(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const I = (n, cls = "") => `<svg class="ico ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ""}</svg>`;
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = n => "$" + n.toLocaleString("es-MX") + " MXN";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const HEROP = PRODUCTS.find(p => p.slug === "spirocard-duo-10");
  const AVG = (() => { const r = COURSES.filter(c => c.reviews); return (r.reduce((a, c) => a + c.rating * c.reviews, 0) / r.reduce((a, c) => a + c.reviews, 0)).toFixed(1); })();
  const prodBy = slug => PRODUCTS.find(p => p.slug === slug);
  const courseBy = slug => COURSES.find(c => c.slug === slug);
  /* Cada curso se divide en módulos (temas) que solo agrupan lecciones. No hay examen por módulo: el curso cierra con un examen final. */
  const mods = c => { const n = c.lessons || 12, L = n - 1, k = L >= 12 ? 4 : L >= 4 ? 2 : 1, size = Math.ceil(L / k) || 1;
    return Array.from({ length: k }, (_, i) => ({ k: i + 1, from: i * size, to: Math.min(L, (i + 1) * size) - 1 })).filter(m => m.from <= m.to); };
  const LINKS = {
    fb: "https://www.facebook.com/kiron.laboratoriosoficial", ig: "https://www.instagram.com/laboratorioskironmexico/",
    yt: "https://www.youtube.com/channel/UCfU6J7bw_hjd8xcke5NGZlQ", li: "https://www.linkedin.com/company/68292601/",
    wa: "https://wa.me/525543705139?text=" + encodeURIComponent("Hola, me pongo en contacto desde la página de Kirón"),
    tel: "tel:+525551127743",
  };
  const ext = (href, label, cls = "") => `<a class="${cls}" href="${href}" target="_blank" rel="noopener">${label}</a>`;

  /* ---------- Estado (se conserva al recargar dentro de la misma pestaña) ---------- */
  const DEFAULT = {
    cat: "Todos", q: "", sort: "rel",
    logged: null, lang: "es", demoHidden: false, webinar: false, attended: false, points: 1240, redeemed: [], invoices: [],
    enrolled: { oftalmologia: 12, inmunologia: 33, dermatoendocrino: 4 }, courseFilter: "Todos",
    attempts: { inmunologia: 1 }, extra: {}, grades: { inmunologia: 9.3 },
    recoveries: [["Dr. Andrés Salinas", "dermatoendocrino", "pendiente"]],
    groups: [["Hospital Veterinario Norte · residentes", 14, "diplomado-inmunologia", "15/12/2026", 62], ["Generación Diplomado de Inmunología 2027-1", 38, "diplomado-inmunologia", "30/06/2027", 18], ["Equipo clínico Bajío", 9, "oftalmologia", "31/01/2027", 41]],
    bank: [["¿Qué prueba mide la producción de lágrima?", "Opción múltiple", "Oftalmología", 3], ["La prueba de Schirmer se realiza antes de aplicar cualquier colirio.", "Verdadero o falso", "Oftalmología", 2], ["Relaciona cada signo clínico con la estructura ocular afectada.", "Relacionar columnas", "Oftalmología", 1], ["Selecciona los componentes de la inmunidad innata.", "Respuesta múltiple", "Inmunología", 2], ["Describe el abordaje inicial de un paciente con otitis externa.", "Respuesta abierta", "Otitis", 1], ["¿Qué hallazgo orienta a hipotiroidismo en un perro con alopecia?", "Opción múltiple", "Dermatoendocrinología", 1]],
    autos: [[true, true, true], [true, true, true], [true, true, true], [true, true, true], [true, true, false], [true, true, true]], distSent: {},
    newWebinars: [], newCourses: [],
    gs: {}, qcfg: { oftalmologia: { intentos: 2 }, inmunologia: { intentos: 2 } }, qa: {}, cst: {}, enr: null, certs: null, lp: {}, curL: {},
    verif: [["Dr. Andrés Salinas", "1234•••", false], ["MVZ Paola Ruiz", "9876•••", false], ["MVZ Diego Herrera", "4567•••", false]],
    pages: [["Inicio", "/", "Publicada", "Hoy 09:12"], ["Productos", "/productos/", "Publicada", "28/10/2026"], ["Campaña SPIROCARD DUO", "/spirocard-duo/", "Borrador", "29/10/2026"], ["Nosotros", "/nosotros/", "Publicada", "12/10/2026"]],
    rules: [["Verificar tu cédula", 200, "Una sola vez"], ["Asistir a un webinar en vivo", 50, "Al entrar desde el sitio"], ["Terminar un curso", 300, "Al aprobar el examen final"], ["Completar una lección", 20, "Por lección"]],
    rewards: [["Bloque 1 · Oftalmología y otitis", 3000, "graduation-cap", "oftalmologia"], ["Bloque 2 · Dermatoendocrinología", 3000, "graduation-cap", "dermatoendocrino"], ["Promoción 3×2 en un producto participante", 3000, "gift", "promo-3x2"], ["Lugar preferente en webinar en vivo", 500, "video", "webinar-vip"]],
  };
  let S;
  try { S = Object.assign(structuredClone(DEFAULT), JSON.parse(sessionStorage.getItem("kirondemo25") || "{}")); } catch (e) { S = structuredClone(DEFAULT); }
  const save = () => { try { sessionStorage.setItem("kirondemo25", JSON.stringify(S)); } catch (e) {} };
  (S.newWebinars || []).forEach(w => { if (!w.slug) w.slug = String(w.titulo || "webinar").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "webinar"; if (!w.modo) w.modo = "cloudflare"; });

  /* ---------- LMS v2.4 ----------
     Estructura tomada del uso real de Tutor LMS (documento de referencia del 24/11/2026):
     curso → módulos (temas) → lecciones; los módulos solo agrupan lecciones y el curso tiene un solo examen, al final.
     REGLA DE NEGOCIO: el precio de un curso es solo informativo (precio regular y de oferta). Nunca se cruza con la
     inscripción ni dispara un cobro. El acceso lo da únicamente una inscripción en estado "approved". No es un bug. */
  const ME = "Dra. Laura Méndez";
  const hoyMx = () => { const d = new Date(); return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`; };
  const mx2iso = s => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s || ""); return m ? `${m[3]}-${m[2]}-${m[1]}` : ""; };
  const diasDesde = mx => { const i = mx2iso(mx); return i ? Math.floor((Date.now() - new Date(i + "T12:00:00").getTime()) / 864e5) : 1e9; };
  const enRango = (mx, r) => !r || (r === "7" ? diasDesde(mx) <= 7 : r === "30" ? diasDesde(mx) <= 30 : r === "anio" ? mx.slice(-4) === String(new Date().getFullYear()) : true);
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

  /* Ajustes globales: aplican a todos los cursos por igual (no hay ajustes por curso). */
  const GS_DEF = { enfoque: false, resumen: true, adminSinInsc: true, login: false, expira: false, pct: 100, ocultar: true };
  const gs = () => Object.assign({}, GS_DEF, S.gs || {});

  /* Un solo examen por curso, al final. Cada examen define sus propias reglas (intentos, calificación aprobatoria, tiempo…). */
  const QDEF = () => ({ aprobatoria: 80, intentos: 1, tiempo: 30, maxPreg: 0, desbloqueo: "", layout: "todas", orden: "aleatorio", lcAbierta: 2000, retro: "defecto", calculo: "mas_alta" });
  const QKEYS = Object.keys(QDEF());
  const qcfg = key => Object.assign(QDEF(), (S.qcfg || {})[key] || {});
  const CALC = { mas_alta: "Calificación más alta", promedio: "Promedio de los intentos", primer_intento: "Primer intento", ultimo_intento: "Último intento" };
  const LAYOUT = { una: "Una pregunta por pantalla", todas: "Todas las preguntas juntas" };
  const ORDEN = { aleatorio: "Aleatorio", fijo: "Fijo" };
  const RETRO = { defecto: "Por defecto", revelar: "Revelar respuestas", reintentar: "Reintentar" };
  const attTxt = (u, m) => m === Infinity ? `${u} · sin límite` : `${u} de ${m}`;
  const notaFinal = key => {
    const a = ((S.qa || {})[key] || []).map(x => x.nota);
    if (!a.length) return S.grades[key];
    const c = qcfg(key).calculo, v = c === "promedio" ? a.reduce((x, y) => x + y, 0) / a.length : c === "primer_intento" ? a[0] : c === "ultimo_intento" ? a[a.length - 1] : Math.max(...a);
    return Math.round(v * 10) / 10;
  };
  const passed = key => !!S.grades[key];
  /* Avance por lección. El alumno ve las lecciones en el orden que quiera (sin desbloqueo en secuencia); solo la fecha de
     desbloqueo bloquea una lección. El examen final se abre al terminar todas. La constancia exige las dos cosas:
     todas las lecciones al 100 % y el examen final aprobado. */
  const lpOf = slug => { S.lp = S.lp || {}; if (!S.lp[slug]) { const n = (courseBy(slug) || {}).lessons || 12; S.lp[slug] = Array.from({ length: Math.min(S.enrolled[slug] || 0, n - 1) }, (_, i) => i); } return S.lp[slug]; };
  const lessonsDone = slug => lpOf(slug).length >= ((courseBy(slug) || {}).lessons || 12) - 1;
  const syncProg = slug => { S.enrolled[slug] = lpOf(slug).length + (S.grades[slug] && lessonsDone(slug) ? 1 : 0); };
  const nextLesson = (slug, d) => { const L = ((courseBy(slug) || {}).lessons || 12) - 1; for (let i = 0; i < L; i++) if (!d.includes(i) && !dripOf(slug, i)) return i; return d.length >= L ? -1 : (Array.from({ length: L }, (_, i) => i).find(i => !d.includes(i)) ?? -1); };
  const curOf = (slug, d) => { const L = ((courseBy(slug) || {}).lessons || 12) - 1, c = (S.curL || {})[slug]; if (c === -1 && d.length >= L) return -1; if (typeof c === "number" && c >= 0 && c < L) return c; return L ? nextLesson(slug, d) : -1; };

  /* Estado del curso: publicado, borrador, programado, privado o papelera. */
  const CSTATES = { publicado: "Publicado", borrador: "Borrador", programado: "Programado", privado: "Privado", papelera: "Papelera" };
  const CST_CLS = { publicado: "st-ok", borrador: "st-draft", programado: "st-rev", privado: "st-draft", papelera: "st-draft" };
  const cFecha = c => { const m = /uploads\/(\d{4})\/(\d{2})\//.exec(c.img || ""); return m ? `01/${m[2]}/${m[1]}` : "—"; };
  const cstate = slug => ((S.cst || {})[slug] || {}).estado || "publicado";
  const cPublic = slug => { const s = (S.cst || {})[slug] || {}, e = s.estado || "publicado"; return e === "publicado" || (e === "programado" && !!s.fecha && s.fecha <= hoyIso()); };

  /* Alumnos e inscripciones (datos ficticios). La inscripción es el único control de acceso. */
  const STUDENTS = [[ME, "laura.mendez@clinica.mx", "14/03/2025"], ["MVZ Paola Ruiz", "paola.ruiz@correo-ejemplo.mx", "02/02/2025"], ["Dr. Andrés Salinas", "andres.salinas@correo-ejemplo.mx", "19/06/2025"],
    ["MVZ Diego Herrera", "diego.herrera@correo-ejemplo.mx", "07/01/2026"], ["MVZ Sofía Cárdenas", "sofia.cardenas@correo-ejemplo.mx", "28/04/2026"], ["MVZ Jorge Palacios", "jorge.palacios@correo-ejemplo.mx", "11/07/2026"],
    ["MVZ Ana Lucía Torres", "analucia.torres@correo-ejemplo.mx", "30/08/2025"], ["MVZ Ricardo Ibarra", "ricardo.ibarra@correo-ejemplo.mx", "15/09/2026"], ["MVZ Fernanda Ortiz", "fernanda.ortiz@correo-ejemplo.mx", "03/10/2026"],
    ["MVZ Karla Medina", "karla.medina@correo-ejemplo.mx", "20/11/2026"], ["MVZ Óscar Lozano", "oscar.lozano@correo-ejemplo.mx", "21/11/2026"], ["MVZ Daniela Ríos", "daniela.rios@correo-ejemplo.mx", "16/11/2026"], ["MVZ Tomás Villa", "tomas.villa@correo-ejemplo.mx", "22/08/2026"]];
  const stuMail = n => (STUDENTS.find(s => s[0] === n) || ["", ""])[1];
  const EST = { approved: ["Aprobada", "st-ok"], pending: ["Pendiente", "st-rev"], cancelled: ["Cancelada", "st-draft"] };
  const ENR0 = () => {
    let id = 1; const r = (u, s, st, f, por = "Equipo Kirón") => ({ id: id++, u, s, st, f, por });
    const fx = ["04/06/2026", "18/08/2026", "12/05/2026", "09/09/2026", "14/07/2026", "02/03/2026", "21/09/2026", "06/10/2026"];
    return [r(ME, "inmunologia", "approved", "12/05/2026"), r(ME, "oftalmologia", "approved", "03/08/2026"), r(ME, "dermatoendocrino", "approved", "02/10/2026"),
      ...GB.map((g, i) => r(g[0], g[1], "approved", fx[i % fx.length], i % 3 ? "Equipo Kirón" : "Importación de grupo")),
      r("MVZ Karla Medina", "diplomado-integral", "pending", "22/11/2026", "Solicitud del médico"), r("MVZ Óscar Lozano", "dermatoendocrino", "pending", "23/11/2026", "Solicitud del médico"),
      r("MVZ Daniela Ríos", "odontologia", "approved", "18/11/2026", "Inscripción en línea"), r("MVZ Tomás Villa", "kiroftal-2", "cancelled", "05/09/2026")];
  };
  const enrList = () => S.enr || (S.enr = ENR0());
  const myEnr = slug => enrList().find(x => x.u === ME && x.s === slug);
  const acc = slug => S.enrolled[slug] !== undefined && (myEnr(slug) || {}).st === "approved";
  const enrUpsert = (u, s, st, por) => {
    const L = enrList(); let e = L.find(x => x.u === u && x.s === s);
    if (!e) { e = { id: L.reduce((m, x) => Math.max(m, x.id), 0) + 1, u, s, st, f: hoyMx(), por }; L.unshift(e); } else { e.st = st; e.por = por; if (st !== "cancelled") e.f = hoyMx(); }
    if (u === ME && st === "approved" && S.enrolled[s] === undefined) S.enrolled[s] = 0;
    return e;
  };

  /* Plantillas de constancia: imagen base del equipo de diseño + variables posicionadas. */
  const CVARS = { nombre: "Nombre del alumno", curso: "Curso", fecha: "Fecha", folio: "Folio", qr: "Código QR" };
  const CV0 = () => ({ nombre: { x: 50, y: 41.5, size: 40, on: true }, curso: { x: 50, y: 58, size: 19, on: true }, fecha: { x: 22, y: 84, size: 13, on: true }, folio: { x: 50, y: 84, size: 13, on: true }, qr: { x: 85, y: 81, size: 84, on: true } });
  const CERT0 = () => [
    { id: "c1", nombre: "Constancia de diplomado", estado: "published", cursos: COURSES.filter(c => c.price).map(c => c.slug), vars: CV0() },
    { id: "c2", nombre: "Constancia de curso", estado: "published", cursos: COURSES.filter(c => !c.price).map(c => c.slug), vars: CV0() },
    { id: "c3", nombre: "Constancia de webinar", estado: "draft", cursos: [], vars: CV0() }];
  const certList = () => S.certs || (S.certs = CERT0());
  const certOf = slug => certList().find(t => t.estado === "published" && t.cursos.includes(slug));
  const certBg = id => { try { return sessionStorage.getItem("kiron-cert-bg-" + id) || ""; } catch (e) { return ""; } };
  const certBase = () => `<div class="cert-base"><img src="assets/img/kiron-logo.png" alt="Kirón"><b>CONSTANCIA</b><span>Se otorga a</span><i></i><em>por aprobar</em></div>`;
  const certSheet = (t, d, edit) => {
    const bg = certBg(t.id);
    return `<div class="cert-sheet ${edit ? "edit" : ""}" ${edit ? 'id="certCanvas"' : ""}>${bg ? `<img class="cert-bg" src="${bg}" alt="">` : certBase()}
      ${Object.entries(t.vars).filter(([, v]) => v.on).map(([k, v]) => `<div class="cert-var ${k === "qr" ? "qr" : ""} ${edit && S.certVar === k ? "on" : ""}" data-k="${k}" ${edit ? `tabindex="0" role="button" aria-label="Mover ${CVARS[k]}"` : ""} style="left:${v.x}%;top:${v.y}%;${k === "qr" ? `width:${v.size / 8.8}cqw` : `font-size:${v.size / 8.8}cqw`}">${k === "qr" ? qrSvg(d.folio, 120) : `<span data-notr>${esc(d[k])}</span>`}</div>`).join("")}</div>`;
  };
  let focusNow = false;
  /* Duración de ejemplo del video de cada lección (video_playback_time) y desbloqueo por fecha (Content Drip mínimo). */
  const LDUR = (slug, i) => { let h = 7; for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0; h = (h + (i + 1) * 2654435761) >>> 0; const s = 420 + h % 1380; return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  const DRIP = { dermatoendocrino: { from: 6, fecha: "2027-01-08" } };
  const dripOf = (slug, i) => { const d = DRIP[slug], n = (courseBy(slug) || {}).lessons || 12; return d && i >= d.from && i < n - 1 && hoyIso() < d.fecha ? d.fecha : ""; };
  /* Examen de ejemplo del alumno: 5 preguntas de 2 puntos. */
  const XQ = [
    { t: "om", q: "En el demo, ¿qué se necesita para emitir la constancia?", o: ["Terminar todas las lecciones y aprobar los exámenes", "Ver un solo video", "Pagar otra vez"], c: [0] },
    { t: "vf", q: "Una constancia se verifica con su folio o su código QR.", o: ["Verdadero", "Falso"], c: [0] },
    { t: "om", q: "¿Qué pasa con tu avance si cambias de dispositivo?", o: ["Se conserva", "Se pierde", "Se reinicia la lección"], c: [0] },
    { t: "rm", q: "Selecciona lo que cuenta para terminar un curso.", o: ["Ver todas las lecciones al 100 %", "Aprobar todos los exámenes", "Dejar una reseña"], c: [0, 1] },
    { t: "vf", q: "Puedes marcar una lección como vista sin reproducir el video.", o: ["Verdadero", "Falso"], c: [1] }];
  const XQT = { om: "Opción múltiple", vf: "Verdadero o falso", rm: "Respuesta múltiple" };

  /* ---------- Idioma: textos clave aquí; el resto se traduce con el diccionario de i18n.js ---------- */
  const T = {
    es: { products: "Productos", academy: "Academia", reps: "Representantes", dist: "Distribuidores", distMx: "Distribuidores México", distW: "Distribuidores Mundo", vt: "Videoteca", vtP: "Productos", vtC: "Diplomados y Cursos", vtW: "Webinars", vtT: "Tutoriales", vtR: "Recetas cuantificadas", acC: "Cursos", acD: "Diplomados", acW: "Webinars", admin: "Administrador", panel: "Mi panel", signin: "Iniciar sesión", signup: "Registrarse",
      eyebrow: "Laboratorios Kirón México", h1: "Cuidando la salud de <em>tu mejor amigo</em>", lead: "Productos veterinarios innovadores y educación continua para el médico veterinario, en un solo lugar.", ph: "Busca por producto o clasificación", search: "Buscar",
      demo: "<b>Prototipo navegable · Azul Clarito.</b><span class=\"hide-s\"> Productos, cursos, webinar y representantes vienen de kironmexico.com; médicos, alumnos y puntos son de ejemplo.</span>" },
    en: { products: "Products", academy: "Academy", reps: "Sales reps", dist: "Distributors", distMx: "Distributors in Mexico", distW: "Distributors worldwide", vt: "Video library", vtP: "Products", vtC: "Diplomas and courses", vtW: "Webinars", vtT: "Tutorials", vtR: "Quantified recipes", acC: "Courses", acD: "Diplomas", acW: "Webinars", admin: "Admin", panel: "My dashboard", signin: "Sign in", signup: "Sign up",
      eyebrow: "Laboratorios Kirón México", h1: "Caring for the health of <em>your best friend</em>", lead: "Innovative veterinary products and continuing education for veterinarians, all in one place.", ph: "Search by product or category", search: "Search",
      demo: "<b>Clickable prototype · Azul Clarito.</b><span class=\"hide-s\"> Products, courses, webinar and sales reps come from kironmexico.com; vets, students and points are sample data.</span>" },
  };
  const t = k => T[S.lang][k];

  /* ---------- Piezas ---------- */
  const fallback = n => `<div class="img-fallback">${I("pill")}<span>${esc(n)}</span></div>`;
  window.__imgFail = img => { img.outerHTML = fallback(img.alt); };
  const pimg = p => `<img src="${p.img}" alt="${esc(p.name)}" loading="lazy" width="300" height="300" onerror="__imgFail(this)">`;
  const pcard = p => `
    <a class="pcard rv" href="#/producto/${p.slug}">
      <div class="badges">${p.isNew ? '<span class="badge badge-new">Nuevo</span>' : ""}</div>
      <div class="pimg">${pimg(p)}</div>
      <div class="pbody"><span class="pcat">${p.cat}</span><span class="pname">${p.name}</span>
        <div class="pfoot"><span class="link-arrow">Ver producto ${I("arrow-right")}</span></div></div>
    </a>`;
  const qrSvg = (seed, size = 120) => {
    let h = 0; for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const n = 25, cell = size / n; let r = "";
    const finder = (x, y) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let on;
      if (finder(x, y)) { const fx = x >= n - 7 ? x - (n - 7) : x, fy = y >= n - 7 ? y - (n - 7) : y; on = fx === 0 || fx === 6 || fy === 0 || fy === 6 || (fx >= 2 && fx <= 4 && fy >= 2 && fy <= 4); }
      else { h = (h * 1103515245 + 12345) >>> 0; on = (h >>> 16) % 2 === 0; }
      if (on) r += `<rect x="${x * cell}" y="${y * cell}" width="${cell + .2}" height="${cell + .2}"/>`;
    }
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" fill="#1d1d1b" role="img" aria-label="Código QR de ejemplo">${r}</svg>`;
  };

  /* ---------- Encabezado y pie ---------- */
  function header(route) {
    const on = r => route.startsWith(r) ? "on" : "";
    const who = S.logged === "admin" ? ["KI", "#/admin"] : S.logged ? ["LM", "#/panel"] : null;
    return `
    ${S.demoHidden ? "" : `<div class="demo-bar"><div class="wrap"><span class="tag">DEMO</span><span>${t("demo")}</span>${S.logged === "admin" ? "" : `<button class="demo-adm" onclick="APP.login('admin','#/admin')">${I("shield-check")} Ver administrador</button>`}<button aria-label="Cerrar aviso" onclick="APP.hideDemo(this)">${I("x")}</button></div></div>`}
    <header class="hdr" id="hdr"><div class="wrap">
      <a class="brand" href="#/" aria-label="Kirón, inicio"><img src="assets/img/kiron-logo.png" alt="Kirón · Cuidando la salud de tu mejor amigo" width="86" height="50"></a>
      <nav class="nav" aria-label="Principal">
        <a href="#/productos" class="${on("/producto")}">${t("products")}</a>
        <div class="nav-dd"><a href="#/academia" class="${on("/academia")}" aria-haspopup="true">${t("academy")} ${I("chevron-down")}</a><div class="dd" role="menu">${AC_TABS.map(x => `<a role="menuitem" href="#/academia?tab=${x[0]}">${t(x[1])}</a>`).join("")}</div></div>
        <a href="#/representantes" class="${on("/representantes")}">${t("reps")}</a>
        <div class="nav-dd"><a href="#/distribuidores/mexico" class="${on("/distribuidores")}" aria-haspopup="true">${t("dist")} ${I("chevron-down")}</a><div class="dd" role="menu"><a role="menuitem" href="#/distribuidores/mexico">${t("distMx")}</a><a role="menuitem" href="#/distribuidores/mundo">${t("distW")}</a></div></div>
        <div class="nav-dd"><a href="#/videoteca" class="${on("/videoteca") || on("/recetas")}" aria-haspopup="true">${t("vt")} ${I("chevron-down")}</a><div class="dd" role="menu">${VT_TABS.map(x => `<a role="menuitem" href="${x[2]}">${t(x[1])}</a>`).join("")}</div></div>
      </nav>
      <div class="hdr-actions">
        <button class="lang" onclick="APP.lang()" aria-label="Cambiar idioma"><b class="${S.lang === "es" ? "cur" : ""}">ES</b> · <b class="${S.lang === "en" ? "cur" : ""}">EN</b></button>
        <a class="icon-btn" href="#/productos?focus=1" aria-label="Buscar">${I("search")}</a>
        ${who && S.logged !== "admin" ? `<a class="btn btn-primary btn-sm" href="#/panel">${I("graduation-cap")} ${t("panel")}</a>` : S.logged === "admin" ? `<a class="btn btn-primary btn-sm" href="#/admin">${I("shield-check")} ${t("admin")}</a>` : ""}
        ${who ? `<div class="umenu"><button class="avatar-chip" aria-haspopup="true" aria-expanded="false" aria-label="Mi cuenta" onclick="APP.umenu(this)"><span class="avatar">${who[0]}</span>${I("chevron-down")}</button>
          <div class="umenu-pop" role="menu"><div class="umenu-h"><b>${S.logged === "admin" ? "Equipo Kirón" : "Dra. Laura Méndez"}</b><small>${S.logged === "admin" ? "admin@kiron-demo.mx" : "laura.mendez@clinica.mx · ejemplo"}</small></div>
            ${S.logged === "admin" ? `<a role="menuitem" href="#/admin">${I("shield-check")} Administrador</a>` : `<a role="menuitem" href="#/panel">${I("layout-dashboard")} Mi panel</a><a role="menuitem" href="#/panel/cursos">${I("graduation-cap")} Mis cursos</a><a role="menuitem" href="#/panel/constancias">${I("award")} Mis constancias</a><a role="menuitem" href="#/panel/club">${I("gift")} Club MVZ · ${S.points.toLocaleString("es-MX")} pts</a>`}
            <button role="menuitem" onclick="APP.logout()">${I("log-out")} Cerrar sesión</button></div></div>`
        : `<button class="btn btn-ghost btn-sm hdr-auth" onclick="APP.login('mvz',null,true)">${I("user")} ${t("signin")}</button><button class="btn btn-accent btn-sm hdr-auth" onclick="APP.login('mvz',null,true,1)">${t("signup")}</button><button class="icon-btn hdr-auth-m" aria-label="${t("signin")}" onclick="APP.login('mvz',null,true)">${I("user")}</button>`}
        <button class="icon-btn burger" aria-label="Menú" onclick="document.getElementById('mnav').classList.add('open')">${I("menu")}</button>
      </div></div></header>
    <div class="mnav" id="mnav"><button class="icon-btn" style="align-self:flex-end" aria-label="Cerrar" onclick="this.parentNode.classList.remove('open')">${I("x")}</button>
      <a href="#/">Inicio</a><a href="#/productos">${t("products")}</a><a href="#/academia">${t("academy")}</a>${AC_TABS.map(x => `<a class="sub" href="#/academia?tab=${x[0]}">${t(x[1])}</a>`).join("")}<a href="#/panel" onclick="return APP.gate(event,'mvz','#/panel')">${t("panel")}</a><a href="#/representantes">${t("reps")}</a><a href="#/distribuidores/mexico">${t("distMx")}</a><a href="#/distribuidores/mundo">${t("distW")}</a><a href="#/videoteca">${t("vt")}</a>${VT_TABS.slice(1).map(x => `<a class="sub" href="${x[2]}">${t(x[1])}</a>`).join("")}<a href="#/admin" onclick="return APP.gate(event,'admin','#/admin')">${t("admin")}</a>
      ${S.logged ? `<button class="btn btn-ghost" style="margin-top:18px" onclick="APP.logout();document.getElementById('mnav').classList.remove('open')">${I("log-out")} Cerrar sesión</button>` : `<div style="display:flex;gap:10px;margin-top:18px"><button class="btn btn-ghost" style="flex:1" onclick="document.getElementById('mnav').classList.remove('open');APP.login('mvz',null,true)">${t("signin")}</button><button class="btn btn-accent" style="flex:1" onclick="document.getElementById('mnav').classList.remove('open');APP.login('mvz',null,true,1)">${t("signup")}</button></div>`}
      <button class="btn btn-ghost" style="margin-top:10px" onclick="APP.lang()">${I("globe")} ${S.lang === "es" ? "English" : "Español"}</button></div>`;
  }
  const footer = () => `
    <footer class="ftr"><div class="wrap"><div class="ftr-grid">
      <div><a class="pill" href="#/"><img src="assets/img/kiron-logo.png" alt="Kirón · Cuidando la salud de tu mejor amigo" width="124" height="72"></a>
        <p style="max-width:300px;font-size:14px">Nacimos con la filosofía de mejorar la calidad de vida de los animales y de sus propietarios, con productos innovadores y de calidad.</p>
        <div class="social">${ext(LINKS.fb, I("facebook"))}${ext(LINKS.ig, I("instagram"))}${ext(LINKS.yt, I("youtube"))}${ext(LINKS.li, I("linkedin"))}</div>
        <p style="font-size:12.5px;margin-top:10px;color:#c5c9bf">Laboratorios Kirón México</p></div>
      <div><h5>Productos</h5><a href="#/productos">Catálogo completo</a><a href="#/productos?cat=${encodeURIComponent("Oftálmicos")}">Oftálmicos</a><a href="#/productos?cat=Endoparasiticidas">Endoparasiticidas</a><a href="#/productos?cat=${encodeURIComponent("Biológicos")}">Biológicos</a><a href="#/videoteca">Videoteca</a></div>
      <div><h5>Médicos</h5><a href="#/panel" onclick="return APP.gate(event,'mvz','#/panel')">Mi panel</a><a href="#/academia?tab=cursos">Cursos</a><a href="#/academia?tab=diplomados">Diplomados</a><a href="#/academia?tab=webinars">Webinars</a><a href="#/panel/club" onclick="return APP.gate(event,'mvz','#/panel/club')">Club MVZ</a><a href="#/panel/constancias" onclick="return APP.gate(event,'mvz','#/panel/constancias')">Mis constancias</a><a href="#/verificar/KI-2026-001234">Verificar constancia</a></div>
      <div><h5>Quiero ser distribuidor</h5><a href="#/distribuidores/mexico">México</a><a href="#/distribuidores/mundo">Resto del mundo</a><h5 style="margin-top:22px">Atención</h5><a href="#/representantes">Representantes</a><a href="${LINKS.tel}">Línea Kirón · 55 5112 7743</a>${ext(LINKS.wa, "Mensaje de WhatsApp")}<a href="#/farmacovigilancia">Reporte de farmacovigilancia</a><a href="#/legal/privacidad">Aviso de privacidad</a><a href="#/legal/condiciones">Condiciones de uso</a></div>
    </div>
    <div class="ftr-bottom"><span>© 2026 Laboratorios Kirón México</span><span><a href="#/admin" onclick="return APP.gate(event,'admin','#/admin')" style="color:inherit;text-decoration:underline">Acceso del equipo Kirón</a> · Demo desarrollado por Azul Clarito Marketing &amp; Developers</span></div></div></footer>`;
  const pageHead = (eyebrow, title, lead) => `<section class="phead"><div class="wrap"><span class="eyebrow">${eyebrow}</span><h1 class="h-lg" style="margin-top:14px">${title}</h1>${lead ? `<p class="lead" style="margin-top:10px;max-width:680px">${lead}</p>` : ""}</div></section>`;

  /* ---------- Inicio ---------- */
  function home() {
    const feat = PRODUCTS.filter(p => p.featured);
    return `
    <section class="hero hero-car" id="hcar" aria-roledescription="carrusel" aria-label="Destacados de Kirón">
      <div class="wrap hc-wrap">
        <div class="hc-slide on" role="group" aria-label="1 de 3">
          <div class="hero-copy"><span class="eyebrow light">${t("eyebrow")}</span>
            <h1 class="h-xl" style="margin-top:22px">${t("h1")}</h1><p class="lead">${t("lead")}</p>
            <div class="hc-ctas"><a class="btn btn-accent" href="#/productos">Ver productos ${I("arrow-right")}</a><a class="btn btn-ghost" href="#/academia">Ir a la academia</a></div></div>
          <div class="hero-art" aria-hidden="true"><i class="hb hb1"></i><i class="hb hb2"></i><i class="hb hb3"></i><span class="hero-plate">${pimg({ ...HEROP, img: HEROP.img.replace("-300x300", "") })}</span><span class="hero-tag"><b>Nuevo</b> ${HEROP.name}</span></div>
        </div>
        <div class="hc-slide" role="group" aria-label="2 de 3">
          <div class="hero-copy"><span class="eyebrow light">Próximo webinar · gratuito</span>
            <h2 class="h-xl" style="margin-top:22px">${WEBINARS.next.title}</h2><p class="lead">${WEBINARS.next.sub}</p>
            <p class="hc-meta">${I("calendar")} ${WEBINARS.next.dow} 15/12/2026 · 20:00 Hrs (México) <span>${WEBINARS.next.deg} ${WEBINARS.next.speaker}</span></p>
            <div class="hc-ctas"><button class="btn btn-accent" onclick="APP.webinarReg()">${I("calendar")} Registrarme</button><a class="btn btn-ghost" href="#/academia?tab=webinars">Ver webinars</a></div></div>
          <div class="hero-art" aria-hidden="true"><i class="hb hb1"></i><i class="hb hb2"></i><i class="hb hb3"></i><span class="hero-plate hc-date"><div class="pp-date"><span class="wd">${WEBINARS.next.dow}</span><span class="d">${WEBINARS.next.day}</span><span class="ym"><span>${WEBINARS.next.year}</span><span>${WEBINARS.next.month}</span></span></div></span><span class="hero-tag"><b>En vivo</b> 20:00 Hrs</span></div>
        </div>
        <div class="hc-slide" role="group" aria-label="3 de 3">
          <div class="hero-copy"><span class="eyebrow light">Academia Kirón · Diplomados</span>
            <h2 class="h-xl" style="margin-top:22px">Diplomado Integral en Especialidades Clínicas Veterinarias</h2><p class="lead">Estudia a tu ritmo, presenta el examen de cada bloque y descarga tu constancia desde tu panel.</p>
            <div class="hc-ctas"><a class="btn btn-accent" href="#/academia?tab=diplomados">Ver diplomados ${I("arrow-right")}</a><a class="btn btn-ghost" href="#/academia?tab=cursos">Ver cursos</a></div></div>
          <div class="hero-art" aria-hidden="true"><i class="hb hb1"></i><i class="hb hb2"></i><i class="hb hb3"></i><span class="hero-plate hc-course">${COURSES[0].img ? `<img src="${COURSES[0].img}" alt="" loading="lazy" onerror="this.remove()">` : ""}${I("graduation-cap")}</span><span class="hero-tag"><b>Diplomado</b> ${COURSES[0].title.split(" · ")[0]}</span></div>
        </div>
        <div class="hc-nav"><button class="hc-arrow" aria-label="Anterior" onclick="APP.hero(-1)">${I("chevron-left")}</button>
          <div class="hc-dots">${[0, 1, 2].map(i => `<button class="${i ? "" : "on"}" aria-label="Ir al destacado ${i + 1}" onclick="APP.heroGo(${i})"></button>`).join("")}</div>
          <button class="hc-arrow" aria-label="Siguiente" onclick="APP.hero(1)">${I("chevron-right")}</button></div>
      </div>
      <div class="hero-find"><div class="wrap">
        <form class="hero-search" onsubmit="return APP.search(event,this)">
          ${I("search")}<input name="q" placeholder="${t("ph")}" aria-label="${t("ph")}">
          <button class="btn btn-accent" type="submit">${t("search")}</button></form>
        <div class="hero-chips">${["Oftálmicos", "Cardiológicos", "Endoparasiticidas", "Biológicos"].map(c => `<a href="#/productos?q=${encodeURIComponent(c)}">${c}</a>`).join("")}</div>
      </div></div>
      <div class="hero-stats"><div class="wrap">
        <a class="stat" href="#/productos"><b data-count="${PRODUCTS.length}">${PRODUCTS.length}</b><span>productos en catálogo ${I("arrow-right")}</span></a>
        <a class="stat" href="#/" onclick="return APP.scrollTo('intl')"><b data-count="${COUNTRIES.length}">${COUNTRIES.length}</b><span>países con presencia ${I("arrow-right")}</span></a>
        <a class="stat" href="#/representantes"><b data-count="${REPS.length}">${REPS.length}</b><span>zonas de representación ${I("arrow-right")}</span></a>
        <a class="stat" href="#/academia"><b>${AVG}</b><span>calificación de nuestros cursos ${I("arrow-right")}</span></a>
      </div></div>
    </section>

    <section class="sec"><div class="wrap showcase">
      <div>
        <span class="eyebrow rv">Nuevo · Academia Kirón</span>
        <h2 class="h-lg rv" style="margin-top:16px">Tu panel: cursos, webinars, constancias y puntos en una sola cuenta</h2>
        <p class="lead rv" style="margin-top:16px">Entra con tu cuenta y encuentra todo en un solo lugar: lo que estás estudiando, tus calificaciones, tus constancias y los puntos que puedes canjear.</p>
        <div class="feat-list">
          <a class="feat rv" href="#/academia?tab=webinars"><span class="fi">${I("video")}</span><div><h4>Webinars en vivo dentro del sitio ${I("arrow-right")}</h4><p>Se entra con un clic desde el panel, sin instalar nada. La asistencia queda registrada.</p></div></a>
          <a class="feat rv" href="#/academia?tab=cursos"><span class="fi">${I("graduation-cap")}</span><div><h4>Cursos y diplomados ${I("arrow-right")}</h4><p>Tu avance se guarda en cualquier dispositivo. Ves tus calificaciones y los intentos de cada examen.</p></div></a>
          <a class="feat rv" href="#/panel/constancias" onclick="return APP.gate(event,'mvz','#/panel/constancias')"><span class="fi">${I("award")}</span><div><h4>Todas tus constancias ${I("arrow-right")}</h4><p>De cursos, diplomados y webinars. Se quedan en tu cuenta y las descargas cuando quieras.</p></div></a>
          <a class="feat rv" href="#/panel/club" onclick="return APP.gate(event,'mvz','#/panel/club')"><span class="fi">${I("gift")}</span><div><h4>Club de puntos ${I("arrow-right")}</h4><p>Puntos por capacitarse, canjeables por cursos y promociones.</p></div></a>
        </div>
        <a class="btn btn-primary rv" href="#/panel" onclick="return APP.gate(event,'mvz','#/panel')">Ver mi panel ${I("arrow-right")}</a>
      </div>
      <div class="pmock rv" aria-hidden="true">
        <div class="pmock-bar"><i></i><i></i><i></i><span>kironmexico.com/mi-panel</span></div>
        <div class="pmock-body">
          <p class="pm-hi">Buenas tardes, Dra. Méndez</p>
          <div class="pm-live"><span class="pm-badge"><i></i> EN VIVO</span><b>${WEBINARS.next.title}</b><small>${WEBINARS.next.deg} ${WEBINARS.next.speaker}</small><span class="pm-btn">${I("play")} Entrar</span></div>
          <div class="pm-row"><div><small>Puntos</small><b>${S.points.toLocaleString("es-MX")}</b></div><div><small>Cursos en curso</small><b>2</b></div><div><small>Constancias</small><b>2</b></div></div>
        </div>
      </div>
    </div></section>

    <section class="sec sec-alt"><div class="wrap">
      <div class="sec-head"><div><span class="eyebrow">Catálogo</span><h2 class="h-lg">Productos destacados</h2><p class="lead">Cada producto con su clasificación y su ficha técnica para médicos registrados.</p></div>
        <a class="btn btn-ghost" href="#/productos">Ver más productos ${I("arrow-right")}</a></div>
      <div class="grid-p">${feat.map(pcard).join("")}</div>
      <div class="cat-strip" style="margin-top:36px">${CATS.map(c => `<a class="cat-pill rv" href="#/productos?cat=${encodeURIComponent(c)}">${c}</a>`).join("")}</div>
    </div></section>

    <section class="sec"><div class="wrap">
      <div class="sec-head"><div><span class="eyebrow">Academia</span><h2 class="h-lg">Participa en nuestros webinars</h2></div><a class="btn btn-ghost" href="#/academia?tab=webinars">Ver webinars ${I("arrow-right")}</a></div>
      ${nextWebinar()}
    </div></section>

    <section class="sec sec-alt"><div class="wrap">
      <div class="sec-head"><div><span class="eyebrow">Para el médico veterinario</span><h2 class="h-lg">Lo que encuentras aquí</h2></div></div>
      <div class="bento">
        <a class="tile navy c3 r2 rv" href="#/academia"><span class="ti">${I("graduation-cap")}</span><h3>Academia Kirón</h3><p>Cursos, diplomados y webinars con constancia verificable por QR.</p><div class="big-num" style="margin-top:40px">${AVG}</div><p>calificación promedio de los cursos con reseñas</p><span class="tile-go">Ver academia ${I("arrow-right")}</span></a>
        <a class="tile c3 rv" href="#/academia?tab=webinars"><span class="ti">${I("video")}</span><h3>Webinars en vivo</h3><p>Se transmiten dentro del sitio. Entras con tu cuenta, sin instalar nada.</p><span class="tile-go">Ver próximo webinar ${I("arrow-right")}</span></a>
        <a class="tile c3 rv" href="#/representantes"><span class="ti">${I("users")}</span><h3>Representantes</h3><p>El equipo de Kirón en tu zona.</p><span class="tile-go">Ver representantes ${I("arrow-right")}</span></a>
        <a class="tile abyss c2 rv" href="#/panel/club" onclick="return APP.gate(event,'mvz','#/panel/club')"><span class="ti">${I("gift")}</span><h3>Club MVZ</h3><p>Puntos por capacitarte, canjeables por cursos y promociones.</p><span class="tile-go">Ver mis puntos ${I("arrow-right")}</span></a>
        <a class="tile c2 rv" href="#/verificar/KI-2026-001234"><span class="ti">${I("qr-code")}</span><h3>Verificar constancia</h3><p>Cualquier constancia se valida con su folio o su QR.</p><span class="tile-go">Verificar ${I("arrow-right")}</span></a>
        <a class="tile c2 rv" href="#/farmacovigilancia"><span class="ti">${I("shield-check")}</span><h3>Farmacovigilancia</h3><p>Reporta un evento adverso directo al área responsable.</p><span class="tile-go">Hacer un reporte ${I("arrow-right")}</span></a>
      </div>
    </div></section>

    <section class="sec sec-dark" id="intl"><div class="wrap split">
      <div><span class="eyebrow light">Presencia internacional</span><h2 class="h-lg" style="margin-top:16px">Presencia en ${COUNTRIES.length} países</h2>
        <p class="lead" style="color:#c5c9bf;margin-top:16px">México, Centroamérica, Sudamérica, Medio Oriente y África occidental. Próximamente ${SOON.join(" y ")}.</p>
        <div class="countries">${COUNTRIES.map(c => `<span class="country rv">${c}</span>`).join("")}</div></div>
      <div class="cta-band rv" style="grid-template-columns:1fr;padding:48px"><div class="ring"></div>
        <h2 class="h-md" style="font-size:32px">¿Hablamos?</h2><p>Escríbenos o llámanos. Te atiende el equipo de Kirón.</p>
        <div class="acts" style="justify-content:flex-start;margin-top:22px;flex-wrap:wrap">${ext(LINKS.wa, I("whatsapp") + " Mensaje de WhatsApp", "btn btn-accent")}<a class="btn btn-outline-light" href="${LINKS.tel}">${I("phone")} 55 5112 7743</a></div></div>
    </div></section>`;
  }

  function nextWebinar() {
    const w = WEBINARS.next;
    const act = !S.logged ? `<button class="btn btn-accent" onclick="APP.webinarReg()">${I("calendar")} Registrarme</button>`
      : S.webinar ? `<button class="btn btn-accent" onclick="APP.live()">${I("play")} Entrar al webinar</button><button class="btn btn-outline-light" onclick="APP.ics()">${I("calendar")} Agregar a mi calendario</button>`
      : `<button class="btn btn-accent" onclick="APP.webinarReg()">${I("calendar")} Registrarme</button>`;
    return `<div class="next-webinar rv">
      <div class="nw-body"><span class="badge badge-new">Próximo webinar · gratuito</span>
        <h3>${w.title}</h3><p class="sub">${w.sub}</p>
        <div class="speaker-line">IMPARTIDO POR<b><span>${w.deg}</span> ${w.speaker}</b></div>
        <div style="display:flex;gap:12px;margin-top:30px;flex-wrap:wrap">${act}
          <a class="btn btn-outline-light" href="#/academia?tab=webinars&sec=grabaciones">Ver grabaciones</a></div>
        <p class="nw-note">${I("info")} Exclusivo para profesionales de la salud animal. Se transmite dentro del sitio: entras con tu cuenta, sin instalar Zoom.${S.webinar ? " En el demo puedes entrar antes de la hora para ver la sala." : ""}</p></div>
      <div class="nw-side">
        <div class="pp-date"><span class="wd">${w.dow}</span><span class="d">${w.day}</span><span class="ym"><span>${w.year}</span><span>${w.month}</span></span></div>
        <div class="countdown" data-countdown></div>
        <table class="tz"><tr><th>20:00 Hrs</th><td>México (hora del centro), Guatemala, Honduras, Nicaragua y Costa Rica</td></tr><tr><th>21:00 Hrs</th><td>Panamá</td></tr><tr><th>22:00 Hrs</th><td>Bolivia</td></tr></table>
      </div></div>`;
  }

  /* ---------- Catálogo ---------- */
  function productos(params) {
    if (params.has("cat")) { S.cat = params.get("cat"); S.q = ""; }
    if (params.has("q")) { S.q = params.get("q"); S.cat = "Todos"; }
    if (!params.has("cat") && !params.has("q") && !params.has("focus")) { S.cat = "Todos"; S.q = ""; }
    const counts = c => c === "Todos" ? PRODUCTS.length : PRODUCTS.filter(p => p.cat === c).length;
    return pageHead("Catálogo", "Nuestros productos", "Busca por nombre o clasificación.") + `
    <section class="sec" style="padding-top:40px"><div class="wrap catalog">
      <aside class="filters" aria-label="Filtros"><h4>Clasificación</h4>
        ${["Todos", ...CATS].map(c => `<label><input type="radio" name="cat" value="${c}" ${S.cat === c ? "checked" : ""}> ${c}<span class="count">${counts(c)}</span></label>`).join("")}
        <div class="notice" style="margin-top:16px">${I("info")}<span>Catálogo tomado de kironmexico.com el 18/11/2026. Los filtros por especie, forma y vía se activan con las fichas estructuradas.</span></div>
      </aside>
      <div>
        <form class="search-big" onsubmit="event.preventDefault();APP.filter()">${I("search")}<input id="q" value="${esc(S.q)}" placeholder="Ej. Kir-Anthel, Vibix, oftálmicos" aria-label="Buscar productos" autocomplete="off">
          ${S.q ? `<button type="button" class="clear-x" aria-label="Limpiar búsqueda" onclick="APP.clearQ()">${I("x")}</button>` : ""}<button class="btn btn-primary btn-sm" style="border-radius:50px" type="submit">Buscar</button></form>
        <div class="result-meta"><span id="rcount" aria-live="polite"></span>
          <label class="sortsel">Ordenar por <select id="sort" onchange="APP.sort(this.value)"><option value="rel" ${S.sort === "rel" ? "selected" : ""}>Relevancia</option><option value="az" ${S.sort === "az" ? "selected" : ""}>Nombre A-Z</option><option value="new" ${S.sort === "new" ? "selected" : ""}>Novedades primero</option></select></label></div>
        <div class="grid-p three" id="pgrid"></div>
      </div></div></section>`;
  }
  function renderGrid() {
    const g = $("#pgrid"); if (!g) return;
    const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const q = norm(S.q || "");
    let list = PRODUCTS.filter(p => (S.cat === "Todos" || p.cat === S.cat) &&
      (!q || norm([p.name, p.cat, p.active || "", (p.indications || []).join(" ")].join(" ")).includes(q)));
    if (S.sort === "az") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "es"));
    if (S.sort === "new") list = [...list].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));
    $("#rcount").textContent = `${list.length} producto${list.length === 1 ? "" : "s"}${S.q ? ` para “${S.q}”` : ""}${S.cat !== "Todos" ? ` en ${S.cat}` : ""}`;
    g.innerHTML = list.length ? list.map(pcard).join("") : `<div class="empty" style="grid-column:1/-1">${I("search")}<p style="margin-top:8px">No encontramos productos con ese criterio. Prueba con otro nombre o <a href="#/productos" onclick="APP.clearQ();return false">limpia los filtros</a>.</p></div>`;
    reveal(g);
    save();
  }

  /* ---------- Ficha de producto ---------- */
  function producto(slug) {
    const p = prodBy(slug); if (!p) return notFound();
    const rel = (p.related || []).map(prodBy).filter(Boolean);
    const others = rel.length ? rel : PRODUCTS.filter(x => x.cat === p.cat && x.slug !== p.slug).slice(0, 4);
    const full = !!p.reg;
    return `
    <div class="wrap"><nav class="crumbs" aria-label="Ruta"><a href="#/">Inicio</a>${I("chevron-right")}<a href="#/productos">Productos</a>${I("chevron-right")}<a href="#/productos?cat=${encodeURIComponent(p.cat)}">${p.cat}</a></nav>
    <div class="pdp">
      <div class="pdp-gallery rv">${pimg({ ...p, img: p.img.replace("-300x300", "") })}</div>
      <div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${p.isNew ? '<span class="badge badge-new">Nuevo</span>' : ""}<a class="badge badge-soft" href="#/productos?cat=${encodeURIComponent(p.cat)}">${p.cat}</a></div>
        <h1 class="rv">${p.name}</h1>
        ${p.active ? `<p class="active rv">${p.active}${p.form ? " · " + p.form : ""}</p>` : ""}
        ${full ? `
        <div class="facts rv"><div><small>Principio activo</small><b>${p.active}</b></div><div><small>Especie</small><b>${p.species.join(" y ")}</b></div>
          <div><small>Presentación</small><b>${p.pres}</b></div><div><small>Registro</small><b>${p.reg}</b></div></div>` : `
        <div class="notice rv" style="margin:24px 0">${I("info")}<span>La información técnica de este producto está en su ficha técnica, disponible en PDF en español y en inglés para médicos registrados.</span></div>`}
        <div class="pdp-actions">
          <button class="btn btn-primary" onclick="APP.fichaTecnica('${p.slug}')">${I("file-text")} Ficha técnica</button>
          <a class="btn btn-ghost" href="#/representantes">${I("users")} Contactar a un representante</a>
        </div>
        <div class="notice">${I("shield-check")}<span>Contenido para profesionales de la salud animal. ¿Observaste un evento adverso? <a href="#/farmacovigilancia?p=${p.slug}">Reporte de farmacovigilancia</a>.</span></div>
        <div class="tabs" role="tablist"><button class="on" role="tab" onclick="APP.tab(this,0)">Descripción</button><button role="tab" onclick="APP.tab(this,1)">Ficha técnica</button><button role="tab" onclick="APP.tab(this,2)">Videos</button></div>
        <div class="tabpane" data-pane="0">${full ? p.desc : `Descripción comercial del producto, editable desde el administrador por el equipo de Marketing.`}</div>
        <div class="tabpane" data-pane="1" hidden>${S.logged ? `<div class="ft-list">${(S.lang === "en" ? ["en", "es"] : ["es", "en"]).map((l, k) => `<div class="locked">${I("file-text")}<div><b style="color:var(--web-navy)">${l === "es" ? "Ficha técnica en español" : "Ficha técnica en inglés"}</b><p style="font-size:14px;color:var(--muted)">PDF · versión vigente aprobada por el área técnica</p></div><button class="btn ${k ? "btn-ghost" : "btn-primary"} btn-sm" style="margin-left:auto" onclick="APP.fichaPdf('${p.slug}','${l}')">${I("download")} Descargar PDF</button></div>`).join("")}</div>`
          : `<div class="locked">${I("lock")}<div><b style="color:var(--web-navy)">Exclusivo para médicos registrados</b><p style="font-size:14px;color:var(--muted)">Inicia sesión para descargar la ficha técnica en PDF, en español o en inglés.</p></div><button class="btn btn-primary btn-sm" style="margin-left:auto" onclick="APP.login('mvz',null,true)">Entrar</button></div>`}</div>
        <div class="tabpane" data-pane="2" hidden><div class="player" id="pvid"><span class="ptitle">Video del producto · ejemplo</span><button class="playbtn" aria-label="Reproducir video" onclick="APP.play('pvid')">${I("play")}</button></div></div>
      </div></div></div>
    <section class="sec" style="padding-top:80px"><div class="wrap"><div class="sec-head"><div><span class="eyebrow">Relacionados</span><h2 class="h-md" style="margin-top:12px">También te puede interesar</h2></div><a class="btn btn-ghost" href="#/productos?cat=${encodeURIComponent(p.cat)}">Ver ${p.cat.toLowerCase()} ${I("arrow-right")}</a></div>
      <div class="grid-p">${others.slice(0, 4).map(pcard).join("")}</div></div></section>`;
  }

  /* ---------- Academia ---------- */
  function academia(params) {
    const tab = AC_TABS.some(x => x[0] === params.get("tab")) ? params.get("tab") : "";
    const pub = COURSES.filter(c => cPublic(c.slug)), dipl = pub.filter(c => c.price), free = pub.filter(c => !c.price);
    setTimeout(() => { const sec = params.get("sec"); if (sec) APP.scrollTo(sec); }, 120);
    const nav = `<div class="atabs ac-tabs"><a class="${tab ? "" : "on"}" href="#/academia">Todo</a>${AC_TABS.map(x => `<a class="${tab === x[0] ? "on" : ""}" href="#/academia?tab=${x[0]}">${t(x[1])}</a>`).join("")}</div>`;
    const sDipl = `<section class="sec sec-alt" id="diplomados"><div class="wrap">
      <div class="sec-head"><div><span class="eyebrow">Diplomados</span><h2 class="h-lg">Diplomados por bloques, con examen y constancia</h2></div></div>
      <div class="grid-p three">${dipl.map(ccard).join("")}</div>
      <p style="font-size:12.5px;color:var(--muted);margin-top:18px">Precios en MXN publicados en el sitio actual. La inscripción a diplomados la confirma el equipo de Academia; el sitio no cobra en línea.</p>
    </div></section>`;
    const sCur = `<section class="sec" id="cursos"><div class="wrap">
      <div class="sec-head"><div><span class="eyebrow">Cursos</span><h2 class="h-lg">Cursos gratuitos para aprender a tu ritmo</h2></div></div>
      <div class="grid-p three">${free.map(ccard).join("")}</div>
    </div></section>`;
    const sWeb = `<section class="sec ${tab ? "" : "sec-alt"}" id="webinars"><div class="wrap">
      <div class="sec-head"><div><span class="eyebrow">Webinars</span><h2 class="h-lg">Webinars en vivo</h2></div></div>
      ${nextWebinar()}
      <div class="sec-head" id="grabaciones" style="margin-top:56px"><div><span class="eyebrow">Grabaciones</span><h2 class="h-md" style="margin-top:12px">Webinars anteriores</h2><p class="lead">Disponibles para médicos registrados.</p></div></div>
      <div class="notice">${I("info")}<span>Las grabaciones de los webinars de Kirón están hoy detrás del acceso de médicos del sitio actual. Se migran a esta sección, con su flyer, ponente y constancia, cuando recibamos los accesos.</span></div>
    </div></section>`;
    return pageHead("Academia Kirón", "Educación continua para el médico veterinario", "Diplomados, cursos y webinars en vivo con constancia verificable. Todo en tu cuenta, desde el celular o la computadora.") +
      `<div class="wrap" style="padding-top:28px">${nav}</div>` +
      (tab === "diplomados" ? sDipl : tab === "cursos" ? sCur : tab === "webinars" ? sWeb : sDipl + sCur + sWeb);
  }
  const ccard = c => {
    const pr = acc(c.slug) ? S.enrolled[c.slug] : undefined, pe = (myEnr(c.slug) || {}).st === "pending";
    return `<a class="ccard rv" href="#/academia/curso/${c.slug}">
      <div class="ccover tone-${c.tone}"><div class="cbg"></div>${I(c.price ? "award" : "heart-pulse", "cico")}${c.img ? `<img class="cimg" src="${c.img}" alt="" loading="lazy" onerror="this.remove()">` : ""}<span class="ccat">${c.cat}</span>${pr !== undefined ? `<span class="ccat enrolled">${I("check")} Inscrito</span>` : pe ? `<span class="ccat enrolled pend">${I("clock")} Solicitud en revisión</span>` : ""}</div>
      <div class="cbody"><h3>${c.title}</h3>
        <div class="cmeta">${c.lessons > 1 ? `<span>${I("book-open")} ${c.lessons} lecciones</span>` : ""}${c.reviews ? `<span>${I("star", "star")} ${c.rating.toFixed(1)} (${c.reviews})</span>` : ""}<span>${I("qr-code")} Constancia</span></div>
        <div class="price">${pr !== undefined ? `<span class="free" style="color:var(--web-blue)">Continuar curso</span>` : c.price ? `<b>${money(c.price)}</b><s>${money(c.was)}</s>` : `<span class="free">GRATUITO</span>`}</div></div></a>`;
  };

  function curso(slug) {
    const c = courseBy(slug); if (!c) return notFound();
    const n = c.lessons || 12, L = n - 1, G = gs();
    const isAdmin = S.logged === "admin";
    if (!cPublic(slug) && !isAdmin) return cursoLanding(c, n);
    const adminPrev = isAdmin && G.adminSinInsc && !acc(slug);
    if (!acc(slug) && !adminPrev) return cursoLanding(c, n);
    focusNow = !!G.enfoque;
    const doneL = adminPrev ? [] : lpOf(slug), allL = doneL.length >= L, passedF = !adminPrev && !!S.grades[slug], finished = allL && passedF;
    const pct = Math.round((doneL.length + (passedF ? 1 : 0)) / n * 100);
    const cur = curOf(slug, doneL), viewExam = cur < 0;
    const folio = "KI-2026-" + String(1000 + n * 37 + c.title.length).padStart(6, "0");
    const ms = mods(c);
    const drip = finished || viewExam ? "" : dripOf(slug, cur);
    const fcfg = qcfg(slug), fLock = fcfg.desbloqueo && hoyIso() < fcfg.desbloqueo;
    const rows = Array.from({ length: L }, (_, i) => { const ok = doneL.includes(i), dl = dripOf(slug, i), m = ms.find(x => x.from === i);
      return (m && ms.length > 1 ? `<div class="mod-h">Módulo ${m.k}</div>` : "") + `<button class="lrow ${ok ? "done" : ""} ${i === cur ? "cur" : ""}" onclick="APP.goLesson('${slug}',${i})"><span class="st">${ok ? I("check") : dl ? I("lock") : i === cur ? I("play") : ""}</span>Lección ${String(i + 1).padStart(2, "0")}<span class="d">${dl ? fechaMx(dl) : LDUR(slug, i)}</span></button>`; }).join("")
      + `<button class="lrow mexam ${passedF ? "done" : ""} ${viewExam && !passedF ? "cur" : ""}" onclick="APP.goLesson('${slug}',${L})"><span class="st">${passedF ? I("check") : allL ? I("list-checks") : I("lock")}</span>Examen final<span class="d">${passedF ? notaFinal(slug).toFixed(1) : "Examen"}</span></button>`;
    const lessonAction = finished ? `<span class="badge badge-ok">${I("award")} Curso aprobado</span>`
      : viewExam ? (fLock ? `<span class="badge badge-warn">${I("lock")} El examen final se abre el ${fechaMx(fcfg.desbloqueo)}</span>` : `<button class="btn btn-accent btn-sm" onclick="APP.exam('${slug}')">${I("list-checks")} Presentar examen final</button>`)
      : doneL.includes(cur) ? `<span class="badge badge-ok">${I("check")} Lección completada</span>`
      : `<span class="auto-note">${I("circle-play")} La lección se marca sola al terminar el video</span>`;
    const pbody = finished ? `<div class="kstage"><span class="kplate"><img src="assets/img/kiron-logo.png" alt="Kirón"></span><span class="vlabel">Curso terminado</span></div>`
      : viewExam ? `<div class="plock">${I("list-checks")}<b>${L ? "Lecciones terminadas · sigue el examen final" : "Este curso es solo el examen final"}</b></div>`
      : drip ? `<div class="plock">${I("lock")}<b>Disponible a partir del ${fechaMx(drip)}</b></div>`
      : `<button class="playbtn" aria-label="Reproducir lección" onclick="APP.watch('${slug}')">${I("play")}</button>`;
    const fileN = String(viewExam ? L : cur + 1).padStart(2, "0");
    return `
    <div class="wrap">${focusNow ? "" : `<nav class="crumbs" aria-label="Ruta"><a href="#/academia">Academia</a>${I("chevron-right")}<span>${c.title}</span></nav>`}
    ${adminPrev ? `<div class="notice warn" style="margin:${focusNow ? "18px" : "0"} 0 18px">${I("shield-check")}<span>Vista de administrador sin inscripción. Puedes recorrer el contenido; no se guarda avance.</span></div>` : ""}
    <div class="lesson">
      <div>
        <div class="player rv" id="lvid" data-i="${cur}"><span class="ptitle">${c.title} · ${finished ? "Curso terminado" : viewExam ? "Examen final" : "Lección " + fileN}</span>${pbody}<div class="bar"><i id="lbar" style="width:${finished ? 100 : 0}%"></i></div>${finished || viewExam || drip ? "" : `<span class="ptime" id="ltime">0:00 / ${LDUR(slug, cur)}</span>`}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin:24px 0 8px;gap:16px;flex-wrap:wrap"><h1 class="h-md">${c.title}</h1><div class="lact">${lessonAction}</div></div>
        <div class="progress" style="margin:10px 0 6px"><i style="width:${pct}%"></i></div><p style="font-size:13px;color:var(--muted)">${L ? doneL.length + " de " + L + " lecciones · " : ""}examen final ${passedF ? "aprobado" : "pendiente"}</p>
        <p style="color:var(--muted);margin-top:14px">${L ? "Puedes ver las lecciones en el orden que quieras. Cada una se marca como completada sola cuando el video llega al 100 %; no hay botón para marcarla a mano. Tu avance se guarda mientras ves el video, así que retomas en el mismo punto desde cualquier dispositivo. Al terminar todas las lecciones se abre el examen final, y la constancia se emite solo si lo apruebas." : "Este curso no tiene lecciones en video: al aprobar el examen final se emite tu constancia."}</p>
        <div class="two" style="grid-template-columns:1fr 1fr">
          <div class="panel"><h3>Tu constancia</h3><p class="sub">${finished ? "Emitida. Cualquiera puede verificarla con el QR." : "Se emite solo al terminar todas las lecciones y aprobar el examen final."}</p>
            <div style="display:flex;gap:16px;align-items:center;margin-top:16px"><div class="qrbox ${finished ? "" : "dim"}">${qrSvg(folio, 66)}</div><div><b style="color:var(--web-navy)">${finished ? "Folio " + folio : "Folio pendiente"}</b><p style="font-size:13px;color:var(--muted)">${finished ? `<a href="#/verificar/${folio}">Verificar en línea</a>` : "Disponible al terminar"}</p></div></div>
            ${finished ? `<button class="btn btn-ghost btn-sm" style="margin-top:14px" onclick="APP.certificate('${slug}','${folio}')">${I("download")} Descargar constancia</button>` : ""}</div>
          <div class="panel"><h3>Archivos de la lección</h3><p class="sub">Ejercicios y documentación de la clase</p>
            <button class="list-row as-btn" onclick="APP.material('${slug}',${+fileN})"><span class="lr-ico">${I("file-text")}</span><div><b>Presentación de la lección ${fileN}</b><small>PDF · se abre para imprimir o guardar</small></div><span class="end">${I("download")}</span></button>
            <button class="list-row as-btn" onclick="APP.toast('Descarga con enlace firmado de corta duración')"><span class="lr-ico">${I("file-spreadsheet")}</span><div><b>Ejercicios de la lección ${fileN}</b><small>ZIP · ejemplo</small></div><span class="end">${I("download")}</span></button></div>
        </div>
      </div>
      <aside class="syllabus rv"><div class="sh"><b style="color:var(--web-navy)">Temario</b><p style="font-size:13px;color:var(--muted);margin:4px 0 10px">Títulos de ejemplo · duración de cada video</p><div class="progress"><i style="width:${pct}%"></i></div></div>
        <div class="lrows">${rows}</div></aside>
    </div></div><div style="height:96px"></div>`;
  }
  function cursoLanding(c, n) {
    const G = gs(), e = S.logged ? myEnr(c.slug) : null;
    if (!cPublic(c.slug) && S.logged !== "admin") return pageHead("Academia", c.title, "") + `<div class="wrap" style="padding:10px 32px 90px;max-width:820px"><div class="notice">${I("info")}<span>Este curso no está disponible por ahora. Si ya lo terminaste, tus constancias siguen en tu panel y se pueden verificar con su folio.</span></div><div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap"><a class="btn btn-primary" href="#/academia">Ver otros cursos</a>${S.logged ? `<a class="btn btn-ghost" href="#/panel/constancias">${I("award")} Mis constancias</a>` : ""}</div></div>`;
    const gate = G.login && !S.logged;
    const buy = gate ? `<p style="font-size:12.5px;color:var(--muted);margin:6px 0 16px">Inicia sesión para ver el detalle del curso e inscribirte.</p><button class="btn btn-accent btn-block" onclick="APP.login('mvz','#/academia/curso/${c.slug}',true)">${I("user")} Iniciar sesión</button>`
      : e && e.st === "pending" ? `<div class="notice" style="margin:8px 0 4px">${I("clock")}<span>Solicitud enviada el ${e.f}. El equipo de Academia confirma tu inscripción y te avisa por correo.</span></div>`
      : c.price ? `${e && e.st === "cancelled" ? `<div class="notice" style="margin:8px 0 10px">${I("info")}<span>Tu inscripción a este curso está cancelada. Tus constancias emitidas se conservan.</span></div>` : ""}<p style="font-size:12.5px;color:var(--muted);margin:6px 0 16px">El equipo de Academia te contacta para confirmar tu inscripción.</p><button class="btn btn-accent btn-block" onclick="APP.checkout('${c.slug}')">${I("send")} ${e && e.st === "cancelled" ? "Solicitar de nuevo" : "Quiero inscribirme"}</button><button class="btn btn-ghost btn-block" style="margin-top:10px" onclick="APP.redeemCourse('${c.slug}')">${I("gift")} Canjear con puntos Club MVZ</button>`
      : `<p style="font-size:12.5px;color:var(--muted);margin:6px 0 16px">Solo necesitas tu cuenta de médico.</p><button class="btn btn-accent btn-block" onclick="APP.enroll('${c.slug}')">Inscribirme gratis</button>`;
    const resumen = () => { const M = mods(c), m1 = M[0], L = n - 1, end = m1 && M.length > 1 ? m1.to + 1 : L, k = Math.min(end, 5); let h = M.length > 1 ? `<div class="mod-h">Módulo 1</div>` : ""; h += Array.from({ length: k }, (_, i) => `<div class="lrow"><span class="st">${I("lock")}</span>Lección ${String(i + 1).padStart(2, "0")}<span class="d">${LDUR(c.slug, i)}</span></div>`).join(""); if (end > k) h += `<div class="lrow"><span class="st"></span>y ${end - k} lecciones más</div>`; if (M.length > 2) h += `<div class="lrow"><span class="st"></span>Módulos 2 a ${M.length}</div>`; else if (M.length === 2) h += `<div class="lrow"><span class="st"></span>Módulo 2</div>`; h += `<div class="lrow mexam"><span class="st">${I("lock")}</span>Examen final<span class="d">Examen</span></div>`; return h; };
    return `
    <section class="course-hero tone-${c.tone}"><div class="cbg"></div><div class="wrap">
      <nav class="crumbs light" aria-label="Ruta"><a href="#/academia">Academia</a>${I("chevron-right")}<span>${c.cat}</span></nav>
      <div class="course-hero-grid"><div>
        <span class="ccat">${c.cat}</span><h1 class="h-lg" style="color:#fff;margin-top:16px">${c.title}</h1>
        <div class="cmeta light" style="margin-top:18px">${c.lessons ? `<span>${I("book-open")} ${c.lessons} lecciones</span>` : ""}${mods(c).length > 1 ? `<span>${I("layers")} ${mods(c).length} módulos</span>` : ""}<span>${I("list-checks")} Examen final</span><span>${I("star", "star")} ${c.rating.toFixed(1)} · ${c.reviews} calificaciones</span><span>${I("qr-code")} Constancia con QR</span><span>${I("clock")} A tu ritmo</span></div>
      </div>
      <div class="buy-card"><div class="price">${c.price ? `<b>${money(c.price)}</b><s>${money(c.was)}</s>` : `<span class="free">GRATUITO</span>`}</div>
        ${buy}
        <ul class="incl"><li>${I("check")} Acceso al confirmar tu inscripción</li><li>${I("check")} Avance sincronizado en todos tus dispositivos</li><li>${I("check")} Examen final al cierre del curso</li><li>${I("check")} Constancia verificable</li></ul></div></div>
    </div></section>
    ${gate ? `<section class="sec"><div class="wrap" style="max-width:820px"><div class="notice">${I("lock")}<span>El temario y los detalles del curso son para médicos registrados.</span></div></div></section>` : `<section class="sec"><div class="wrap two" style="grid-template-columns:1.3fr 1fr;margin:0">
      <div><h2 class="h-md">Lo que vas a ver</h2>${G.resumen ? `<p style="color:var(--muted);margin-top:10px">El temario detallado y los ponentes se cargan desde el administrador de la academia. En el demo se muestran ${n} lecciones de ejemplo.</p>
        <div class="syllabus" style="margin-top:20px"><div class="lrows">${resumen()}</div></div>` : `<p style="color:var(--muted);margin-top:10px">El temario completo se muestra al inscribirte.</p>`}</div>
      <div class="panel"><h3>Opiniones de alumnos</h3><p class="sub">${c.rating.toFixed(1)} de 5 · ${c.reviews} calificaciones en la plataforma actual</p><div class="stars">${"★".repeat(5)}</div><p style="font-size:13.5px;color:var(--muted);margin-top:10px">Las reseñas escritas se migran desde Tutor LMS con el nombre del alumno abreviado.</p></div>
    </div></section>`}`;
  }

  /* ---------- Videoteca y recetas cuantificadas ---------- */
  const VT_TABS = [["productos", "vtP", "#/videoteca"], ["tutoriales", "vtT", "#/videoteca?tab=tutoriales"], ["recetas", "vtR", "#/recetas-cuantificadas"]];
  const AC_TABS = [["cursos", "acC"], ["diplomados", "acD"], ["webinars", "acW"]];
  const ytCard = (v, i) => `<button class="vcard yt rv" onclick="APP.yt(${i})"><div class="vthumb yt-th"><img src="https://i.ytimg.com/vi/${v[1]}/hqdefault.jpg" alt="${esc(v[0])}" loading="lazy"><span class="vplay">${I("play")}</span></div><div class="pbody"><span class="pcat">${v[2] || "Video de producto"}</span><span class="pname">${v[0]}</span></div></button>`;
  const vtNav = cur => `<div class="atabs vt-tabs">${VT_TABS.map(x => `<a class="${cur === x[0] ? "on" : ""}" href="${x[2]}">${t(x[1])}</a>`).join("")}</div>`;
  const proNote = () => S.logged ? "" : `<div class="notice" style="margin-bottom:22px">${I("lock")}<span>Contenido de uso exclusivo para profesionistas de la salud animal. Inicia sesión o regístrate para ver los videos.</span><button class="btn btn-primary btn-sm" style="margin-left:auto" onclick="APP.login('mvz',null,true)">Iniciar sesión</button></div>`;
  function videoteca(tab) {
    let body = "";
    if (tab === "cursos") body = `<div class="grid-p three">${COURSES.map(c => `<a class="panel vt-link rv" href="#/academia/curso/${c.slug}"><span class="badge badge-soft">${c.cat}</span><h3 style="margin-top:12px">${c.title}</h3><p class="sub">${c.lessons ? c.lessons + " lecciones · " : ""}${c.price ? money(c.price) : "Gratuito"}</p><span class="link-arrow">Ver curso ${I("arrow-right")}</span></a>`).join("")}</div>`;
    else if (tab === "webinars") body = `<div class="notice">${I("info")}<span>Las grabaciones de los webinars de Kirón están hoy detrás del acceso de médicos del sitio actual. Se migran a esta sección, con su flyer, ponente y constancia, cuando recibamos los accesos.</span></div>`;
    else if (tab === "tutoriales") body = `<div class="notice">${I("info")}<span>Los tutoriales publicados en el sitio actual de Kirón se migran a esta sección.</span></div>`;
    else body = proNote() + `<div class="grid-p">${VIDEOS.map((v, i) => ytCard(v, i)).join("")}</div><p style="font-size:13px;color:var(--muted);margin-top:16px">Videos publicados en kironmexico.com y en el canal de YouTube de Laboratorios Kirón.</p>`;
    return pageHead("Videoteca", "Videoteca Kirón", "Videos de producto, tutoriales y recetas cuantificadas para el médico veterinario.") +
      `<section class="sec" style="padding-top:32px"><div class="wrap">${vtNav(tab)}${body}</div></section>`;
  }
  function recetas() {
    return pageHead("Videoteca", "Recetas cuantificadas", "Un espacio hecho para ti") + `<section class="sec" style="padding-top:32px"><div class="wrap">${vtNav("recetas")}
      <div class="two" style="margin:0;grid-template-columns:1.2fr 1fr;align-items:center">
        <div class="player rec-player" id="recvid"><span class="ptitle">Recetas cuantificadas · Tutorial 1</span><button class="playbtn" aria-label="Ver el tutorial" onclick="APP.recipe()">${I("play")}</button></div>
        <div><span class="eyebrow">Tutorial 1</span><h2 class="h-md" style="margin-top:12px">Todo sobre recetas cuantificadas, en un solo lugar</h2>
          <p style="color:var(--muted);margin-top:12px">Ya está disponible nuestro primer tutorial y muy pronto sumaremos más videos.</p>
          <button class="btn btn-accent" style="margin-top:20px" onclick="APP.recipe()">${I("circle-play")} Ver el tutorial</button>
          ${S.logged ? "" : `<p style="font-size:13px;color:var(--muted);margin-top:12px">${I("lock")} Para acceder a este contenido necesitas una cuenta.</p>`}</div>
      </div>
      <h3 style="margin:40px 0 14px;font-size:22px">Próximos videos</h3>
      <div class="grid-p three">${[2, 3, 4].map(n => `<div class="panel soon-card"><span class="lr-ico">${I("clock")}</span><b>Tutorial ${n}</b><small>Próximamente</small></div>`).join("")}</div>
    </div></section>`;
  }

  /* ---------- Distribuidores (México y resto del mundo) ---------- */
  const ESTADOS = ["Aguascalientes", "Baja California", "Baja California Sur", "Campeche", "Chiapas", "Chihuahua", "Ciudad de México", "Coahuila", "Colima", "Durango", "Estado de México", "Guanajuato", "Guerrero", "Hidalgo", "Jalisco", "Michoacán", "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"];
  function distribuidores(kind) {
    const mx = kind === "mx", sent = S.distSent[kind];
    const head = mx ? pageHead("Distribuidores", "Distribuidores en México", "Forma parte de nuestra gran red de distribuidores.")
      : pageHead("Distribuidores", "Distribuidores en el mundo", `Kirón tiene presencia en ${COUNTRIES.length} países.`);
    const side = `<div class="panel dist-side"><span class="eyebrow">${mx ? "Quiero ser distribuidor" : "Distribuye Kirón en tu país"}</span>
        <h3 style="margin-top:12px">Escríbenos o llámanos</h3><p class="sub">El equipo comercial revisa cada solicitud y te contacta.</p>
        <a class="list-row as-btn" href="${LINKS.tel}"><span class="lr-ico">${I("phone")}</span><div><b>55 5112 7743</b><small>Teléfono</small></div></a>
        <a class="list-row as-btn" href="mailto:esantiago@kironmexico.com"><span class="lr-ico">${I("mail")}</span><div><b>esantiago@kironmexico.com</b><small>Correo</small></div></a>
        <div style="margin-top:16px">${ext(LINKS.wa, I("whatsapp") + " Mensaje de WhatsApp", "btn btn-primary btn-block")}</div>
        <div class="seg" style="margin-top:14px;flex-wrap:wrap"><a class="mini" href="#/distribuidores/${mx ? "mundo" : "mexico"}">${I("globe")} ${mx ? "Distribuidores en el mundo" : "Distribuidores en México"}</a><a class="mini" href="#/representantes">${I("users")} Representantes</a></div></div>`;
    const world = mx ? "" : `<section class="sec" style="padding-top:36px;padding-bottom:0"><div class="wrap"><div class="panel"><h3>Dónde estamos</h3><p class="sub">Países con distribución de Kirón</p>
        <div class="countries light-c">${COUNTRIES.map(c => `<span class="country">${c}</span>`).join("")}</div>
        <p style="margin-top:16px;font-size:14px;color:var(--web-navy)"><b>Próximamente:</b> ${SOON.join(" y ")}</p></div></div></section>`;
    const form = sent ? `<div class="panel success"><div class="big-ok">${I("circle-check")}</div><h3 style="font-size:24px;margin:10px 0 6px">Gracias por tu interés</h3><p style="color:var(--muted)">Recibimos tu información. El equipo comercial la revisa y te contacta.</p><a class="btn btn-ghost" style="margin-top:18px" href="#/">Volver al inicio</a></div>`
      : `<form class="panel" style="padding:32px" onsubmit="return APP.distSubmit(event,'${kind}')"><h3>Permítenos conocerte</h3><p class="sub">Todos los campos son obligatorios, salvo los indicados.</p>
        <div class="grid2"><div class="form-row"><label class="l" for="d1">Tu nombre</label><input class="input" id="d1" required></div><div class="form-row"><label class="l" for="d2">Tu email</label><input class="input" id="d2" type="email" required></div></div>
        <div class="grid2"><div class="form-row"><label class="l" for="d3">Tu teléfono</label><input class="input" id="d3" type="tel" required></div><div class="form-row"><label class="l" for="d4">${mx ? "Estado" : "País"}</label>${mx ? `<select class="select" id="d4" required><option value="">Elige tu estado</option>${ESTADOS.map(e => `<option>${e}</option>`).join("")}</select>` : `<input class="input" id="d4" required placeholder="Ej. Colombia">`}</div></div>
        <div class="form-row"><label class="l" for="d5">¿Qué marcas y en qué laboratorios distribuyes actualmente?</label><textarea class="input" id="d5" rows="3" required style="height:auto;padding:12px 16px"></textarea></div>
        <div class="grid2"><div class="form-row"><label class="l" for="d6">Número de rutas actuales</label><input class="input" id="d6" type="number" min="0" required></div><div class="form-row"><label class="l" for="d7">Número de vendedores que tienes</label><input class="input" id="d7" type="number" min="0" required></div></div>
        <div class="form-row"><label class="l" for="d8">Adjunta una presentación de la empresa (opcional)</label><input class="input" id="d8" type="file" style="padding-top:14px"></div>
        <div class="form-row"><label class="l" for="d9">Comentarios adicionales (opcional)</label><textarea class="input" id="d9" rows="3" style="height:auto;padding:12px 16px"></textarea></div>
        <label class="opt" style="margin-bottom:18px"><input type="checkbox" required> Acepto el <a href="#/legal/privacidad">aviso de privacidad</a></label>
        <button class="btn btn-accent btn-block" type="submit">${I("send")} Enviar</button></form>`;
    return head + world + `<section class="sec" style="padding-top:36px"><div class="wrap"><div class="two dist-grid" style="margin:0">${form}${side}</div></div></section>`;
  }

  /* ---------- Verificación, legales, farmacovigilancia ---------- */
  function verificar(folio) {
    const ok = /^KI-2026-\d{6}$/.test(folio || "");
    return pageHead("Verificación de constancias", "Verifica una constancia", "Escanea el QR o escribe el folio que aparece en la constancia.") + `
    <section class="sec" style="padding-top:40px"><div class="wrap" style="max-width:760px">
      <form class="search-big" onsubmit="event.preventDefault();location.hash='#/verificar/'+this.f.value.trim().toUpperCase()">${I("qr-code")}<input name="f" value="${esc(folio || "")}" placeholder="KI-2026-000000" aria-label="Folio"><button class="btn btn-primary btn-sm" style="border-radius:50px">Verificar</button></form>
      ${folio ? (ok ? `<div class="verify ok">${I("badge-check")}<div><b>Constancia válida</b><p>Folio ${esc(folio)} · Módulo 1 · Las bases de la defensa en perros y gatos · emitida el 12/09/2026 a nombre de L. Méndez (ejemplo).</p></div></div>`
        : `<div class="verify bad">${I("triangle-alert")}<div><b>No encontramos ese folio</b><p>Revisa que tenga el formato KI-2026-000000. Las constancias migradas conservan su folio original.</p></div></div>`) : ""}
      <p style="font-size:13px;color:var(--muted);margin-top:16px">Prueba con el folio de ejemplo <a href="#/verificar/KI-2026-001234">KI-2026-001234</a>.</p>
    </div></section>`;
  }
  function legal(doc) {
    const priv = doc !== "condiciones";
    return pageHead("Legal", priv ? "Aviso de privacidad" : "Condiciones de uso", "") + `
    <section class="sec" style="padding-top:40px"><div class="wrap prose">
      <div class="notice warn">${I("info")}<span>En el demo se muestra la estructura. El texto legal vigente de Kirón se migra tal cual desde el sitio actual y lo valida su área legal.</span></div>
      ${priv ? `<h3>Responsable</h3><p>Laboratorios Kirón México. Razón social y domicilio: se toman del aviso vigente.</p><h3>Datos que tratamos</h3><p>De médicos: nombre, correo, WhatsApp y cédula profesional.</p><h3>Finalidades</h3><p>Cuenta y verificación profesional, academia, webinars y constancias, Club MVZ y atención por el asistente de preguntas frecuentes.</p><h3>Transferencias</h3><p>Proveedores de nube, transmisión de video y correo, conforme a la LFPDPPP.</p><h3>Derechos ARCO</h3><p>Desde tu perfil puedes descargar o borrar tus datos. También puedes escribir a [correo de privacidad].</p>`
        : `<h3>Uso del sitio</h3><p>El contenido técnico es de uso exclusivo del Médico Veterinario Zootecnista.</p><h3>Academia</h3><p>Inscripción a cursos, webinars y constancias.</p><h3>Club MVZ</h3><p>Reglas para sumar y canjear puntos.</p>`}
      <p><a class="link-arrow" href="https://kironmexico.com/" target="_blank" rel="noopener">Ver el texto vigente en el sitio actual ${I("arrow-right")}</a></p>
    </div></section>`;
  }
  function farmaco(params) {
    const pre = params.get("p");
    return pageHead("Farmacovigilancia", "Reporte de farmacovigilancia", "Si observaste un evento adverso con un producto Kirón, cuéntanos. Llega directo al área de farmacovigilancia.") + `
    <section class="sec" style="padding-top:40px"><div class="wrap" style="max-width:820px">
      <form class="panel" style="padding:32px" id="fvform" onsubmit="return APP.fvSubmit(event)">
        <div class="grid2"><div class="form-row"><label class="l" for="fv1">Nombre de quien reporta</label><input class="input" id="fv1" required></div><div class="form-row"><label class="l" for="fv2">Correo o WhatsApp</label><input class="input" id="fv2" required></div></div>
        <div class="grid2"><div class="form-row"><label class="l" for="fv3">Producto</label><select class="select" id="fv3">${PRODUCTS.map(p => `<option ${p.slug === pre ? "selected" : ""}>${p.name}</option>`).join("")}</select></div><div class="form-row"><label class="l" for="fv4">Lote</label><input class="input" id="fv4" placeholder="Viene en el empaque"></div></div>
        <div class="grid2"><div class="form-row"><label class="l">Especie</label><select class="select"><option>Perro</option><option>Gato</option><option>Otra</option></select></div><div class="form-row"><label class="l" for="fv5">Fecha del evento</label><input class="input" id="fv5" type="date" value="2026-10-30"></div></div>
        <div class="form-row"><label class="l" for="fv6">¿Qué pasó?</label><textarea class="input" id="fv6" rows="4" required style="height:auto;padding:14px" placeholder="Describe el evento, la dosis y la evolución del paciente"></textarea></div>
        <label class="check"><input type="checkbox" required> Acepto el <a href="#/legal/privacidad">aviso de privacidad</a>.</label>
        <button class="btn btn-accent" type="submit">${I("send")} Enviar reporte</button>
      </form></div></section>`;
  }
  const notFound = () => pageHead("404", "No encontramos esta página", "Puede que la liga haya cambiado con la nueva plataforma.") + `<div class="wrap" style="padding:20px 32px 100px"><a class="btn btn-primary" href="#/">Ir al inicio</a></div>`;

  /* ---------- Representantes (sección actual del sitio, programada) ---------- */
  const tel10 = p => "tel:+52" + p.replace(/\D/g, "");
  const repRow = p => `<div class="rep"><span class="avatar">${p[0].split(" ").slice(0, 2).map(w => w[0]).join("")}</span><div class="rep-b"><b data-notr>${p[0]}</b>${p[1] ? `<small>${p[1]}</small>` : ""}<span class="rep-c" data-notr><a href="mailto:${p[2]}@kironmexico.com">${I("mail")} ${p[2]}@kironmexico.com</a><a href="${tel10(p[3])}">${I("phone")} ${p[3]}</a></span><a class="mini rep-wa" href="https://wa.me/52${p[3].replace(/\D/g, "")}" target="_blank" rel="noopener">${I("whatsapp")} WhatsApp</a></div></div>`;
  function representantes() {
    return pageHead("Representantes", "El equipo de Kirón en tu zona", "Encuentra a quién contactar en tu estado.") + `
    <section class="sec" style="padding-top:40px"><div class="wrap">
      <div class="rep-zones">${REPS.map(z => `<div class="panel rv repz"><h3>Zona ${z.zone}</h3><p class="sub">${z.states}</p><div class="rep-list">${z.people.map(repRow).join("")}</div></div>`).join("")}</div>
      <div class="panel rv repz" style="margin-top:22px"><span class="eyebrow">Contacto nacional</span><div class="rep-list three">${REPS_NAT.map(repRow).join("")}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:18px">${ext(LINKS.wa, I("whatsapp") + " WhatsApp", "btn btn-primary btn-sm")}<a class="btn btn-ghost btn-sm" href="${LINKS.tel}">${I("phone")} Línea Kirón · 55 5112 7743</a></div></div>
      <div class="notice" style="margin-top:22px">${I("info")}<span>Zonas, nombres y datos de contacto tomados de kironmexico.com el 18/11/2026. En la nueva plataforma el equipo de Kirón los actualiza desde el administrador.</span></div>
    </div></section>`;
  }

  /* ---------- Panel del médico: Inicio, Mis cursos y Club ---------- */
  function panelShell(tab, inner) {
    const L = (tb, ic, label, cls = "") => `<a href="#/panel${tb ? "/" + tb : ""}" class="${tab === tb ? "on" : ""} ${cls}">${I(ic)}<span>${label}</span></a>`;
    return `<div class="app">
      <nav class="side" aria-label="Mi panel">
        <div class="who"><span class="avatar">LM</span><div><b>Dra. Laura Méndez</b><small>${I("badge-check")} Cédula verificada</small></div></div>
        ${L("", "layout-dashboard", "Inicio")}${L("cursos", "graduation-cap", "Mis cursos")}${L("constancias", "award", "Constancias")}${L("club", "gift", "Club")}
        <div class="bottom hide-m"><a href="#/academia">${I("book-open")}<span>Academia</span></a><button class="side-btn" onclick="APP.logout()">${I("log-out")}<span>Salir</span></button></div>
      </nav>
      <main class="main page-enter" id="main">${inner}</main></div>`;
  }
  function panel(tab) {
    if (tab === "cursos") return panelShell(tab, misCursos());
    if (tab === "constancias") return panelShell(tab, misConstancias());
    if (tab === "club") return panelShell(tab, clubView());
    const w = WEBINARS.next;
    const mine = COURSES.filter(c => acc(c.slug) && cPublic(c.slug));
    const active = mine.filter(c => S.enrolled[c.slug] < (c.lessons || 12));
    const certs = COURSES.filter(c => S.enrolled[c.slug] >= (c.lessons || 12)).length + 1;
    const nextReward = S.rewards.filter(r => !S.redeemed.includes(r[3]) && !acc(r[3])).sort((a, b) => a[1] - b[1]).find(r => r[1] > S.points);
    return panelShell("", `
      <div class="main-head"><div><h1>Buenas tardes, Dra. Méndez</h1><p>Tus cursos, el webinar en vivo y tus puntos · datos de ejemplo</p></div>
        <a class="btn btn-ghost" href="#/academia">${I("book-open")} Explorar academia</a></div>
      <div class="panel rv live-card"><div class="lc-body"><span class="badge badge-dark">${I("video")} Webinar</span>
          <h2>${w.title}</h2><p>${w.deg} ${w.speaker} · 15/12/2026 · 20:00 Hrs (México)</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">${S.webinar ? `<button class="btn btn-accent" onclick="APP.live()">${I("play")} Entrar</button><button class="btn btn-outline-light btn-sm" onclick="APP.ics()">${I("calendar")} Agregar a mi calendario</button>` : `<button class="btn btn-accent" onclick="APP.webinarReg()">${I("calendar")} Registrarme</button>`}</div>
          <p class="lc-note">${S.webinar ? (S.attended ? "Tu asistencia ya quedó registrada · +50 puntos." : "En el demo puedes entrar antes de la hora para ver la sala.") : "Regístrate para que el botón Entrar aparezca aquí el día del webinar."}</p></div>
        <div class="lc-side"><div class="pp-date"><span class="wd">${w.dow}</span><span class="d">${w.day}</span><span class="ym"><span>${w.year}</span><span>${w.month}</span></span></div></div></div>
      <div class="dash" style="margin-top:18px">
        <a class="qa prime rv" href="#/panel/cursos"><span class="qi">${I("graduation-cap")}</span><b>${active.length} cursos en curso</b><small>Continúa donde te quedaste</small></a>
        <a class="qa rv" href="#/panel/constancias"><span class="qi">${I("award")}</span><b>${certs} constancias</b><small>Descárgalas o compártelas</small></a>
        <a class="qa rv" href="#/panel/club"><span class="qi">${I("gift")}</span><b>${S.points.toLocaleString("es-MX")} puntos</b><small>Club MVZ</small></a>
        <a class="qa rv" href="#/panel/club"><span class="qi">${I("target")}</span><b>${nextReward ? (nextReward[1] - S.points).toLocaleString("es-MX") + " para canjear" : "Ya puedes canjear"}</b><small>${nextReward ? nextReward[0] : "Revisa tus canjes"}</small></a>
      </div>
      <div class="panel rv" style="margin-top:18px"><h3>Continúa aprendiendo</h3><p class="sub">Toca un curso para retomarlo</p>
        ${active.map(c => { const n = c.lessons || 12, p = Math.round(S.enrolled[c.slug] / n * 100); return `<a class="list-row" href="#/academia/curso/${c.slug}"><span class="lr-ico">${I("book-open")}</span><div><b>${c.title}</b><small>${p}% completado</small></div><span class="end"><span class="link-arrow">Continuar ${I("arrow-right")}</span></span></a>`; }).join("") || `<p style="color:var(--muted)">No tienes cursos en curso. <a href="#/academia">Explora la academia</a>.</p>`}</div>`);
  }

  function misCursos() {
    const mine = COURSES.filter(c => acc(c.slug) && cPublic(c.slug));
    const pend = enrList().filter(e => e.u === ME && e.st === "pending");
    const qstate = c => { const key = c.slug, u = S.attempts[key] || 0, mx = maxAtt(key);
      if (passed(key)) return ["Aprobado", "st-ok"]; if (u >= mx) return ["Sin intentos", "st-rev"]; if (lessonsDone(c.slug)) return ["Disponible", "st-rev"]; return ["Bloqueado", "st-draft"]; };
    return `<div class="main-head"><div><h1>Mis cursos</h1><p>Tu avance se guarda en cualquier dispositivo · datos de ejemplo</p></div><a class="btn btn-ghost" href="#/academia">Explorar academia</a></div>
      ${pend.length ? `<div class="panel" style="margin-bottom:18px"><h3>Solicitudes de inscripción</h3><p class="sub">El equipo de Academia las revisa y te avisa por correo</p>${pend.map(e => `<div class="list-row"><span class="lr-ico">${I("clock")}</span><div><b>${ctitle(e.s)}</b><small>Enviada el ${e.f}</small></div><span class="end"><span class="state st-rev">Pendiente</span></span></div>`).join("")}</div>` : ""}
      <div class="grid-p three">${mine.map(c => { const n = c.lessons || 12, p = Math.round(S.enrolled[c.slug] / n * 100); return `<a class="ccard" href="#/academia/curso/${c.slug}"><div class="ccover tone-${c.tone}"><div class="cbg"></div>${I("heart-pulse", "cico")}<span class="ccat">${c.cat}</span></div><div class="cbody"><h3>${c.title}</h3><div class="progress"><i style="width:${p}%"></i></div><small style="color:var(--muted)">${p}% completado</small>${p >= 100 ? `<span class="badge badge-ok" style="align-self:flex-start">${I("award")} Constancia emitida</span>` : `<span class="link-arrow" style="font-size:14px">Continuar ${I("arrow-right")}</span>`}</div></a>`; }).join("")}</div>
      <h3 style="margin:32px 0 6px;font-size:22px">Calificaciones e intentos</h3><p class="sub" style="margin-bottom:14px">Ves la calificación final del examen de cada curso. El detalle de las respuestas no se muestra. La constancia se emite solo con todas las lecciones terminadas y el examen aprobado.</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Curso</th><th>Lecciones</th><th>Intentos del examen</th><th>Calificación final</th><th>Examen final</th></tr></thead><tbody>
        ${mine.map(c => { const key = c.slug, u = S.attempts[key] || 0, g = notaFinal(key), st = qstate(c), L = (c.lessons || 12) - 1; return `<tr><td><b style="color:var(--web-navy)">${c.title}</b></td><td class="nowrap">${lpOf(c.slug).length} de ${L}</td><td>${attTxt(u, maxAtt(key))}</td><td>${g ? g.toFixed(1) : "—"}</td><td><span class="state ${st[1]}">${st[0]}</span></td></tr>`; }).join("")}
      </tbody></table></div>
      <a class="panel list-row" style="margin-top:28px" href="#/panel/constancias"><span class="lr-ico">${I("award")}</span><div><b>Mis constancias</b><small>De cursos, diplomados y webinars</small></div><span class="end"><span class="link-arrow">Ver todas ${I("arrow-right")}</span></span></a>`;
  }

  function misConstancias() {
    const mine = COURSES.filter(c => S.enrolled[c.slug] !== undefined);
    const certs = mine.filter(c => S.enrolled[c.slug] >= (c.lessons || 12));
    return `<div class="main-head"><div><h1>Mis constancias</h1><p>De cursos, diplomados y webinars · datos de ejemplo</p></div><a class="btn btn-ghost" href="#/verificar/KI-2026-001234">${I("qr-code")} Verificar una constancia</a></div>
      <div class="notice" style="margin-bottom:18px">${I("shield-check")}<span>Una constancia emitida se queda en tu cuenta. Puedes descargarla y verificarla con su folio aunque el curso cambie o deje de estar publicado.</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Curso o webinar</th><th>Tipo</th><th>Fecha</th><th>Folio</th><th>Origen</th><th></th></tr></thead><tbody>
        ${certs.map(c => { const f = c.slug === "inmunologia" ? "KI-2026-001234" : "KI-2026-" + String(1000 + (c.lessons || 12) * 37 + c.title.length).padStart(6, "0"); return `<tr><td>${c.title}</td><td>${c.price ? "Diplomado" : "Curso"}</td><td>${c.slug === "inmunologia" ? "12/09/2026" : "30/10/2026"}</td><td><a href="#/verificar/${f}">${f}</a></td><td><span class="badge badge-soft">${c.slug === "inmunologia" ? "Migrada de Tutor LMS" : "Emitida en la nueva academia"}</span></td><td><button class="btn btn-ghost btn-sm" onclick="APP.certificate('${c.slug}','${f}')">${I("download")} PDF</button></td></tr>`; }).join("")}
        <tr><td>Gabapentina en neurología canina</td><td>Webinar</td><td>15/10/2026</td><td><a href="#/verificar/KI-2026-001388">KI-2026-001388</a></td><td><span class="badge badge-soft">Asistencia registrada</span></td><td><button class="btn btn-ghost btn-sm" onclick="APP.certificate('webinar','KI-2026-001388')">${I("download")} PDF</button></td></tr>
      </tbody></table></div><p style="font-size:12.5px;color:var(--muted);margin-top:10px">Las constancias anteriores conservan su folio y su enlace de verificación original.</p>`;
  }

  function clubView() {
    const cheapest = S.rewards.filter(r => !S.redeemed.includes(r[3]) && !acc(r[3])).map(r => r[1]).sort((a, b) => a - b).find(v => v > S.points);
    return `<div class="main-head"><div><h1>Club MVZ</h1><p>Suma puntos y canjéalos por cursos y promociones · valores de ejemplo</p></div></div>
      <div class="two" style="margin-top:0;grid-template-columns:1fr 1.4fr">
        <div class="panel" style="background:linear-gradient(135deg,var(--pp-navy),#3a5806);color:#fff;border:0"><span class="badge badge-dark">Saldo</span><div style="font:800 64px/1 var(--f-camp);margin:18px 0 6px">${S.points.toLocaleString("es-MX")}</div><p style="color:#dfe2da">puntos disponibles</p>
          <div class="progress" style="margin-top:22px;background:rgba(255,255,255,.15)"><i style="width:${Math.min(100, S.points / 30)}%;background:var(--cyan)"></i></div><p style="font-size:13px;color:#dfe2da;margin-top:8px">${cheapest ? (cheapest - S.points).toLocaleString("es-MX") + " para tu próximo canje" : "Ya puedes canjear"}</p></div>
        <div class="panel"><h3>Cómo sumar</h3><div class="howgrid">
          ${S.rules.map(r => `<div class="rx-field" style="margin:0">${I(r[0].includes("cédula") ? "badge-check" : r[0].includes("webinar") ? "video" : r[0].includes("curso") ? "award" : "book-open")}<div><b>${r[0]}</b><small style="display:block;color:var(--muted);font-size:12px">${r[2]}</small></div><span class="badge badge-ok" style="margin-left:auto">+${r[1]}</span></div>`).join("")}</div>
          <div class="invoice-box"><div><b>Compraste un producto en promoción</b><p>Sube tu factura y el sistema identifica el producto para sumarte los puntos.</p><span class="badge badge-warn">En evaluación con Kirón</span></div><button class="btn btn-ghost btn-sm" onclick="APP.invoice()">${I("download")} Subir factura</button></div></div>
      </div>
      <h3 style="margin:32px 0 14px;font-size:22px">Canjes</h3>
      <div class="grid-p three">${S.rewards.map(r => { const got = S.redeemed.includes(r[3]) || acc(r[3]); const can = S.points >= r[1];
        return `<div class="qa"><span class="qi">${I(r[2])}</span><b>${r[0]}</b><small>${r[1].toLocaleString("es-MX")} puntos</small>${got ? `<span class="badge badge-ok" style="align-self:flex-start">${I("check")} ${COURSES.some(c => c.slug === r[3]) ? "Ya lo tienes" : "Canjeado"}</span>` : can ? `<button class="btn btn-primary btn-sm" onclick="APP.redeem('${r[3]}',${r[1]})">Canjear</button>` : `<button class="btn btn-ghost btn-sm" disabled title="Puntos insuficientes">Te faltan ${(r[1] - S.points).toLocaleString("es-MX")}</button>`}</div>`; }).join("")}</div>
      <p style="font-size:12.5px;color:var(--muted);margin-top:12px">Kirón agrega y cambia los premios desde su administrador.</p>`;
  }

  /* ---------- Administrador ---------- */
  function adminShell(sub, inner) {
    const L = (s, ic, label, ct = "", cls = "") => `<a class="${sub === s ? "on" : ""} ${cls}" href="#/admin${s ? "/" + s : ""}">${I(ic)}<span>${label}</span>${ct}</a>`;
    const pv = S.verif.filter(v => !v[2]).length;
    return `<div class="app">
      <nav class="side" aria-label="Administrador"><div class="who"><span class="avatar" style="background:var(--pp-red);color:var(--ink)">KI</span><div><b>Equipo Kirón</b><small>${I("shield-check")} Doble factor activo</small></div></div>
        ${L("", "chart-column", "Tablero")}${L("medicos", "badge-check", "Médicos", pv ? `<span class="ct">${pv}</span>` : "")}${L("webinars", "video", "Webinars")}
        ${L("club", "gift", "Club MVZ")}${L("academia", "graduation-cap", "Academia")}${L("paginas", "pencil", "Páginas", "", "hide-m")}
        <div class="bottom hide-m"><a href="#/">${I("globe")}<span>Ver sitio</span></a><button class="side-btn" onclick="APP.logout()">${I("log-out")}<span>Salir</span></button></div></nav>
      <main class="main page-enter">${inner}</main></div>`;
  }
  const PASTW = [[WEBINARS.next.title + " " + WEBINARS.next.sub, "15/12/2026", "Próximo", 418, null], ["Webinar anterior · ejemplo 1", "12/11/2026", "Concluido", 512, 342], ["Webinar anterior · ejemplo 2", "22/10/2026", "Concluido", 467, 301]];
  function admin(sub, t, rest = []) {
    if (sub === "academia" && t === "editor") return adminShell("academia", ceView(rest[0], rest[1], rest[2]));
    if (sub === "medicos") return adminShell(sub, `<div class="main-head"><div><h1>Médicos</h1><p>Verificación de cédulas · datos de ejemplo</p></div></div>${verifPanel()}`);
    if (sub === "paginas") return adminShell(sub, paginas());
    if (sub === "academia") return adminShell(sub, adminAcademia(t || "cursos"));
    if (sub === "webinars") return adminShell(sub, adminWebinars());
    if (sub === "club") return adminShell(sub, adminClub());
    const months = [["May", 52], ["Jun", 61], ["Jul", 70], ["Ago", 78], ["Sep", 88], ["Oct", 100]];
    return adminShell("", `
      <div class="main-head"><div><h1>Tablero</h1><p>Uso de la plataforma · cifras de ejemplo</p></div><button class="btn btn-ghost btn-sm" onclick="APP.kpiCsv()">${I("download")} Exportar</button></div>
      <div class="kpis">${[["Médicos activos esta semana", "412", "+18%"], ["Inscripciones a cursos", "186", "+12%"], ["Asistentes al último webinar", "342", "+14%"], ["Constancias emitidas", "214", "+9%"]].map(k => `<div class="kpi rv"><small>${k[0]}</small><b>${k[1]}</b><span class="trend">${I("trending-up")} ${k[2]} vs. mes anterior</span></div>`).join("")}</div>
      <div class="two" style="margin-top:0">
        <div class="panel"><h3>Asistentes a webinars por mes</h3><p class="sub">Pasa el cursor sobre una barra</p><div class="bars" id="bars">${months.map(m => `<div style="height:${m[1]}%" tabindex="0" title="${m[0]}: ${Math.round(m[1] * 3.42)} asistentes"><em>${Math.round(m[1] * 3.42)}</em><span>${m[0]}</span></div>`).join("")}</div><div style="height:26px"></div></div>
        ${verifPanel()}
      </div>`);
  }
  function verifPanel() {
    return `<div class="panel" id="verif"><h3>Verificación de cédulas</h3><p class="sub">${S.verif.filter(v => !v[2]).length} pendientes · se valida en la consulta pública de la SEP</p>
      ${S.verif.map((m, i) => `<div class="list-row"><span class="avatar" style="width:36px;height:36px;font-size:13px">${m[0].split(" ").slice(-2).map(x => x[0]).join("")}</span><div><b>${m[0]}</b><small>Cédula ${m[1]}</small></div><span class="end">${m[2] ? `<span class="state st-ok">Verificado</span>` : `<button class="mini" onclick="APP.toast('En el sitio real abre la consulta de la SEP con la cédula')">${I("eye")} Consultar</button> <button class="btn btn-primary btn-sm" onclick="APP.verify(${i})">Aprobar</button>`}</span></div>`).join("")}</div>`;
  }
  function adminWebinars() {
    return `<div class="main-head"><div><h1>Webinars</h1><p>Registro y asistencia de cada transmisión · cifras de ejemplo</p></div><button class="btn btn-primary btn-sm" onclick="APP.webinarNew()">${I("plus")} Nuevo webinar</button></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Webinar</th><th>Fecha</th><th>Estado</th><th>Registrados</th><th>Asistentes</th><th></th></tr></thead><tbody>
      ${(S.newWebinars || []).map((w, i) => `<tr><td><b style="color:var(--web-navy)" data-notr>${esc(w.titulo)}</b>${w.subtitulo ? `<small style="display:block;color:var(--muted)" data-notr>${esc(w.subtitulo)}</small>` : ""}<small style="display:block;color:var(--muted)"><span data-notr>${esc(w.grado + " " + w.ponente)}</span></small></td><td>${fechaMx(w.fecha)}<small style="display:block;color:var(--muted)">${w.hora} Hrs</small></td><td><span class="state ${w.publicado ? "st-rev" : ""}">${w.publicado ? "Programado" : "Borrador"}</span></td><td>0</td><td>—</td><td class="nowrap"><a class="mini" href="#/webinar/${w.slug}">${I("eye")} Ver landing</a> <button class="mini" onclick="APP.webinarStream(${i})">${I("video")} Datos para el ponente</button></td></tr>`).join("")}
      ${PASTW.map((w, i) => `<tr><td><b style="color:var(--web-navy)">${w[0]}</b></td><td>${w[1]}</td><td><span class="state ${w[2] === "Próximo" ? "st-rev" : "st-ok"}">${w[2]}</span></td><td>${w[3]}</td><td>${w[4] === null ? (S.attended ? "1 (tú, en el demo)" : "—") : w[4]}</td><td class="nowrap">${i === 0 ? `<a class="mini" href="#/webinar/proximo">${I("eye")} Ver landing</a> ` : ""}${w[4] === null && !S.attended ? "" : `<button class="mini" onclick="APP.attendees(${i})">${I("users")} Ver asistentes</button>`}</td></tr>`).join("")}
      </tbody></table></div>
      <div class="notice" style="margin-top:16px">${I("info")}<span>El ponente transmite desde Zoom con transmisión personalizada hacia el reproductor del sitio, y el público entra con su cuenta. Así se sabe quién asistió y se le suman sus puntos automáticamente.</span></div>`;
  }
  function adminClub() {
    return `<div class="main-head"><div><h1>Club MVZ</h1><p>Reglas para sumar y premios para canjear · valores de ejemplo</p></div></div>
      <div class="two" style="margin-top:0">
        <div class="panel"><h3>Cómo se suman puntos</h3><p class="sub">Cambia el valor y guarda</p>
          ${S.rules.map((r, i) => `<div class="list-row"><span class="lr-ico">${I("plus")}</span><div><b>${r[0]}</b><small>${r[2]}</small></div><span class="end"><input class="input pts-in" type="number" min="0" step="10" value="${r[1]}" aria-label="Puntos por ${r[0]}" onchange="APP.ruleSave(${i},this.value)"></span></div>`).join("")}</div>
        <div class="panel"><h3>Nuevo premio</h3><p class="sub">Aparece al momento en el Club de cada médico</p>
          <form onsubmit="return APP.rewardAdd(event)"><div class="form-row"><label class="l" for="rw1">Premio</label><input class="input" id="rw1" required placeholder="Ej. Diplomado Medicina Interna Felina"></div>
            <div class="form-row"><label class="l" for="rw2">Puntos necesarios</label><input class="input" id="rw2" type="number" min="1" required placeholder="Ej. 2500"></div>
            <button class="btn btn-primary btn-block" type="submit">${I("plus")} Agregar premio</button></form></div>
      </div>
      <h3 style="margin:28px 0 14px;font-size:22px">Premios vigentes</h3>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Premio</th><th>Puntos</th><th></th></tr></thead><tbody>
      ${S.rewards.map((r, i) => `<tr><td><b style="color:var(--web-navy)">${r[0]}</b></td><td>${r[1].toLocaleString("es-MX")}</td><td class="nowrap"><button class="mini" onclick="APP.rewardDel(${i})">${I("x")} Quitar</button></td></tr>`).join("")}
      </tbody></table></div>`;
  }
  function paginas() {
    return `<div class="main-head"><div><h1>Páginas</h1><p>Contenido del sitio · datos de ejemplo</p></div><button class="btn btn-primary btn-sm" onclick="APP.editPage(-1)">${I("plus")} Nueva página</button></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Página</th><th>URL</th><th>Estado</th><th>Última edición</th><th></th></tr></thead><tbody>
      ${S.pages.map((p, i) => `<tr><td><b style="color:var(--web-navy)">${esc(p[0])}</b></td><td><code>${p[1]}</code></td><td><span class="state ${p[2] === "Publicada" ? "st-ok" : "st-draft"}">${p[2]}</span></td><td>${p[3]}</td><td class="nowrap"><button class="mini" onclick="APP.editPage(${i})">${I("pencil")} Editar</button></td></tr>`).join("")}
      </tbody></table></div>`;
  }
  /* Alumnos de ejemplo: [nombre, curso, avance %, calificación, intentos usados, último acceso, grupo] */
  const GB = [["MVZ Paola Ruiz", "oftalmologia", 100, 9.5, 1, "10/11/2026", 2], ["Dr. Andrés Salinas", "dermatoendocrino", 100, null, 1, "09/11/2026", 0], ["MVZ Diego Herrera", "inmunologia", 100, 8.7, 2, "05/11/2026", 2],
    ["MVZ Sofía Cárdenas", "diplomado-inmunologia", 42, null, 0, "21/10/2026", 0], ["MVZ Jorge Palacios", "oftalmologia", 15, null, 0, "12/10/2026", 2], ["MVZ Ana Lucía Torres", "kiroftal-2", 100, 9.0, 1, "08/11/2026", 1],
    ["MVZ Ricardo Ibarra", "diplomado-inmunologia", 67, null, 0, "10/11/2026", 1], ["MVZ Fernanda Ortiz", "oftalmologia", 54, null, 0, "03/11/2026", 0]];
  const INACT = ["21/10/2026", "12/10/2026"];
  const xk = (n, slug) => n.replace(" (tú)", "") + "|" + slug;
  /* Intentos por examen (0 = sin límite) más los intentos adicionales que autoriza la administración. */
  const maxAtt = (key, n = ME) => { const b = qcfg(key).intentos; return b ? b + (S.extra[xk(n, key)] || 0) : Infinity; };
  const gbRows = () => {
    const mine = COURSES.filter(c => acc(c.slug)).map(c => [ME, c.slug, Math.min(100, Math.round(S.enrolled[c.slug] / (c.lessons || 12) * 100)), S.grades[c.slug] ? notaFinal(c.slug) : null, S.attempts[c.slug] || 0, "11/11/2026", 1]);
    return [...mine, ...GB];
  };
  /* Intentos de examen de ejemplo de otros alumnos: [alumno, examen, intento, fecha, calificación, segundos]. */
  const QA_SEED = [["MVZ Paola Ruiz", "oftalmologia", 1, "10/11/2026", 9.5, 1610], ["Dr. Andrés Salinas", "dermatoendocrino", 1, "09/11/2026", 7.0, 1795],
    ["MVZ Diego Herrera", "inmunologia", 2, "05/11/2026", 8.7, 1488], ["MVZ Diego Herrera", "inmunologia", 1, "20/10/2026", 7.5, 1702], ["MVZ Ana Lucía Torres", "kiroftal-2", 1, "08/11/2026", 9.0, 1102]];
  const qaRows = () => {
    const mine = Object.entries(S.qa || {}).flatMap(([key, L]) => L.map(a => [ME, key, a.n, a.f, a.nota, a.t, a]));
    const seedMe = [[ME, "inmunologia", 1, "12/09/2026", 9.3, 1540]].filter(r => !(S.qa || {})[r[1]]);
    return [...mine, ...seedMe, ...QA_SEED].sort((a, b) => mx2iso(b[3]).localeCompare(mx2iso(a[3])));
  };
  const qaOk = r => r[4] * 10 >= qcfg(r[1]).aprobatoria;
  const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const gbState = r => r[3] ? ["Aprobado", "st-ok"] : INACT.includes(r[5]) ? ["Inactivo", "st-draft"] : r[4] >= maxAtt(r[1], r[0]) ? ["Sin intentos", "st-rev"] : ["En curso", "st-draft"];
  const ctitle = key => (courseBy(String(key).split("#")[0]) || { title: key }).title;
  const AUTOS = [["Recordatorio de avance", "Si el alumno lleva 7 días sin entrar a un curso", "Hola {nombre}, vas en {avance} de {curso}. Retoma donde te quedaste: {enlace}"],
    ["Examen pendiente", "Cuando terminó las lecciones y no ha presentado el examen", "Hola {nombre}, ya terminaste las lecciones de {curso}. Tu examen final está listo: {enlace}"],
    ["Resultado del examen", "Al calificar cada intento, con los intentos que le quedan", "Hola {nombre}, tu calificación en {curso} fue {calificación}. Te quedan {intentos} intentos."],
    ["Constancia emitida", "Al aprobar, con el enlace de descarga y verificación", "Felicidades, {nombre}. Tu constancia de {curso} ya está lista: {enlace}"],
    ["Vencimiento del diplomado", "7 días y 1 día antes de la fecha límite del grupo", "Hola {nombre}, tu diplomado {curso} vence el {fecha}. Te falta {pendiente}."],
    ["Recordatorio de webinar", "24 horas y 1 hora antes de la transmisión", "Hola {nombre}, el webinar {título} empieza {cuándo}. Entra desde tu panel: {enlace}"]];
  function adminAcademia(t) {
    const tabs = [["cursos", "book-open", "Cursos"], ["inscripciones", "badge-check", "Inscripciones"], ["alumnos", "users", "Alumnos y grupos"], ["calificaciones", "list-checks", "Calificaciones"], ["intentos", "history", "Intentos"], ["examenes", "clipboard-list", "Exámenes"], ["constancias", "award", "Constancias"], ["automatizaciones", "bell", "Automatizaciones"], ["reportes", "chart-column", "Reportes"], ["ajustes", "settings", "Ajustes"]];
    const pendN = enrList().filter(e => e.st === "pending").length;
    const head = `<div class="main-head"><div><h1>Academia</h1><p>Cursos, inscripciones, exámenes y reportes · alumnos de ejemplo</p></div>${t === "cursos" ? `<button class="btn btn-primary btn-sm" onclick="APP.courseNew()">${I("plus")} Nuevo curso</button>` : t === "inscripciones" ? `<button class="btn btn-primary btn-sm" onclick="APP.enrNew()">${I("plus")} Inscribir alumnos</button>` : ""}</div>
      <div class="atabs">${tabs.map(x => `<a class="${t === x[0] ? "on" : ""}" href="#/admin/academia/${x[0]}">${I(x[1])}<span>${x[2]}</span>${x[0] === "inscripciones" && pendN ? `<span class="ct">${pendN}</span>` : ""}</a>`).join("")}</div>`;
    const sel = (id, label, opts, val, fn) => `<label class="l" for="${id}">${label}</label><select class="input" id="${id}" onchange="${fn}">${opts.map(o => `<option value="${esc(o[0])}" ${String(val) === String(o[0]) ? "selected" : ""}>${o[1]}</option>`).join("")}</select>`;
    const FECHAS = [["", "Cualquier fecha"], ["7", "Últimos 7 días"], ["30", "Últimos 30 días"], ["anio", "Este año"]];
    const COPTS = [["", "Todos los cursos"], ...COURSES.map(c => [c.slug, c.title])];
    const srch = (fn, val, ph) => `<form class="srch" onsubmit="event.preventDefault();${fn}(this.q.value)"><input class="input" name="q" value="${esc(val || "")}" placeholder="${ph}" aria-label="${ph}"><button class="icon-btn" aria-label="Buscar">${I("search")}</button></form>`;
    let body = "";
    if (t === "inscripciones") {
      const F = Object.assign({ s: "", st: "", q: "", f: "" }, S.enrF || {});
      const rows = enrList().filter(e => (!F.s || e.s === F.s) && (!F.st || e.st === F.st) && (!F.q || (e.u + " " + stuMail(e.u)).toLowerCase().includes(F.q.toLowerCase())) && enRango(e.f, F.f));
      const selE = window.__selE || (window.__selE = new Set());
      const cnt = k => enrList().filter(e => e.st === k).length;
      body = `<div class="kpis kpis-3">${[["approved", "Aprobadas", "Dan acceso al curso"], ["pending", "Pendientes", "Solicitudes por revisar"], ["cancelled", "Canceladas", "Sin acceso; las constancias se conservan"]].map(k => `<button class="kpi kpi-btn ${F.st === k[0] ? "on" : ""}" onclick="APP.enrF('st','${F.st === k[0] ? "" : k[0]}')"><small>${k[1]}</small><b>${cnt(k[0])}</b><span class="trend">${k[2]}</span></button>`).join("")}</div>
        <div class="tool-row">${sel("ef1", "Curso", COPTS, F.s, "APP.enrF('s',this.value)")}${sel("ef2", "Estado", [["", "Todos"], ["approved", "Aprobadas"], ["pending", "Pendientes"], ["cancelled", "Canceladas"]], F.st, "APP.enrF('st',this.value)")}${sel("ef3", "Fecha", FECHAS, F.f, "APP.enrF('f',this.value)")}<span class="grow"></span>${srch("APP.enrQ", F.q, "Buscar alumno o correo")}</div>
        <div class="bulk" id="bulkE"><label class="ce-chk"><input type="checkbox" id="selAllE" onchange="APP.enrAll(this.checked)"> <span>Seleccionar los ${rows.length} resultados</span></label><span class="bulk-n" id="selNE">${selE.size ? selE.size + " seleccionadas" : "Ninguna seleccionada"}</span><span class="grow"></span><button class="btn btn-primary btn-sm" onclick="APP.enrBulk('approved')">${I("check")} Aprobar</button><button class="btn btn-ghost btn-sm" onclick="APP.enrBulk('cancelled')">${I("x")} Cancelar</button></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="chk"><span class="sr">Seleccionar</span></th><th>Alumno</th><th>Curso</th><th>Fecha</th><th>Estado</th><th>Inscrito por</th><th></th></tr></thead><tbody>
        ${rows.map(e => `<tr><td class="chk"><input type="checkbox" aria-label="Seleccionar a ${esc(e.u)}" ${selE.has(e.id) ? "checked" : ""} onchange="APP.enrSel(${e.id},this.checked)"></td><td><b style="color:var(--web-navy)" data-notr>${esc(e.u)}</b><small style="display:block;color:var(--muted)" data-notr>${esc(stuMail(e.u))}</small></td><td>${ctitle(e.s)}</td><td class="nowrap">${e.f}</td><td><span class="state ${EST[e.st][1]}">${EST[e.st][0]}</span></td><td>${e.por}</td><td class="nowrap">${e.st !== "approved" ? `<button class="mini" onclick="APP.enrSet(${e.id},'approved')">${I("check")} Aprobar</button>` : ""}${e.st !== "cancelled" ? ` <button class="mini" onclick="APP.enrSet(${e.id},'cancelled')">${I("x")} Cancelar</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="7" style="color:var(--muted)">No hay inscripciones con esos filtros.</td></tr>`}
        </tbody></table></div>
        <div class="notice" style="margin-top:16px">${I("info")}<span>La inscripción es el único control de acceso: no hay cobro en línea y el precio del curso no interviene. Solo una inscripción aprobada abre el curso. Al cancelarla, el médico pierde el acceso al contenido, pero conserva sus constancias emitidas. En la plataforma, las acciones en lote se procesan en segundo plano para miles de registros.</span></div>`;
    } else if (t === "intentos") {
      const F = Object.assign({ s: "", q: "", f: "" }, S.qaF || {});
      const all = qaRows(), rows = all.filter(r => (!F.s || r[1].split("#")[0] === F.s) && (!F.q || r[0].toLowerCase().includes(F.q.toLowerCase())) && enRango(r[3], F.f));
      body = `<div class="tool-row">${sel("qf1", "Curso", COPTS, F.s, "APP.qaF('s',this.value)")}${sel("qf2", "Fecha", FECHAS, F.f, "APP.qaF('f',this.value)")}<span class="grow"></span>${srch("APP.qaQ", F.q, "Buscar alumno")}</div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Alumno</th><th>Curso</th><th>Examen</th><th>Intento</th><th>Fecha</th><th>Calificación</th><th>Tiempo usado</th><th>Resultado</th><th></th></tr></thead><tbody>
        ${rows.map(r => { const i = all.indexOf(r), s = r[1]; return `<tr><td><b style="color:var(--web-navy)" data-notr>${esc(r[0])}</b></td><td>${ctitle(s)}</td><td>Examen final</td><td>${r[2]}</td><td class="nowrap">${r[3]}</td><td>${r[4].toFixed(1)}</td><td>${mmss(r[5])}</td><td><span class="state ${qaOk(r) ? "st-ok" : "st-rev"}">${qaOk(r) ? "Aprobado" : "No aprobado"}</span></td><td class="nowrap"><button class="mini" onclick="APP.qaView(${i})">${I("eye")} Ver respuestas</button></td></tr>`; }).join("") || `<tr><td colspan="9" style="color:var(--muted)">No hay intentos con esos filtros.</td></tr>`}
        </tbody></table></div>
        <div class="notice" style="margin-top:16px">${I("shield-check")}<span>El detalle de respuestas solo lo ve la administración. El alumno ve únicamente su calificación final.</span></div>`;
    } else if (t === "calificaciones") {
      const f = S.gbFilter || "Todos", rows = gbRows().filter(r => f === "Todos" || r[1] === f);
      body = `<div class="tool-row"><label class="l" for="gbf">Curso</label><select class="input" id="gbf" onchange="APP.gbFilter(this.value)"><option value="Todos">Todos los cursos</option>${COURSES.map(c => `<option value="${c.slug}" ${f === c.slug ? "selected" : ""}>${c.title}</option>`).join("")}</select><span class="grow"></span><button class="btn btn-ghost btn-sm" onclick="APP.report('alumno','xls')">${I("file-spreadsheet")} Exportar a Excel</button></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Alumno</th><th>Curso</th><th>Avance</th><th>Calificación</th><th>Intentos del examen final</th><th>Último acceso</th><th>Estado</th><th></th></tr></thead><tbody>
        ${rows.map(r => { const st = gbState(r), gi = gbRows().indexOf(r); return `<tr><td><b style="color:var(--web-navy)">${r[0]}</b></td><td>${ctitle(r[1])}</td><td><div class="progress" style="width:90px"><i style="width:${r[2]}%"></i></div><small style="color:var(--muted)">${r[2]}%</small></td><td>${r[3] ? r[3].toFixed(1) : "—"}</td><td>${attTxt(r[4], maxAtt(r[1], r[0]))}</td><td>${r[5]}</td><td><span class="state ${st[1]}">${st[0]}</span></td><td class="nowrap"><button class="mini" onclick="APP.history(${gi})">${I("history")} Historial</button></td></tr>`; }).join("")}
        </tbody></table></div>
        <div class="notice" style="margin-top:16px">${I("info")}<span>El libro de calificaciones se llena solo: cada lección vista, cada intento de examen y cada constancia queda en el historial del alumno.</span></div>`;
    } else if (t === "alumnos") {
      const F = Object.assign({ s: "", f: "", o: "recientes", q: "" }, S.stuF || {});
      const nCur = u => enrList().filter(e => e.u === u && e.st === "approved").length;
      let rows = STUDENTS.filter(s => (!F.s || enrList().some(e => e.u === s[0] && e.s === F.s && e.st === "approved")) && (!F.q || (s[0] + " " + s[1]).toLowerCase().includes(F.q.toLowerCase())) && enRango(s[2], F.f));
      rows = rows.slice().sort((a, b) => F.o === "nombre" ? a[0].replace(/^(MVZ|Dra?\.)\s/, "").localeCompare(b[0].replace(/^(MVZ|Dra?\.)\s/, ""), "es") : F.o === "cursos" ? nCur(b[0]) - nCur(a[0]) : mx2iso(b[2]).localeCompare(mx2iso(a[2])));
      body = `<h3 style="margin:0 0 14px;font-size:22px">Alumnos registrados</h3>
        <div class="tool-row">${sel("sf1", "Curso", COPTS, F.s, "APP.stuF('s',this.value)")}${sel("sf2", "Registro", FECHAS, F.f, "APP.stuF('f',this.value)")}${sel("sf3", "Orden", [["recientes", "Más recientes"], ["nombre", "Nombre (A-Z)"], ["cursos", "Más cursos"]], F.o, "APP.stuF('o',this.value)")}<span class="grow"></span>${srch("APP.stuQ", F.q, "Buscar nombre o correo")}</div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nombre</th><th>Correo</th><th>Fecha de registro</th><th>Cursos inscritos</th><th></th></tr></thead><tbody>
        ${rows.map(s => `<tr><td><b style="color:var(--web-navy)" data-notr>${esc(s[0])}</b></td><td data-notr>${esc(s[1])}</td><td class="nowrap">${s[2]}</td><td>${nCur(s[0])}</td><td class="nowrap"><button class="mini" onclick="APP.enrNew(${STUDENTS.indexOf(s)})">${I("plus")} Inscribir a un curso</button></td></tr>`).join("") || `<tr><td colspan="5" style="color:var(--muted)">No hay alumnos con esos filtros.</td></tr>`}
        </tbody></table></div>
        <div class="two" style="margin-top:28px">
          <div class="panel"><h3>Inscripción masiva</h3><p class="sub">Sube la lista de alumnos en Excel o CSV y se inscriben de una vez</p>
            <div class="seg" style="flex-wrap:wrap"><button class="btn btn-primary btn-sm" onclick="APP.importOpen()">${I("upload")} Importar Excel o CSV</button><button class="btn btn-ghost btn-sm" onclick="APP.template()">${I("download")} Descargar plantilla</button></div>
            <p style="font-size:12.5px;color:var(--muted);margin-top:12px">Columnas: nombre, correo, WhatsApp, cédula y grupo. Los correos repetidos se omiten.</p></div>
          <div class="panel"><h3>Nuevo grupo</h3><p class="sub">Agrupa alumnos para asignarles un diplomado con fecha límite</p>
            <form onsubmit="return APP.groupAdd(event)"><div class="form-row"><label class="l" for="gn">Nombre del grupo</label><input class="input" id="gn" required placeholder="Ej. Clínica Veterinaria del Valle"></div><button class="btn btn-primary btn-block" type="submit">${I("plus")} Crear grupo</button></form></div>
        </div>
        <h3 style="margin:28px 0 14px;font-size:22px">Grupos</h3>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Grupo</th><th>Alumnos</th><th>Curso asignado</th><th>Vence</th><th>Avance promedio</th><th></th></tr></thead><tbody>
        ${S.groups.map((g, i) => `<tr><td><b style="color:var(--web-navy)">${esc(g[0])}</b></td><td>${g[1]}</td><td>${g[2] ? ctitle(g[2]) : "—"}</td><td>${g[3] || "—"}</td><td><div class="progress" style="width:90px"><i style="width:${g[4]}%"></i></div><small style="color:var(--muted)">${g[4]}%</small></td><td class="nowrap"><button class="mini" onclick="APP.groupAssign(${i})">${I("graduation-cap")} Asignar</button> <button class="mini" onclick="APP.groupView(${i})">${I("eye")} Ver grupo</button></td></tr>`).join("")}
        </tbody></table></div>`;
    } else if (t === "examenes") {
      body = `<div class="notice" style="margin-bottom:18px">${I("info")}<span>Cada curso tiene un solo examen, al final. Cada examen define sus reglas: intentos, calificación aprobatoria y tiempo límite; no hay una regla global de intentos. La constancia se emite solo con todas las lecciones terminadas y el examen aprobado. El tiempo límite se valida en el servidor.</span></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Curso</th><th>Intentos</th><th>Aprobatoria</th><th>Tiempo límite</th><th>Presentación</th><th>Nota final</th><th></th></tr></thead><tbody>
        ${COURSES.map(c => { const q = qcfg(c.slug); return `<tr><td><b style="color:var(--web-navy)">${c.title}</b></td><td>${q.intentos || "Sin límite"}</td><td class="nowrap">${q.aprobatoria} %</td><td class="nowrap">${q.tiempo ? q.tiempo + " min" : "Sin límite"}</td><td>${LAYOUT[q.layout]}</td><td>${CALC[q.calculo]}</td><td class="nowrap"><button class="mini" onclick="APP.qcfgOpen('${c.slug}')">${I("settings")} Configurar</button></td></tr>`; }).join("")}
        </tbody></table></div>
        <div class="two" style="margin-top:24px">
          <div class="panel"><h3>Recuperación de intentos</h3><p class="sub">Alumnos que agotaron sus intentos y piden uno más</p>
            ${S.recoveries.length ? S.recoveries.map((r, i) => `<div class="list-row"><span class="lr-ico">${I("rotate-ccw")}</span><div><b>${r[0]}</b><small>${ctitle(r[1])}</small></div><span class="end">${r[2] === "pendiente" ? `<button class="mini" onclick="APP.recovery(${i},false)">Rechazar</button> <button class="btn btn-primary btn-sm" onclick="APP.recovery(${i},true)">Autorizar</button>` : `<span class="state ${r[2] === "autorizado" ? "st-ok" : "st-draft"}">${r[2] === "autorizado" ? "Autorizado" : "Rechazado"}</span>`}</span></div>`).join("") : `<p class="sub">Sin solicitudes.</p>`}
          </div>
          <div class="panel"><h3>Lo que ve el alumno</h3><p class="sub">Ajuste global de la academia</p><div class="list-row"><span class="lr-ico">${I("eye")}</span><div><b>${gs().ocultar ? "Solo su calificación final" : "Su calificación y el detalle de respuestas"}</b><small>Se cambia en Ajustes</small></div><span class="end"><a class="mini" href="#/admin/academia/ajustes">${I("settings")} Ajustes</a></span></div></div>
        </div>
        <div class="main-head" style="margin-top:28px"><div><h3 style="font-size:22px">Banco de preguntas</h3><p>Se reutilizan entre exámenes · preguntas de ejemplo</p></div><button class="btn btn-primary btn-sm" onclick="APP.qNew()">${I("plus")} Nueva pregunta</button></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Pregunta</th><th>Tipo</th><th>Tema</th><th>Usada en</th></tr></thead><tbody>
        ${S.bank.map(q => `<tr><td>${esc(q[0])}</td><td><span class="badge badge-soft">${q[1]}</span></td><td>${q[2]}</td><td>${q[3] === 1 ? "1 examen" : q[3] + " exámenes"}</td></tr>`).join("")}
        </tbody></table></div>`;
    } else if (t === "constancias") {
      const L = certList(), ei = S.certEdit === undefined || !L[S.certEdit] ? 0 : S.certEdit, te = L[ei];
      const cv = S.certVar && te.vars[S.certVar] ? S.certVar : "nombre";
      body = `<div class="notice" style="margin-bottom:18px">${I("shield-check")}<span>Una constancia emitida es un registro propio con folio y QR: no cambia ni desaparece aunque edites la plantilla o el curso deje de publicarse. Los cambios de plantilla aplican a las constancias nuevas.</span></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Plantilla</th><th>Cursos asociados</th><th>Estado</th><th></th></tr></thead><tbody>
        ${L.map((x, i) => `<tr class="${i === ei ? "row-on" : ""}"><td><b style="color:var(--web-navy)" data-notr>${esc(x.nombre)}</b></td><td>${x.cursos.length || "—"}</td><td><span class="state ${x.estado === "published" ? "st-ok" : "st-draft"}">${x.estado === "published" ? "Publicada" : "Borrador"}</span></td><td class="nowrap"><button class="mini" onclick="APP.certPick(${i})">${I("pencil")} Editar</button></td></tr>`).join("")}
        </tbody></table></div>
        <div class="main-head" style="margin-top:28px"><div><h3 style="font-size:22px" data-notr>${esc(te.nombre)}</h3><p>Arrastra cada dato a su lugar sobre la imagen base</p></div><div class="ce-actions"><button class="btn btn-ghost btn-sm" onclick="APP.certPreview(${ei})">${I("eye")} Vista previa</button><button class="btn btn-primary btn-sm" onclick="APP.certNew()">${I("plus")} Nueva plantilla</button></div></div>
        <div class="cert-ed">
          <div>${certSheet(te, { nombre: "Laura Méndez", curso: "Nombre del curso o diplomado", fecha: hoyMx(), folio: "KI-2026-000000" }, true)}
            <p class="ce-hint" style="margin-top:10px">${I("info")} Datos de ejemplo. Al emitirse, cada constancia toma el nombre del alumno, el curso, la fecha y su folio. También puedes mover el dato seleccionado con las flechas del teclado.</p></div>
          <div class="panel cert-side">
            <div class="form-row"><label class="l" for="ctN">Nombre de la plantilla</label><input class="input" id="ctN" maxlength="80" value="${esc(te.nombre)}" onchange="APP.certSet(${ei},'nombre',this.value)" data-notr></div>
            <div class="form-row"><label class="l">Imagen base</label>${certBg(te.id) ? `<div class="ce-file">${I("file-check")}<div><b>Imagen cargada</b><small>JPG o PNG del equipo de diseño</small></div><label class="mini ce-repl">${I("upload")} Reemplazar<input type="file" accept="image/jpeg,image/png" hidden onchange="APP.certImg(${ei},this)"></label></div><button class="mini" onclick="APP.certImgDel(${ei})">${I("trash")} Quitar imagen</button>` : `<label class="ce-drop">${I("upload")}<b>Sube la imagen del diseño</b><small>JPG o PNG horizontal, hasta 3 MB</small><input type="file" accept="image/jpeg,image/png" hidden onchange="APP.certImg(${ei},this)"></label>`}</div>
            <fieldset class="ce-opts"><legend>Datos en la constancia</legend>${Object.keys(CVARS).map(k => `<label class="ce-chk"><input type="checkbox" ${te.vars[k].on ? "checked" : ""} onchange="APP.certVarOn(${ei},'${k}',this.checked)"> ${CVARS[k]}</label>`).join("")}</fieldset>
            <div class="form-row" style="margin-top:14px"><label class="l" for="ctS">Tamaño · ${CVARS[cv]}</label><input id="ctS" type="range" min="${cv === "qr" ? 50 : 9}" max="${cv === "qr" ? 160 : 72}" value="${te.vars[cv].size}" oninput="APP.certSize(${ei},'${cv}',+this.value)"></div>
            <fieldset class="ce-opts"><legend>Cursos que la usan</legend><div class="cert-courses">${COURSES.map(c => `<label class="ce-chk"><input type="checkbox" ${te.cursos.includes(c.slug) ? "checked" : ""} onchange="APP.certCourse(${ei},'${c.slug}',this.checked)"> <span>${c.title}</span></label>`).join("")}</div></fieldset>
            <div class="form-row" style="margin-top:14px"><label class="l" for="ctE">Estado</label><select class="input" id="ctE" onchange="APP.certSet(${ei},'estado',this.value)"><option value="draft" ${te.estado === "draft" ? "selected" : ""}>Borrador</option><option value="published" ${te.estado === "published" ? "selected" : ""}>Publicada</option></select></div>
            <p class="ce-hint">${I("info")} Un curso usa una sola plantilla publicada. Si asocias un curso aquí, se quita de las demás.</p>
          </div>
        </div>`;
    } else if (t === "automatizaciones") {
      body = `<div class="notice" style="margin-bottom:18px">${I("info")}<span>Los avisos salen solos por correo y como notificación en el panel del médico. WhatsApp se queda como botón de contacto en el sitio.</span></div>
        <div class="auto-list">${AUTOS.map((a, i) => { const st = S.autos[i]; return `<div class="panel auto ${st[0] ? "" : "off"}"><div class="auto-h"><div><b>${a[0]}</b><small>${a[1]}</small></div><button class="switch ${st[0] ? "on" : ""}" role="switch" aria-checked="${st[0]}" aria-label="Activar ${a[0]}" onclick="APP.autoToggle(${i},0)"><i></i></button></div>
          <div class="auto-f"><button class="chip-t ${st[1] ? "on" : ""}" onclick="APP.autoToggle(${i},1)">${I("mail")} Correo</button><button class="chip-t ${st[2] ? "on" : ""}" onclick="APP.autoToggle(${i},2)">${I("bell")} Aviso en el panel</button><span class="grow"></span><button class="mini" onclick="APP.autoPreview(${i})">${I("eye")} Ver mensaje</button></div></div>`; }).join("")}</div>`;
    } else if (t === "reportes") {
      const g = gbRows(), E = enrList().filter(e => e.st === "approved"), QA = qaRows();
      const per = COURSES.map(c => { const ins = E.filter(e => e.s === c.slug).length, r = g.filter(x => x[1] === c.slug), fin = r.filter(x => x[3] && x[2] >= 100), gr = r.filter(x => x[3]); return { c, ins, fin: fin.length, tasa: ins ? Math.round(fin.length / ins * 100) : 0, prom: gr.length ? gr.reduce((s, x) => s + x[3], 0) / gr.length : null, cert: fin.length + (c.slug === "inmunologia" ? 1 : 0) }; }).filter(x => x.ins);
      const tIns = per.reduce((s, x) => s + x.ins, 0), tFin = per.reduce((s, x) => s + x.fin, 0), grd = g.filter(x => x[3]);
      const act = g.filter(x => !INACT.includes(x[5])).length, inact = g.length - act;
      const months = ["03", "04", "05", "06", "07", "08", "09", "10", "11"].map(m => [m, enrList().filter(e => e.f.slice(3) === m + "/2026").length]);
      const mmax = Math.max(1, ...months.map(m => m[1])), MN = { "03": "Mar", "04": "Abr", "05": "May", "06": "Jun", "07": "Jul", "08": "Ago", "09": "Sep", "10": "Oct", "11": "Nov" };
      const byQ = {}; QA.forEach(r => { (byQ[r[1]] = byQ[r[1]] || []).push(r[4]); });
      const R = [["alumno", "user", "Por alumno", "Avance, calificaciones e intentos de cada alumno"], ["curso", "book-open", "Por curso", "Inscritos, aprobados y calificación promedio por curso"], ["instructor", "graduation-cap", "Por instructor", "Cursos, alumnos y calificación promedio por instructor"], ["avance", "trending-up", "Avance", "Porcentaje de avance por alumno y curso"], ["inactividad", "user-x", "Inactividad", "Alumnos sin entrar en los últimos 15 días"]];
      body = `<div class="kpis">${[["Tasa de finalización", (tIns ? Math.round(tFin / tIns * 100) : 0) + " %", "Terminaron / inscripciones aprobadas"], ["Calificación promedio", grd.length ? (grd.reduce((s, x) => s + x[3], 0) / grd.length).toFixed(1) : "—", "Examen final"], ["Activos / inactivos", act + " / " + inact, "Según su última lección vista"], ["Constancias emitidas", String(per.reduce((s, x) => s + x.cert, 0)), "Cursos y diplomados"]].map(k => `<div class="kpi"><small>${k[0]}</small><b>${k[1]}</b><span class="trend">${k[2]}</span></div>`).join("")}</div>
        <div class="two" style="margin-top:0">
          <div class="panel"><h3>Inscripciones por mes</h3><p class="sub">2026 · inscripciones registradas</p><div class="bars">${months.map(m => `<div style="height:${Math.max(4, m[1] / mmax * 100)}%" tabindex="0" title="${MN[m[0]]}: ${m[1]}"><em>${m[1]}</em><span>${MN[m[0]]}</span></div>`).join("")}</div><div style="height:26px"></div></div>
          <div class="panel"><h3>Promedio por examen</h3><p class="sub">Todos los intentos registrados</p>${Object.entries(byQ).slice(0, 7).map(([k, a]) => { const [s, m] = k.split("#"); return `<div class="list-row"><span class="lr-ico">${I("clipboard-list")}</span><div><b>${(courseBy(s) || {}).title || s}</b><small>Examen final · ${a.length === 1 ? "1 intento" : a.length + " intentos"}</small></div><span class="end"><b>${(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1)}</b></span></div>`; }).join("")}</div>
        </div>
        <h3 style="margin:28px 0 14px;font-size:22px">Por curso</h3>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Curso</th><th>Inscripciones aprobadas</th><th>Terminaron</th><th>Tasa de finalización</th><th>Calificación promedio</th><th>Constancias emitidas</th></tr></thead><tbody>
        ${per.map(x => `<tr><td><b style="color:var(--web-navy)">${x.c.title}</b></td><td>${x.ins}</td><td>${x.fin}</td><td><div class="progress" style="width:90px"><i style="width:${x.tasa}%"></i></div><small style="color:var(--muted)">${x.tasa}%</small></td><td>${x.prom ? x.prom.toFixed(1) : "—"}</td><td>${x.cert}</td></tr>`).join("")}
        </tbody></table></div>
        <h3 style="margin:28px 0 14px;font-size:22px">Descargas</h3>
        <div class="tool-row"><label class="l" for="rf1">Curso</label><select class="input" id="rf1"><option>Todos los cursos</option>${COURSES.map(c => `<option>${c.title}</option>`).join("")}</select><label class="l" for="rf2">Grupo</label><select class="input" id="rf2"><option>Todos los grupos</option>${S.groups.map(g => `<option>${esc(g[0])}</option>`).join("")}</select></div>
        <div class="grid-p three rep-grid">${R.map(r => `<div class="panel"><span class="lr-ico">${I(r[1])}</span><h3 style="margin-top:12px">${r[2]}</h3><p class="sub">${r[3]}</p><div class="seg" style="flex-wrap:wrap"><button class="btn btn-primary btn-sm" onclick="APP.report('${r[0]}','xls')">${I("file-spreadsheet")} Excel</button><button class="btn btn-ghost btn-sm" onclick="APP.report('${r[0]}','csv')">${I("download")} CSV</button></div></div>`).join("")}</div>`;
    } else if (t === "ajustes") {
      const G = gs();
      const sw = (k, title, desc) => `<div class="set-row"><div><b>${title}</b><small>${desc}</small></div><button class="switch ${G[k] ? "on" : ""}" role="switch" aria-checked="${!!G[k]}" aria-label="${title}" onclick="APP.gsSet('${k}',${!G[k]})"><i></i></button></div>`;
      body = `<div class="notice" style="margin-bottom:18px">${I("info")}<span>Estos ajustes aplican a todos los cursos por igual. No hay configuración por curso.</span></div>
        <div class="panel set-list">
          <div class="set-row"><div><b>Modo de finalización</b><small>Siempre estricto. La constancia se emite solo si el alumno vio todas las lecciones al 100 % y aprobó el examen final. Si termina las lecciones y reprueba el examen, no hay constancia.</small></div><span class="badge badge-ok">${I("lock")} Estricto</span></div>
          <div class="set-row"><div><b>Avance de lección</b><small>La lección se completa sola al reproducir el 100 % del video. El alumno no puede marcarla a mano y no existe ninguna función que lo permita.</small></div><span class="badge badge-ok">${I("lock")} 100 % del video</span></div>
          ${sw("enfoque", "Modo enfoque", "Oculta el menú y el pie de página mientras el alumno toma la lección.")}
          ${sw("resumen", "Resumen del contenido", "Muestra el temario resumido en la página del curso antes de inscribirse.")}
          ${sw("adminSinInsc", "Acceso de administradores sin inscripción", "El equipo puede recorrer cualquier curso sin inscribirse. No se guarda avance.")}
          ${sw("login", "Ver cursos solo con sesión iniciada", "Si está activo, el temario y los detalles del curso se ven solo con cuenta.")}
          ${sw("expira", "Expiración de la inscripción", "Si está activo, la inscripción vence en la fecha límite del grupo al que pertenece el alumno.")}
          ${sw("ocultar", "Ocultar al alumno el detalle de sus intentos", "El alumno ve solo su calificación final, nunca qué preguntas acertó o falló ni las respuestas correctas.")}
        </div>`;
    } else {
      const F = Object.assign({ st: "todos", cat: "", q: "", f: "" }, S.crsF || {});
      const all = crsRows(), selC = window.__selC || (window.__selC = new Set());
      const rows = all.filter(r => (F.st === "todos" ? r.estado !== "papelera" : r.estado === F.st) && (!F.cat || r.cat === F.cat) && (!F.q || r.titulo.toLowerCase().includes(F.q.toLowerCase())) && enRango(r.fecha, F.f));
      const cnt = k => all.filter(r => k === "todos" ? r.estado !== "papelera" : r.estado === k).length;
      const cats = [...new Set(all.map(r => r.cat).filter(Boolean))];
      body = `<div class="pills">${[["todos", "Todos"], ...Object.entries(CSTATES).map(([k, v]) => [k, v === "Publicado" ? "Publicados" : v === "Borrador" ? "Borradores" : v === "Programado" ? "Programados" : v === "Privado" ? "Privados" : "Papelera"])].map(([k, v]) => `<button class="${F.st === k ? "on" : ""}" onclick="APP.crsF('st','${k}')">${v} <em>${cnt(k)}</em></button>`).join("")}</div>
        <div class="tool-row">${sel("cf1", "Categoría", [["", "Todas"], ...cats.map(x => [x, x])], F.cat, "APP.crsF('cat',this.value)")}${sel("cf2", "Fecha", FECHAS, F.f, "APP.crsF('f',this.value)")}<span class="grow"></span>${srch("APP.crsQ", F.q, "Buscar curso")}</div>
        <div class="bulk"><label class="ce-chk"><input type="checkbox" onchange="APP.crsAll(this.checked)"> <span>Seleccionar los ${rows.length} resultados</span></label><span class="bulk-n" id="selNC">${selC.size ? selC.size + " seleccionados" : "Ninguno seleccionado"}</span><span class="grow"></span>
          <label class="sr" for="cba">Acción en lote</label><select class="input" id="cba"><option value="publicado">Publicar</option><option value="borrador">Pasar a borrador</option><option value="privado">Hacer privado</option><option value="papelera">Mover a la papelera</option><option value="borrador">Restaurar de la papelera</option></select><button class="btn btn-primary btn-sm" onclick="APP.crsBulk()">Aplicar</button></div>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th class="chk"><span class="sr">Seleccionar</span></th><th>Curso</th><th>Módulos</th><th>Lecciones</th><th>Precio</th><th>Fecha</th><th>Estado</th><th></th></tr></thead><tbody>
        ${rows.map(r => `<tr><td class="chk"><input type="checkbox" aria-label="Seleccionar curso" ${selC.has(r.key) ? "checked" : ""} onchange="APP.crsSel('${r.key}',this.checked)"></td><td><a href="${r.href}"><b ${r.nuevo ? "data-notr" : ""}>${esc(r.titulo)}</b></a><small style="display:block;color:var(--muted)">${r.cat || "—"} · ${r.autor ? `<span data-notr>${esc(r.autor)}</span>` : "Autor sin capturar"}</small></td><td>${r.temas}</td><td>${r.lecciones}</td><td class="nowrap">${r.oferta ? `${money(r.oferta)}${r.regular > r.oferta ? `<small style="display:block;color:var(--muted)"><s>${money(r.regular)}</s></small>` : ""}` : "Gratuito"}</td><td class="nowrap">${r.fecha}</td><td><span class="state ${CST_CLS[r.estado]}">${CSTATES[r.estado]}</span></td><td class="nowrap">${r.nuevo ? `<a class="mini" href="${r.href}">${I("pencil")} Editar</a>` : `<a class="mini" href="${r.href}">${I("eye")} Ver</a> <button class="mini" onclick="APP.qcfgOpen('${r.key.slice(2)}')">${I("settings")} Examen</button>`}</td></tr>`).join("") || `<tr><td colspan="8" style="color:var(--muted)">No hay cursos con esos filtros.</td></tr>`}
        </tbody></table></div>
        <p style="font-size:12.5px;color:var(--muted);margin-top:12px">El precio se muestra en la página del curso como referencia; no se cobra en línea ni da acceso. El acceso lo da la inscripción aprobada. Un curso en borrador, privado o en la papelera deja de verse en la academia, pero las constancias que ya emitió se conservan.</p>`;
    }
    return head + body;
  }
  const crsRows = () => [
    ...(S.newCourses || []).map((c, ci) => { ceNorm(c); const st = ceStats(c); return { key: "n:" + ci, titulo: c.titulo, autor: c.instructor, cat: c.categoria, temas: st.modulos, lecciones: st.lecciones, regular: c.precioRegular || 0, oferta: c.precio || 0, fecha: c.fecha, estado: c.estado, href: ceHref(ci, 0, 0), nuevo: true }; }),
    ...COURSES.map(c => ({ key: "s:" + c.slug, titulo: c.title, autor: "", cat: c.cat, temas: mods(c).length || 1, lecciones: Math.max((c.lessons || 12) - 1, 0), regular: c.was || c.price || 0, oferta: c.price || 0, fecha: cFecha(c), estado: cstate(c.slug), href: "#/academia/curso/" + c.slug }))];

  /* ---------- Router ---------- */
  function route() {
    const raw = location.hash.replace(/^#/, "") || "/";
    const [path0, qs] = raw.split("?");
    const path = path0.replace(/^\/consultorio/, "/panel");
    const params = new URLSearchParams(qs || "");
    const seg = path.split("/").filter(Boolean).map(decodeURIComponent);
    let html = "", appMode = false; focusNow = false;
    if ((seg[0] === "panel" && !S.logged) || (seg[0] === "admin" && S.logged !== "admin")) { S.logged = seg[0] === "admin" ? "admin" : "mvz"; save(); }
    if (!seg.length) html = home();
    else if (seg[0] === "productos") html = productos(params);
    else if (seg[0] === "producto") html = producto(seg[1]);
    else if (seg[0] === "academia" && seg[1] === "curso") html = curso(seg[2]);
    else if (seg[0] === "academia") html = academia(params);
    else if (seg[0] === "verificar") html = verificar(seg[1]);
    else if (seg[0] === "legal") html = legal(seg[1]);
    else if (seg[0] === "farmacovigilancia") html = farmaco(params);
    else if (seg[0] === "videoteca" || seg[0] === "videoteca-pets") html = videoteca(params.get("tab") || "productos");
    else if (seg[0] === "recetas-cuantificadas") html = recetas();
    else if (seg[0] === "distribuidores-mexico" || (seg[0] === "distribuidores" && seg[1] !== "mundo")) html = distribuidores("mx");
    else if (seg[0] === "distribuidores-mundo" || seg[0] === "distribuidores") html = distribuidores("mundo");
    else if (seg[0] === "representantes" || seg[0] === "donde-comprar") html = representantes();
    else if (seg[0] === "webinar") html = webinarLanding(seg[1] || "proximo");
    else if (seg[0] === "panel") { html = panel(seg[1] || ""); appMode = true; }
    else if (seg[0] === "admin") { html = admin(seg[1] || "", seg[2] || "", seg.slice(3)); appMode = true; }
    else html = notFound();
    const focus = focusNow && seg[0] === "academia";
    $("#app").innerHTML = (focus ? `<div class="focus-bar"><div class="wrap"><a href="#/academia">${I("arrow-left")} Salir del curso</a><img src="assets/img/kiron-logo.png" alt="Kirón" width="62" height="36"><span class="fb-note">Modo enfoque</span></div></div>` : header(path)) + `<div id="view" class="page-enter ${focus ? "is-focus" : ""}">${html}</div>` + (appMode || focus ? "" : footer());
    clearInterval(window.__wT); window.__wT = null;
    if (!params.get("sec")) { window.scrollTo(0, 0); if (lenis) lenis.scrollTo(0, { immediate: true }); }
    if (seg[0] === "productos") {
      renderGrid(); $$(".filters input").forEach(r => r.onchange = () => { S.cat = r.value; renderGrid(); });
      $("#q").oninput = e => { S.q = e.target.value; renderGrid(); };
      if (params.has("focus")) setTimeout(() => $("#q").focus(), 200);
    }
    window.__hc = 0; heroAuto();
    countdown(); hdrShadow(); reveal(document); counters(); save(); renderBot(); bindCertDrag();
    if (seg[0] === "admin" && !seg[1] && !reduced && window.gsap) gsap.from("#bars div", { scaleY: 0, transformOrigin: "bottom", duration: .8, stagger: .06, ease: "power3.out" });
    $$("video").forEach(v => { v.muted = true; const p = v.play(); if (p) p.catch(() => {}); });
    document.title = (seg.length ? ({ productos: "Productos", producto: "Producto", academia: "Academia", panel: "Mi panel", admin: "Administrador", representantes: "Representantes", webinar: "Webinar", farmacovigilancia: "Farmacovigilancia", verificar: "Verificar constancia", legal: "Legal" }[seg[0]] || "Kirón") + " · " : "") + "Kirón · Demo";
    window.__lang = S.lang; if (window.I18N) I18N.apply(document.body);
  }

  /* ---------- Asistente de preguntas frecuentes (chatbot) ---------- */
  const BOT = [
    [["intento", "examen", "reprob", "attempt", "exam", "fail", "retake"], "Cada módulo cierra con un examen y el curso con un examen final. Cada examen tiene un número de intentos y un tiempo límite que define la academia. Si agotas tus intentos, desde el mismo examen puedes pedir uno adicional; lo autoriza la administración y te avisamos por correo.", "Each module ends with an exam and the course with a final exam. Each exam has a set number of attempts and a time limit defined by the academy. If you use them all, you can request an extra attempt from the exam itself; the admin team approves it and we let you know by email."],
    [["inscrib", "registr", "enroll", "sign up", "join"], "Para inscribirte a un curso entra a Academia, elige el curso y toca Inscribirme. Los cursos gratuitos se activan al momento; en los que tienen costo, el equipo de Academia te contacta para confirmar tu inscripción.", "To enroll, go to Academy, pick a course and tap Enroll. Free courses unlock right away; for paid courses the Academy team contacts you to confirm your enrollment."],
    [["constancia", "certific", "qr", "folio"], "Sí. Al aprobar el examen final se emite tu constancia con folio y código QR. Cualquiera puede verificarla en la página Verificar constancia.", "Yes. When you pass the final exam you get a certificate with a number and a QR code. Anyone can check it on the Verify certificate page."],
    [["webinar", "zoom", "en vivo", "live", "entrar"], "Regístrate al webinar con tu cuenta. El día de la transmisión aparece el botón Entrar en tu panel y lo ves dentro del sitio, sin instalar Zoom. Tu asistencia se registra sola.", "Register for the webinar with your account. On the day, a Join button shows up in your dashboard and you watch it right on the site, no Zoom install needed. Your attendance is logged automatically."],
    [["punto", "club", "canje", "point", "reward", "redeem"], "Sumas puntos al verificar tu cédula, asistir a webinars, completar lecciones y terminar cursos. Los canjeas en Club MVZ por cursos y promociones.", "You earn points by verifying your license, attending webinars, completing lessons and finishing courses. Redeem them in the Vet Club for courses and promotions."],
    [["cédula", "cedula", "license", "verific"], "Al crear tu cuenta te pedimos tu cédula profesional. El equipo de Kirón la valida en la consulta pública de la SEP y te suma 200 puntos.", "When you create your account we ask for your professional license. The Kirón team checks it against the public SEP registry and adds 200 points."],
    [["precio", "costo", "pago", "price", "cost", "pay"], "Los precios están en cada curso. El sitio no cobra en línea: el equipo de Academia te contacta para confirmar tu inscripción.", "Prices are shown on each course. The site doesn't take online payments: the Academy team contacts you to confirm your enrollment."],
  ];
  const BOTQ = { es: ["¿Cómo me inscribo a un curso?", "¿Los cursos tienen constancia?", "¿Cómo entro al webinar?", "¿Cómo gano puntos?", "¿Qué pasa si repruebo el examen?"], en: ["How do I enroll in a course?", "Do courses include a certificate?", "How do I join the webinar?", "How do I earn points?", "What if I fail the exam?"] };
  let botLog = [];
  function renderBot() {
    let b = $("#bot");
    if (!b) { b = document.createElement("div"); b.id = "bot"; b.setAttribute("data-notr", ""); document.body.appendChild(b); }
    const en = S.lang === "en", open = b.classList.contains("open");
    const hi = en ? "Hi, I'm the Academy assistant. How can I help you?" : "Hola, soy el asistente de la Academia. ¿En qué te ayudo?";
    b.innerHTML = `<button class="bot-fab" aria-label="${en ? "Open assistant" : "Abrir asistente"}" onclick="APP.bot()">${I(open ? "x" : "message-circle")}<span>${en ? "Questions?" : "¿Dudas?"}</span></button>
      <div class="bot-panel" role="dialog" aria-label="${en ? "Academy assistant" : "Asistente de la Academia"}">
        <div class="bot-h"><span class="bot-av">${I("sparkles")}</span><div><b>${en ? "Academy assistant" : "Asistente de la Academia"}</b><small>${en ? "Answers in seconds · demo" : "Responde al momento · demo"}</small></div></div>
        <div class="bot-msgs" id="botMsgs"><div class="bm bot">${hi}</div>${botLog.map(m => `<div class="bm ${m[0]}">${esc(m[1])}</div>`).join("")}</div>
        <div class="bot-chips">${BOTQ[en ? "en" : "es"].map(q => `<button onclick="APP.botAsk(this.textContent)">${q}</button>`).join("")}</div>
        <form class="bot-in" onsubmit="event.preventDefault();APP.botAsk(this.q.value);this.q.value=''"><input name="q" placeholder="${en ? "Type your question" : "Escribe tu pregunta"}" aria-label="${en ? "Your question" : "Tu pregunta"}" autocomplete="off"><button aria-label="${en ? "Send" : "Enviar"}">${I("send")}</button></form>
      </div>`;
    const m = $("#botMsgs"); if (m) m.scrollTop = m.scrollHeight;
  }

  /* ---------- Movimiento ---------- */
  function reveal(root) {
    const els = $$(".rv", root);
    if (reduced || !window.gsap) { els.forEach(e => { e.style.opacity = 1; e.style.transform = "none"; }); return; }
    els.forEach(el => {
      if (el.dataset.rv) return; el.dataset.rv = 1;
      gsap.to(el, { opacity: 1, y: 0, duration: .8, ease: "power3.out", delay: (Array.prototype.indexOf.call(el.parentNode.children, el) % 6) * .06, scrollTrigger: { trigger: el, start: "top 92%", once: true } });
    });
    ScrollTrigger.refresh();
  }
  function counters() {
    if (reduced || !window.gsap) return;
    $$("[data-count]").forEach(el => { const end = +el.dataset.count, o = { v: 0 };
      gsap.to(o, { v: end, duration: 1.6, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 95%", once: true }, onUpdate: () => el.textContent = Math.round(o.v).toLocaleString("es-MX") }); });
  }
  function countdown() {
    const els = $$("[data-countdown]"); if (!els.length) return;
    const base = new Date("2026-12-15T20:00:00-06:00").getTime();
    const tick = () => els.forEach(el => { const iso = el.getAttribute("data-countdown"); const target = iso ? new Date(iso).getTime() : base; const d = Math.max(0, target - Date.now()); const u = [Math.floor(d / 864e5), Math.floor(d / 36e5) % 24, Math.floor(d / 6e4) % 60];
      el.innerHTML = [["días", u[0]], ["horas", u[1]], ["min", u[2]]].map(x => `<div><b>${String(x[1]).padStart(2, "0")}</b><span>${x[0]}</span></div>`).join(""); });
    tick(); clearInterval(window.__cd); window.__cd = setInterval(tick, 30000);
  }
  function heroAuto() {
    clearInterval(window.__hcT); const h = $("#hcar"); if (!h || reduced) return;
    window.__hcT = setInterval(() => { if (!$("#hcar")) return clearInterval(window.__hcT); if (h.matches(":hover") || h.contains(document.activeElement) || $("#modalBg").classList.contains("open")) return; APP.heroGo((window.__hc || 0) + 1, true); }, 7000);
  }
  function hdrShadow() { const h = $("#hdr"); if (h) h.classList.toggle("scrolled", scrollY > 10); }
  addEventListener("scroll", hdrShadow, { passive: true });

  /* ---------- Utilidades de interfaz ---------- */
  function toast(msg) {
    const tt = $("#toast"); tt.querySelector("span.msg").textContent = msg; tt.classList.add("show");
    clearTimeout(window.__tt); window.__tt = setTimeout(() => tt.classList.remove("show"), 3600);
  }
  function modal(html, sm) { const m = $("#modal"); m.innerHTML = `<div class="modal ${sm ? "sm" : ""}" role="dialog" aria-modal="true" data-lenis-prevent>${html}</div>`; $("#modalBg").classList.add("open"); try { if (lenis) lenis.stop(); } catch (e) {} setTimeout(() => { const f = $(".modal input:not([type=hidden]), .modal button.btn"); if (f) f.focus(); }, 60); }
  function closeModal() { clearInterval(window.__exT); $("#modalBg").classList.remove("open", "live"); try { if (lenis) lenis.start(); } catch (e) {} $$("#modal video").forEach(v => v.pause()); }
  const fechaMx = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ""); return m ? `${m[3]}/${m[2]}/${m[1]}` : ""; };
  const slugify = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "");
  const ytId = u => { const m = /(?:youtube\.com\/(?:live\/|watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/.exec(u || ""); return m ? m[1] : null; };
  /* [SUPUESTO] dominio público de Kirón para la landing; se confirma con el dominio definitivo. */
  const landingUrl = slug => `kironmexico.com/es/webinar/${slug}`;
  function webinarBy(slug) {
    if (slug === "proximo") { const w = WEBINARS.next; return { slug, titulo: w.title, subtitulo: w.sub, grado: w.deg, ponente: w.speaker, inicio: "2026-12-15T20:00:00-06:00", fechaTxt: "15/12/2026", hora: "20:00", duracion: 90, umbral: 45, flyer: w.img, modo: "cloudflare" }; }
    const w = (S.newWebinars || []).find(x => x.slug === slug); if (!w) return null;
    return Object.assign({}, w, { inicio: `${w.fecha}T${w.hora}:00-06:00`, fechaTxt: fechaMx(w.fecha) });
  }
  const wbReg = slug => slug === "proximo" ? !!S.webinar : !!(S.webReg || {})[slug];
  const wbAtt = slug => slug === "proximo" ? !!S.attended : !!(S.webAtt || {})[slug];
  function webinarLanding(slug) {
    const w = webinarBy(slug); if (!w) return notFound();
    const t0 = new Date(w.inicio).getTime(), now = Date.now();
    const real = now < t0 ? "antes" : now < t0 + w.duracion * 6e4 ? "vivo" : "concluido";
    const vista = (S.wbView || {})[slug] || real, reg = wbReg(slug), att = wbAtt(slug);
    const bar = `<div class="wl-demo" role="group" aria-label="Vista del demo"><span>Vista del demo</span>${[["antes", "Antes del evento"], ["vivo", "En vivo"], ["concluido", "Concluido"]].map(v => `<button class="${vista === v[0] ? "on" : ""}" aria-pressed="${vista === v[0]}" onclick="APP.wbView('${slug}','${v[0]}')">${v[1]}</button>`).join("")}</div>`;
    const hero = `<section class="wl-hero"><div class="wrap wl-grid">
      <div>${w.flyer ? `<img class="wl-flyer" src="${w.flyer}" alt="Flyer del webinar">` : `<div class="wl-flyer wl-noflyer" aria-hidden="true">${I("video")}</div>`}</div>
      <div><span class="badge badge-new">Webinar en vivo · gratuito</span><h1 class="h-lg" style="margin-top:16px" data-notr>${esc(w.titulo)}</h1>${w.subtitulo ? `<p class="lead" data-notr>${esc(w.subtitulo)}</p>` : ""}
        <p class="wl-meta">${I("calendar")} <span>${w.fechaTxt} · ${w.hora} Hrs (centro de México) · ${w.duracion} min</span></p>
        <p class="wl-meta">${I("user")} <span data-notr>${esc(w.grado + " " + w.ponente)}</span></p>
        <p class="wl-meta">${I("award")} <span>Constancia de asistencia y +50 puntos Club MVZ al ver al menos ${w.umbral} minutos en vivo</span></p></div></div></section>`;
    const player = w.modo === "youtube" && ytId(w.youtube)
      ? `<iframe src="https://www.youtube-nocookie.com/embed/${ytId(w.youtube)}?autoplay=1&mute=1&rel=0" title="Transmisión del webinar" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen style="width:100%;height:100%;border:0;display:block"></iframe>`
      : `<div class="kstage"><span class="kplate"><img src="assets/img/kiron-logo.png" alt="Kirón"></span><span class="vlabel">En vivo</span></div><span class="lr-tag">Reproductor del sitio · la señal llega desde Zoom por Cloudflare Stream</span>`;
    let body;
    if (!S.logged) body = `<div class="panel wl-box">${I("lock")}<div><h3>Transmisión exclusiva para médicos veterinarios</h3><p class="sub">Inicia sesión o crea tu cuenta y regístrate al webinar para ver la transmisión aquí, sin instalar Zoom.</p><button class="btn btn-primary" onclick="APP.wbReg('${slug}')">${I("calendar")} Registrarme al webinar</button></div></div>`;
    else if (!reg && vista !== "concluido") body = `<div class="panel wl-box">${I("calendar")}<div><h3>Regístrate para ver la transmisión</h3><p class="sub">Con tu registro, el día del evento esta página muestra el reproductor y tu asistencia se cuenta sola.</p><button class="btn btn-primary" onclick="APP.wbReg('${slug}')">${I("calendar")} Registrarme</button></div></div>`;
    else if (!reg) body = `<div class="panel wl-box">${I("info")}<div><h3>Este webinar ya concluyó</h3><p class="sub">La grabación está disponible para quienes se registraron. Revisa los próximos webinars en Academia.</p><a class="btn btn-ghost" href="#/academia?tab=webinars">Ver webinars</a></div></div>`;
    else if (vista === "antes") body = `<div class="wl-wait"><div><span class="eyebrow light">Ya estás registrado</span><h3>La transmisión empieza en</h3><div class="countdown" data-countdown="${w.inicio}"></div>
        <p>El reproductor aparece en esta página a la hora del evento. Te avisamos por correo 24 horas y 1 hora antes.</p>
        <div class="hc-ctas"><button class="btn btn-accent" onclick="APP.wbIcs('${slug}')">${I("calendar")} Agregar a mi calendario</button></div></div></div>`;
    else if (vista === "vivo") body = `<div class="live-room wl-room" data-lenis-prevent><div class="lr-top"><span class="lr-live"><i></i> EN VIVO</span><b data-notr>${esc(w.titulo)}</b><span class="lr-sp" data-notr>${esc(w.grado + " " + w.ponente)}</span></div>
        <div class="lr-main"><div class="lr-stage">${player}<span class="lr-count">${I("users")} 342 conectados</span></div>
          <aside class="lr-side"><b>Preguntas al ponente</b><div class="lr-q" id="lrq"><div><small>MVZ Paola R.</small>¿La grabación queda disponible?</div><div><small>Dr. Andrés S.</small>¿Desde cuándo se descarga la constancia?</div></div>
            <form class="lr-in" onsubmit="return APP.liveAsk(event)"><input name="q" placeholder="Escribe tu pregunta" aria-label="Tu pregunta" required maxlength="300"><button class="btn btn-primary btn-sm" aria-label="Enviar pregunta">${I("send")}</button></form></aside></div>
        <div class="lr-foot">${I("circle-check")} ${att ? "<span>Tu asistencia quedó registrada · +50 puntos Club MVZ</span>" : `<span>Tu asistencia se mide cada minuto mientras esta página está abierta.</span><button class="btn btn-accent btn-sm" style="margin-left:auto" onclick="APP.wbAttend('${slug}')">Simular ${w.umbral} minutos vistos</button>`}</div></div>`;
    else body = `<div class="two" style="margin-top:0"><div class="player" style="min-height:260px"><span class="ptitle">Grabación · ejemplo</span><button class="playbtn" aria-label="Reproducir grabación" onclick="APP.toast('En el sitio real se reproduce la grabación que guarda Cloudflare Stream')">${I("play")}</button></div>
        <div class="panel"><h3>${att ? "Asististe a este webinar" : "Grabación disponible"}</h3><p class="sub">${att ? "Tu constancia ya está en tu panel, con folio y QR." : "No alcanzaste los minutos en vivo para la constancia; puedes ver la grabación cuando quieras."}</p>${att ? `<button class="btn btn-primary btn-sm" onclick="APP.certificate('webinar','KI-2026-001388')">${I("award")} Descargar constancia</button>` : ""}</div></div>`;
    return bar + hero + `<section class="sec"><div class="wrap">${body}</div></section>`;
  }
  const hoyIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const mh = title => `<div class="modal-h"><h3>${title}</h3><button class="icon-btn" aria-label="Cerrar" onclick="APP.closeModal()">${I("x")}</button></div>`;
  function download(name, text, type) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
  function printDoc(title, body) {
    const base = location.href.replace(/[#?].*$/, "").replace(/[^/]*$/, "");
    const w = window.open("", "_blank");
    if (!w) { toast("Permite ventanas emergentes para abrir el PDF"); return; }
    const en = S.lang === "en" && window.I18N, t = x => (en && I18N.tr(x)) || x;
    if (en) { body = I18N.html(body); title = t(title); }
    w.document.write(`<!doctype html><html lang="${en ? "en" : "es"}"><head><meta charset="utf-8"><title>${title}</title><base href="${base}"><link rel="stylesheet" href="assets/app.css"><style>body{background:#fff;padding:0}.doc{max-width:760px;margin:0 auto;padding:48px 40px;font-size:14px}.doc h1{font-size:30px;margin:18px 0 6px}.doc table{width:100%;border-collapse:collapse;margin-top:18px}.doc td,.doc th{border-bottom:1px solid #dfe2da;padding:9px 8px;text-align:left;font-size:13px}.doc .bar{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #b42318;padding-bottom:14px}.doc .foot{margin-top:40px;font-size:11.5px;color:#6b7065;border-top:1px solid #dfe2da;padding-top:12px}.noprint{position:fixed;right:20px;top:20px}@media print{.noprint{display:none}}</style></head><body><div class="noprint"><button class="btn btn-primary" onclick="print()">${t("Guardar como PDF o imprimir")}</button></div><div class="doc"><div class="bar"><img src="assets/img/kiron-logo.png" style="height:52px" alt="Kirón"><span style="font:600 12px var(--f-body);color:#6b7065">${t("Documento de ejemplo · demo")}</span></div>${body}<div class="foot">${t("Laboratorios Kirón México · kironmexico.com · Generado desde la plataforma (demo) el 30/10/2026.")}</div></div></body></html>`);
    w.document.close();
  }

  /* ---------- Editor de curso (demo v2.4) ----------
     Estructura del constructor de cursos: datos básicos y temario (módulos, lecciones con video de Bunny, duración,
     archivos y fecha de desbloqueo, y examen final del curso). El video de Bunny solo guarda librería e ID: el token de
     reproducción se firma en el servidor. */
  Object.assign(ICONS, {
    "headphones": '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />',
    "file-down": '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M12 18v-6" /><path d="m9 15 3 3 3-3" />',
    "help-circle": '<circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />',
    "arrow-up": '<path d="m5 12 7-7 7 7" /><path d="M12 19V5" />',
    "arrow-down": '<path d="M12 5v14" /><path d="m19 12-7 7-7-7" />',
    "trash": '<path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />',
  });
  /* Tipos de pregunta del examen: los 5 de la cotización del 11/11/2026 (H-023). */
  const CE_PREG = { om: "Opción múltiple", vf: "Verdadero o falso", rm: "Respuesta múltiple", rel: "Relacionar columnas", ab: "Respuesta abierta" };
  const CE_PICO = { om: "list-checks", vf: "check", rm: "check-check", rel: "layers", ab: "pencil" };
  const NIVELES = ["Todos los niveles", "Básico", "Intermedio", "Avanzado"];
  const bunnyIds = s => { const t = String(s || ""); const m = /(?:iframe|player)\.mediadelivery\.net\/(?:embed|play)\/(\d+)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(t); if (m) return { lib: m[1], vid: m[2].toLowerCase() }; const g = /^\s*(\d+)\s*[\/:,\s]\s*([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*$/i.exec(t); return g ? { lib: g[1], vid: g[2].toLowerCase() } : null; };
  const ceTam = b => b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
  const ceLeccion = titulo => ({ titulo, tipo: "leccion", video: { lib: "", vid: "" }, dur: "", adjuntos: [], desbloqueo: "", v24: 1 });
  const ceExamen = titulo => Object.assign({ titulo, tipo: "examen", final: true, preguntas: [], v24: 1 }, QDEF());
  const ceQNew = tipo => ({ tipo, texto: "", puntos: 1, requerida: true, mezclar: false, explicacion: "", opciones: tipo === "om" || tipo === "rm" ? ["", "", "", ""] : [], correctas: tipo === "om" || tipo === "vf" ? [0] : [], pares: tipo === "rel" ? [["", ""], ["", ""], ["", ""]] : [], modelo: "" });
  /* Limpieza de la descripción HTML para la vista previa del demo. En la plataforma se limpia en el servidor con una lista de etiquetas permitidas. */
  const cleanHtml = h => { const d = new DOMParser().parseFromString(`<div>${h || ""}</div>`, "text/html"); d.querySelectorAll("script,style,iframe,object,embed,form,link,meta,base").forEach(n => n.remove()); d.querySelectorAll("*").forEach(n => [...n.attributes].forEach(a => { if (/^on/i.test(a.name) || (/^(href|src|xlink:href)$/i.test(a.name) && /^\s*(javascript|data):/i.test(a.value) && !/^\s*data:image\//i.test(a.value))) n.removeAttribute(a.name); })); return d.body.firstChild ? d.body.firstChild.innerHTML : ""; };
  function ceNorm(c) {
    if (!c.id) c.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    if (c.modulos.some(m => typeof m.lecciones === "number")) {
      c.modulos = c.modulos.map(m => ({ nombre: m.nombre, lecciones: Array.from({ length: m.lecciones }, (_, k) => ceLeccion(`Lección ${k + 1}`)) }));
      c.modulos.push({ nombre: "Cierre del curso", final: true, lecciones: [ceExamen("Examen final")] });
    }
    if (!c.estado) c.estado = c.publicado ? "publicado" : "borrador";
    if (c.precioRegular === undefined) c.precioRegular = c.precio || 0;
    if (!c.nivel) c.nivel = NIVELES[0];
    if (c.descripcion === undefined) c.descripcion = "";
    if (!c.fecha) c.fecha = hoyMx();
    /* Sin examen por módulo: solo el examen final del cierre. Migra también lecciones por bloques del demo v2.3. */
    c.modulos.forEach(m => { if (!m.final) m.lecciones = m.lecciones.filter(l => l.tipo !== "examen"); });
    c.modulos.forEach(m => m.lecciones.forEach(l => {
      if (l.v24) return;
      if (l.tipo === "leccion") { const v = (l.bloques || []).find(b => b.t === "video"); l.video = v ? { lib: v.lib || "", vid: v.vid || "" } : { lib: "", vid: "" }; l.dur = l.min ? `${l.min}:00` : ""; l.adjuntos = (l.bloques || []).filter(b => (b.t === "pdf" || b.t === "doc") && b.nombre).map(b => ({ nombre: b.nombre, tam: b.tam || 0, key: b.key })); l.desbloqueo = ""; ["bloques", "completa", "min", "preview"].forEach(k => delete l[k]); }
      else { const old = { aprobatoria: Math.round((l.minima || 8) * 10), intentos: l.intentos ?? 1, tiempo: l.tiempo ?? 30, maxPreg: l.porIntento || 0, orden: l.aleatorio === false ? "fijo" : "aleatorio" }; Object.assign(l, QDEF(), old); ["minima", "porIntento", "aleatorio"].forEach(k => delete l[k]); (l.preguntas || []).forEach(q => { Object.keys(ceQNew(q.tipo)).forEach(k => { if (q[k] === undefined) q[k] = ceQNew(q.tipo)[k]; }); }); }
      l.v24 = 1;
    }));
    c.publicado = c.estado === "publicado";
    return c;
  }
  const ceStats = c => { ceNorm(c); const ls = c.modulos.flatMap(m => m.lecciones); return { lecciones: ls.filter(l => l.tipo === "leccion").length, modulos: c.modulos.filter(m => !m.final).length }; };
  const ceHref = (ci, mi, li) => `#/admin/academia/editor/${ci}/${mi}/${li}`;
  const ceIcon = l => l.tipo === "examen" ? "clipboard-list" : "video";
  const ceInput = (id, label, html) => `<div class="form-row"><label class="l" for="${id}">${label}</label>${html}</div>`;
  const ceIssues = c => {
    const p = [];
    c.modulos.forEach((m, a) => m.lecciones.forEach(l => {
      const w = `${m.final ? "Cierre" : "Módulo " + (a + 1)} · ${l.titulo}`;
      if (l.tipo === "leccion") { if (!l.video.lib) p.push(`${w}: falta el video de Bunny`); if (!/^\d{1,3}:\d{2}(:\d{2})?$/.test(l.dur || "")) p.push(`${w}: falta la duración del video`); }
      else {
        if (!l.preguntas.length) p.push(`${w}: sin preguntas`);
        l.preguntas.forEach((q, k) => { const n = k + 1;
          if (!q.texto.trim()) p.push(`${w}: la pregunta ${n} no tiene texto`);
          if ((q.tipo === "om" || q.tipo === "rm") && (!q.correctas.length || q.opciones.filter(o => o.trim()).length < 2)) p.push(`${w}: la pregunta ${n} necesita al menos dos opciones y una correcta`);
          if (q.tipo === "rel" && q.pares.some(x => !x[0].trim() || !x[1].trim())) p.push(`${w}: la pregunta ${n} tiene parejas incompletas`);
        });
      }
    }));
    return p;
  };

  function ceView(ci, mi, li) {
    ci = +ci || 0; const c = (S.newCourses || [])[ci];
    if (!c) return `<div class="main-head"><div><h1>Editor de curso</h1></div></div><div class="notice">${I("info")}<span>No encontramos el curso. Créalo desde Academia con el botón Nuevo curso.</span></div>`;
    ceNorm(c); save();
    const datos = mi === "datos";
    mi = datos ? 0 : Math.min(Math.max(+mi || 0, 0), c.modulos.length - 1); const m = c.modulos[mi];
    li = Math.min(Math.max(+li || 0, 0), Math.max(m.lecciones.length - 1, 0)); const l = m.lecciones[li];
    const prev = !!S.cePrev && !datos;
    const out = c.modulos.map((mm, a) => `<div class="ce-mod">
        <div class="ce-mh">${mm.final ? `<b>${mm.nombre}</b>` : `<input class="ce-mname" value="${esc(mm.nombre)}" aria-label="Nombre del módulo ${a + 1}" onchange="APP.ceModName(${ci},${a},this.value)" data-notr>`}<small>${mm.final ? "" : "Módulo " + (a + 1)}</small></div>
        ${mm.lecciones.map((ll, b) => `<a class="ce-les ${!datos && a === mi && b === li ? "on" : ""} ${ll.tipo === "examen" ? "ex" : ""}" href="${ceHref(ci, a, b)}">${I(ceIcon(ll))}<span data-notr>${esc(ll.titulo)}</span><em>${ll.tipo === "examen" ? (ll.preguntas.length || "0") + " preg." : (ll.dur || "sin video")}</em></a>`).join("")}
        ${mm.final ? "" : `<div class="ce-madd"><button type="button" onclick="APP.ceLesAdd(${ci},${a},'leccion')">${I("plus")} Lección</button></div>`}
      </div>`).join("") + `<button type="button" class="btn btn-ghost btn-sm btn-block" onclick="APP.ceModAdd(${ci})">${I("plus")} Agregar módulo</button>`;
    const body = datos ? ceBasics(ci, c) : !l ? `<div class="notice">${I("info")}<span>Este módulo no tiene lecciones. Agrega una desde el temario.</span></div>`
      : prev ? ceStudent(c, mi, l) : l.tipo === "examen" ? ceExam(ci, mi, li, l) : ceLesson(ci, mi, li, l);
    return `<div class="main-head ce-head"><div><a class="ce-back" href="#/admin/academia/cursos">${I("arrow-left")} Cursos</a><h1 data-notr>${esc(c.titulo)}</h1><p><span class="state ${CST_CLS[c.estado]}">${CSTATES[c.estado]}</span> <span>${c.tipo}</span> · <span data-notr>${esc(c.instructor)}</span></p></div>
        <div class="ce-actions">${datos ? "" : `<button class="btn btn-ghost btn-sm" onclick="APP.cePrev()">${I(prev ? "pencil" : "eye")} ${prev ? "Volver a editar" : "Vista del alumno"}</button>`}<button class="btn btn-primary btn-sm" onclick="APP.cePublish(${ci})">${I("circle-check")} ${c.estado === "publicado" ? "Revisar y guardar" : "Publicar curso"}</button></div></div>
      <div class="atabs ce-tabs"><a class="${datos ? "on" : ""}" href="#/admin/academia/editor/${ci}/datos">${I("file-text")}<span>Datos del curso</span></a><a class="${datos ? "" : "on"}" href="${ceHref(ci, 0, 0)}">${I("layers")}<span>Temario</span></a></div>
      ${datos ? `<section class="ce-main">${body}</section>` : `<div class="ce-grid"><aside class="ce-out panel" aria-label="Temario del curso"><h3>Temario</h3>${out}</aside><section class="ce-main">${body}</section></div>`}`;
  }

  function ceBasics(ci, c) {
    const cats = [...new Set(COURSES.map(x => x.cat).filter(Boolean).concat(["Curso independiente"]))];
    const isoP = c.fechaProg || "";
    return `<form class="panel ce-basics" novalidate onsubmit="return APP.ceBasicsSave(event,${ci})">
      <div class="grid2">${ceInput("bTi", "Título en español", `<input class="input" id="bTi" maxlength="140" value="${esc(c.titulo)}" data-notr>`)}${ceInput("bTe", "Título en inglés", `<input class="input" id="bTe" maxlength="140" value="${esc(c.tituloEn || "")}" data-notr>`)}</div>
      ${ceInput("bDe", "Descripción del curso (HTML con imágenes: temario, ponentes e información visual)", `<textarea class="input ce-code" id="bDe" rows="8" maxlength="40000" oninput="APP.ceDescPrev(this.value)" data-notr>${esc(c.descripcion)}</textarea>`)}
      <details class="ce-prev" ${c.descripcion ? "open" : ""}><summary>Vista previa de la descripción</summary><div class="ce-desc" id="bDp" data-notr>${cleanHtml(c.descripcion) || "<p>Sin descripción.</p>"}</div></details>
      <div class="grid2">${ceInput("bTy", "Tipo", `<select class="input" id="bTy">${["Curso", "Diplomado"].map(x => `<option ${c.tipo === x ? "selected" : ""}>${x}</option>`).join("")}</select>`)}${ceInput("bCa", "Categoría", `<select class="input" id="bCa">${cats.map(x => `<option ${c.categoria === x ? "selected" : ""}>${esc(x)}</option>`).join("")}</select>`)}</div>
      <div class="grid2">${ceInput("bNi", "Nivel de dificultad", `<select class="input" id="bNi">${NIVELES.map(x => `<option ${c.nivel === x ? "selected" : ""}>${x}</option>`).join("")}</select>`)}${ceInput("bAu", "Autor o ponente (solo se muestra; no da permisos)", `<input class="input" id="bAu" maxlength="120" value="${esc(c.instructor)}" data-notr>`)}</div>
      <div class="grid2">${ceInput("bPr", "Precio regular en MXN, IVA incluido", `<input class="input" type="number" id="bPr" min="0" step="1" value="${c.precioRegular || 0}">`)}${ceInput("bPo", "Precio de oferta en MXN, IVA incluido (0 = gratuito)", `<input class="input" type="number" id="bPo" min="0" step="1" value="${c.precio || 0}">`)}</div>
      <p class="ce-hint" style="margin:-8px 0 18px">${I("info")} El precio se muestra en la página del curso, pero no se cobra en línea ni da acceso. El acceso lo da solo una inscripción aprobada.</p>
      <div class="grid2">${ceInput("bPt", "Imagen destacada (JPG, PNG o WebP, máximo 2 MB)", `<input class="input file" type="file" id="bPt" accept="image/jpeg,image/png,image/webp" onchange="APP.courseCover(this)">`)}<div class="form-row"><label class="l">Actual</label>${c.portada ? `<img class="ce-cover" src="${c.portada}" alt="Imagen destacada">` : `<p class="ce-hint">Sin imagen destacada.</p>`}</div></div>
      <div class="grid2">${ceInput("bEs", "Estado", `<select class="input" id="bEs" onchange="document.getElementById('bFw').hidden=this.value!=='programado'">${["borrador", "publicado", "programado", "privado"].map(x => `<option value="${x}" ${c.estado === x ? "selected" : ""}>${CSTATES[x]}</option>`).join("")}</select>`)}<div id="bFw" ${c.estado === "programado" ? "" : "hidden"}>${ceInput("bFp", "Fecha de publicación", `<input class="input" type="date" id="bFp" value="${isoP}">`)}</div></div>
      <p class="err" id="bEr" role="alert" style="color:#b42318;font-size:13.5px;margin-bottom:12px" hidden></p>
      <button class="btn btn-primary" type="submit">${I("check")} Guardar datos del curso</button>
    </form>`;
  }

  function ceLesson(ci, mi, li, l) {
    const P = `${ci},${mi},${li}`;
    return `<div class="panel ce-lhead">
        <div class="ce-lt"><label class="sr" for="ceT">Título de la lección</label><input class="ce-title" id="ceT" value="${esc(l.titulo)}" maxlength="140" onchange="APP.ceSet(${P},-1,'titulo',this.value)" data-notr>
          <div class="ce-lmove"><button type="button" class="icon-btn" aria-label="Subir lección" onclick="APP.ceLesMove(${P},-1)">${I("arrow-up")}</button><button type="button" class="icon-btn" aria-label="Bajar lección" onclick="APP.ceLesMove(${P},1)">${I("arrow-down")}</button><button type="button" class="icon-btn" aria-label="Eliminar lección" onclick="APP.ceLesDel(${P})">${I("trash")}</button></div></div>
        <p class="ce-hint" style="margin-top:8px">${I("lock")} Se marca completada sola cuando el alumno reproduce el 100 % del video. No hay botón para marcarla a mano.</p></div>
      <div class="ce-block"><div class="ce-bh">${I("video")}<b>Video de la lección · Bunny Stream</b></div><div class="ce-bb">
        ${ceInput("ceV", "Código de inserción, URL del reproductor o «librería/ID»", `<textarea class="input ce-code" id="ceV" rows="3" placeholder='&lt;iframe src="https://iframe.mediadelivery.net/embed/123456/xxxxxxxx-xxxx-..."&gt;&lt;/iframe&gt;' onchange="APP.ceVideo(${P},this.value)" data-notr></textarea>`)}
        ${l.video.lib ? `<div class="ce-chips"><span class="ce-chip ok">${I("circle-check")} <span>Librería</span> <b data-notr>${l.video.lib}</b></span><span class="ce-chip ok"><span>Video</span> <b data-notr>${l.video.vid.slice(0, 8)}…</b></span><button type="button" class="mini" onclick="APP.ceVideoTest(${P})">${I("play")} Probar reproductor</button></div>` : `<p class="ce-hint">Copia el código desde Bunny: Stream, tu librería, el video y Embed. Solo guardamos la librería y el ID; nunca el script.</p>`}
        <div class="grid2" style="margin-top:14px">${ceInput("ceD", "Duración del video (min:seg)", `<input class="input" id="ceD" maxlength="9" placeholder="12:40" value="${esc(l.dur)}" onchange="APP.ceDur(${P},this.value)">`)}${ceInput("ceU", "Fecha de desbloqueo (opcional)", `<input class="input" type="date" id="ceU" value="${esc(l.desbloqueo)}" onchange="APP.ceSet(${P},-1,'desbloqueo',this.value)">`)}</div>
        <p class="ce-hint">${I("info")} Sin fecha, la lección está disponible de inmediato. Con fecha, el alumno la ve con candado hasta ese día.</p>
        <p class="ce-hint">${I("lock")} En la plataforma el reproductor se firma con un token que vence en minutos (Embed view token authentication de Bunny), así que el video no se puede incrustar fuera del sitio.</p></div></div>
      <div class="ce-block"><div class="ce-bh">${I("download")}<b>Archivos de ejercicios y documentación</b></div><div class="ce-bb">
        ${l.adjuntos.map((a, k) => `<div class="ce-file">${I("file-down")}<div><b data-notr>${esc(a.nombre)}</b><small>${ceTam(a.tam)}</small></div><button type="button" class="icon-btn" aria-label="Quitar archivo" onclick="APP.ceAdjDel(${P},${k})">${I("trash")}</button></div>`).join("")}
        <label class="ce-drop">${I("upload")}<b>Agrega archivos</b><small>PDF, Word, Excel, PowerPoint o ZIP, hasta 50 MB cada uno</small><input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip" hidden onchange="APP.ceAdj(${P},this)"></label></div></div>`;
  }

  function ceExam(ci, mi, li, l) {
    const P = `${ci},${mi},${li}`, G = gs();
    const num = (k, label, min, max, suf = "", hint = "") => `<label>${label} <input class="input" type="number" min="${min}" max="${max}" value="${l[k]}" onchange="APP.ceSet(${P},-1,'${k}',Math.max(${min},Math.min(${max},+this.value||0)))">${suf ? " " + suf : ""}${hint ? ` <small>${hint}</small>` : ""}</label>`;
    const sel = (k, label, map, dis = "") => `<label>${label} <select class="input" onchange="APP.ceSet(${P},-1,'${k}',this.value)">${Object.entries(map).map(([v, t]) => `<option value="${v}" ${l[k] === v ? "selected" : ""} ${dis === v ? "disabled" : ""}>${t}</option>`).join("")}</select></label>`;
    const head = `<div class="panel ce-lhead"><div class="ce-lt"><label class="sr" for="ceT">Título del examen</label><input class="ce-title" id="ceT" value="${esc(l.titulo)}" maxlength="140" onchange="APP.ceSet(${P},-1,'titulo',this.value)" data-notr><div class="ce-lmove"><button type="button" class="icon-btn" aria-label="Exportar examen" title="Exportar examen" onclick="APP.ceExport(${P})">${I("download")}</button><label class="icon-btn" aria-label="Importar preguntas" title="Importar preguntas">${I("upload")}<input type="file" accept="application/json,.json" hidden onchange="APP.ceImport(${P},this)"></label>${l.final ? "" : `<button type="button" class="icon-btn" aria-label="Eliminar examen" onclick="APP.ceLesDel(${P})">${I("trash")}</button>`}</div></div>
        <p class="ce-hint" style="margin-top:6px">Es el único examen del curso. Se abre cuando el alumno termina todas las lecciones; la constancia se emite solo si lo aprueba. El tiempo límite se valida en el servidor.</p>
        <div class="ce-lmeta">
          ${num("aprobatoria", "Calificación aprobatoria", 1, 100, "%")}
          ${num("intentos", "Intentos permitidos", 0, 20, "", "0 = sin límite")}
          ${num("tiempo", "Tiempo límite", 0, 300, "min", "0 = sin límite")}
          ${num("maxPreg", "Preguntas a responder", 0, 200, "", "0 = todas")}
          <label>Se abre el <input class="input" type="date" value="${esc(l.desbloqueo)}" onchange="APP.ceSet(${P},-1,'desbloqueo',this.value)"></label>
          ${sel("layout", "Presentación", LAYOUT)}${sel("orden", "Orden de preguntas", ORDEN)}
          ${num("lcAbierta", "Caracteres · respuesta abierta", 100, 10000)}
          ${sel("retro", "Retroalimentación", RETRO, G.ocultar ? "revelar" : "")}${sel("calculo", "Nota final", CALC)}
        </div>${G.ocultar ? `<p class="ce-hint">${I("eye")} Ajuste global activo: el alumno solo ve su calificación final, sin detalle de respuestas.</p>` : ""}</div>`;
    const qs = l.preguntas.map((q, i) => {
      const opt = (k, o, multi) => `<div class="ce-opt"><input type="${multi ? "checkbox" : "radio"}" name="q${i}o" aria-label="Correcta: opción ${k + 1}" ${q.correctas.includes(k) ? "checked" : ""} onchange="APP.ceQCorr(${P},${i},${k},this.checked)"><input class="input" maxlength="200" value="${esc(o)}" placeholder="Opción ${k + 1}" aria-label="Opción ${k + 1}" onchange="APP.ceQOpt(${P},${i},${k},this.value)"></div>`;
      let b = "";
      if (q.tipo === "om" || q.tipo === "rm") b = `<div class="ce-opts"><p class="ce-hint">${q.tipo === "rm" ? "Marca todas las correctas." : "Marca la correcta."}</p>${q.opciones.map((o, k) => opt(k, o, q.tipo === "rm")).join("")}${q.opciones.length < 8 ? `<button type="button" class="mini" onclick="APP.ceQOptAdd(${P},${i})">${I("plus")} Opción</button>` : ""}</div>`;
      else if (q.tipo === "vf") b = `<div class="ce-opts">${["Verdadero", "Falso"].map((o, k) => `<label class="ce-opt"><input type="radio" name="q${i}vf" ${q.correctas[0] === k ? "checked" : ""} onchange="APP.ceQCorr(${P},${i},${k},true)"> ${o}</label>`).join("")}</div>`;
      else if (q.tipo === "rel") b = `<div class="ce-opts">${q.pares.map((p, k) => `<div class="ce-pair"><input class="input" maxlength="160" value="${esc(p[0])}" placeholder="Concepto ${k + 1}" aria-label="Concepto ${k + 1}" onchange="APP.ceQPar(${P},${i},${k},0,this.value)"><span>${I("arrow-right")}</span><input class="input" maxlength="160" value="${esc(p[1])}" placeholder="Pareja ${k + 1}" aria-label="Pareja ${k + 1}" onchange="APP.ceQPar(${P},${i},${k},1,this.value)"></div>`).join("")}${q.pares.length < 8 ? `<button type="button" class="mini" onclick="APP.ceQParAdd(${P},${i})">${I("plus")} Pareja</button>` : ""}<p class="ce-hint">Al alumno se le muestran las parejas en desorden.</p></div>`;
      else b = `<p class="ce-hint">La califica el equipo desde el libro de calificaciones. Máximo ${l.lcAbierta} caracteres.</p>${ceInput(`q${i}m`, "Respuesta modelo o criterio (solo la ve el equipo)", `<textarea class="input" id="q${i}m" rows="2" maxlength="2000" onchange="APP.ceQ(${P},${i},'modelo',this.value)">${esc(q.modelo || "")}</textarea>`)}`;
      return `<div class="ce-block"><div class="ce-bh"><span class="ce-qn">${i + 1}</span><b>${CE_PREG[q.tipo]}</b><span class="grow"></span><label class="ce-pts">Puntos <input class="input" type="number" min="1" max="10" value="${q.puntos}" onchange="APP.ceQ(${P},${i},'puntos',+this.value)"></label><button type="button" class="icon-btn" aria-label="Eliminar pregunta" onclick="APP.ceQDel(${P},${i})">${I("trash")}</button></div>
        <div class="ce-bb">${ceInput(`q${i}t`, "Pregunta", `<textarea class="input" id="q${i}t" rows="2" maxlength="600" onchange="APP.ceQ(${P},${i},'texto',this.value)">${esc(q.texto)}</textarea>`)}${b}
          <div class="ce-qopts"><label class="ce-chk"><input type="checkbox" ${q.requerida ? "checked" : ""} onchange="APP.ceQ(${P},${i},'requerida',this.checked)"> Respuesta obligatoria</label>${q.tipo === "om" || q.tipo === "rm" || q.tipo === "rel" ? `<label class="ce-chk"><input type="checkbox" ${q.mezclar ? "checked" : ""} onchange="APP.ceQ(${P},${i},'mezclar',this.checked)"> Mezclar opciones</label>` : ""}</div>
          ${ceInput(`q${i}x`, "Explicación (solo la ve el equipo)", `<input class="input" id="q${i}x" maxlength="400" value="${esc(q.explicacion)}" onchange="APP.ceQ(${P},${i},'explicacion',this.value)">`)}</div></div>`;
    }).join("");
    const pal = `<div class="ce-pal"><p>${l.preguntas.length ? "Agregar otra pregunta" : "Agrega las preguntas del examen."}</p><div class="ce-pgrid ce-pgrid-q">${Object.entries(CE_PREG).map(([k, v]) => `<button type="button" onclick="APP.ceQAdd(${P},'${k}')">${I(CE_PICO[k])}<b>${v}</b></button>`).join("")}<button type="button" onclick="APP.ceBank(${P})">${I("book-open")}<b>Traer del banco</b></button></div></div>`;
    return head + qs + pal;
  }

  function ceStudent(c, mi, l) {
    if (l.tipo === "examen") {
      const q0 = l.preguntas[0];
      return `<div class="cs-wrap"><p class="cs-crumb"><span data-notr>${esc(c.modulos[mi].nombre)}</span></p><h2 data-notr>${esc(l.titulo)}</h2>
        <div class="panel cs-exam"><span class="badge badge-dark">${I("clipboard-list")} Examen final</span><h3>${l.maxPreg && l.maxPreg < l.preguntas.length ? l.maxPreg : l.preguntas.length} preguntas · mínimo ${l.aprobatoria} % · ${l.intentos ? (l.intentos === 1 ? "1 intento" : l.intentos + " intentos") : "intentos sin límite"} · ${l.tiempo ? l.tiempo + " min" : "sin tiempo límite"}</h3>
          <p class="sub">${LAYOUT[l.layout]} · Se abre al terminar todas las lecciones y, al aprobarlo, se emite tu constancia. Al terminar ves solo tu calificación final.</p>
          ${q0 ? `<div class="cs-q"><b data-notr>1. ${esc(q0.texto || "Pregunta sin texto")}</b>${q0.tipo === "om" || q0.tipo === "rm" ? q0.opciones.map(o => `<label><input type="${q0.tipo === "rm" ? "checkbox" : "radio"}" name="csq"> <span data-notr>${esc(o || "—")}</span></label>`).join("") : q0.tipo === "vf" ? ["Verdadero", "Falso"].map(o => `<label><input type="radio" name="csq"> ${o}</label>`).join("") : `<input class="input" aria-label="Tu respuesta" maxlength="${l.lcAbierta}">`}</div>` : ""}
          <button class="btn btn-primary" onclick="APP.toast('En la plataforma el examen corre con tiempo validado en el servidor')">${I("play")} Empezar examen</button></div></div>`;
    }
    return `<div class="cs-wrap"><p class="cs-crumb"><span data-notr>${esc(c.modulos[mi].nombre)}</span></p><h2 data-notr>${esc(l.titulo)}</h2><p class="sub">${l.dur ? l.dur + " · " : ""}Se completa sola al terminar el video${l.desbloqueo ? " · disponible a partir del " + fechaMx(l.desbloqueo) : ""}</p>
      <div class="cs-video">${l.video.lib ? `<div class="kstage"><span class="kplate"><img src="assets/img/kiron-logo.png" alt="Kirón"></span><span class="vlabel">Bunny Stream</span></div><span class="lr-tag">Librería ${l.video.lib} · reproductor con token firmado</span>` : `<div class="cs-empty">${I("video")}<span>Falta pegar el video de Bunny</span></div>`}</div>
      ${l.adjuntos.length ? `<div class="panel" style="margin-top:16px"><h3>Archivos de la lección</h3>${l.adjuntos.map(a => `<div class="cs-docbar cs-dl">${I("download")}<div><b data-notr>${esc(a.nombre)}</b><small>${ceTam(a.tam)}</small></div><span class="grow"></span><button class="btn btn-ghost btn-sm" onclick="APP.toast('Descarga con enlace firmado de corta duración')">${I("download")} Descargar</button></div>`).join("")}</div>` : ""}
      <div class="cs-foot"><span class="auto-note">${I("circle-play")} La lección se marca sola al terminar el video</span></div></div>`;
  }
  const ceL = (ci, mi, li) => { const c = (S.newCourses || [])[ci]; return c && c.modulos[mi] ? c.modulos[mi].lecciones[li] : null; };
  function ceScrollLast() { setTimeout(() => { const bl = $$(".ce-main .ce-block"); const el = bl[bl.length - 1]; if (!el) return; if (lenis) lenis.scrollTo(el, { offset: -120 }); else el.scrollIntoView({ block: "center" }); const f = el.querySelector("input:not([type=checkbox]):not([type=radio]),textarea"); if (f) f.focus({ preventScroll: true }); }, 60); }

  /* ---------- Acciones ---------- */
  window.APP = {
    toast, closeModal,
    hideDemo(btn) { S.demoHidden = true; save(); btn.closest(".demo-bar").remove(); },
    lang() { S.lang = S.lang === "es" ? "en" : "es"; save(); route(); toast(S.lang === "en" ? "English version" : "Versión en español"); },
    scrollTo(id) { const el = document.getElementById(id); if (el) { if (lenis) lenis.scrollTo(el, { offset: -90 }); else el.scrollIntoView({ behavior: "smooth" }); } return false; },
    gate(e, role, dest) {
      if ((role === "mvz" && S.logged) || (role === "admin" && S.logged === "admin")) return true;
      e.preventDefault(); APP.login(role, dest); return false;
    },
    umenu(b) { const m = b.parentNode, o = !m.classList.contains("open"); m.classList.toggle("open", o); b.setAttribute("aria-expanded", o); if (o) setTimeout(() => document.addEventListener("click", function c(ev) { if (!m.contains(ev.target)) { m.classList.remove("open"); b.setAttribute("aria-expanded", false); document.removeEventListener("click", c); } }), 0); },
    login(role, dest, stay, tab) {
      if (role === "admin") {
        modal(mh("Administrador · acceso del equipo") + `<form class="modal-b" onsubmit="event.preventDefault();APP.doLogin('admin','${dest || "#/admin"}')">
          <div class="demo-user">${I("user")}<div><b>Usuario de demostración</b><span data-notr>admin@kiron-demo.mx · Kiron2026</span><small>Ya viene escrito. Solo toca Entrar al administrador.</small></div></div>
          <div class="form-row"><label class="l">Correo</label><input class="input" value="admin@kiron-demo.mx" required></div>
          <div class="form-row"><label class="l">Contraseña</label><input class="input" type="text" value="Kiron2026" required></div>
          <div class="form-row"><label class="l">Código de doble factor</label><input class="input otp" value="482 913" inputmode="numeric" required><small style="color:var(--muted);font-size:12.5px">Obligatorio para el equipo. En el demo ya viene escrito.</small></div>
          <button class="btn btn-primary btn-block" type="submit">${I("shield-check")} Entrar al administrador</button></form>`, true);
        return;
      }
      modal(mh("Tu cuenta de médico") + `<div class="modal-b">
        <div class="seg" style="margin-bottom:18px"><button type="button" class="on" id="tabIn" onclick="APP.loginTab(0)">Entrar</button><button type="button" id="tabUp" onclick="APP.loginTab(1)">Crear cuenta</button></div>
        <form id="fIn" onsubmit="event.preventDefault();APP.doLogin('mvz',${stay ? "null" : `'${dest || "#/panel"}'`})">
          <div class="form-row"><label class="l">Correo</label><input class="input" value="laura.mendez@clinica.mx" required></div>
          <div class="form-row"><label class="l">Contraseña</label><input class="input" type="password" value="demo-demo" required></div>
          <p style="font-size:12.5px;color:var(--muted);margin:-6px 0 14px">Si ya tenías cuenta en el sitio actual, entra con la misma contraseña.</p>
          <button class="btn btn-primary btn-block" type="submit">Entrar como Dra. Laura Méndez (demo)</button>
          <button class="link-team" type="button" onclick="APP.login('admin','#/admin')">${I("shield-check")} Soy del equipo Kirón: entrar al administrador</button></form>
        <form id="fUp" hidden onsubmit="event.preventDefault();APP.closeModal();APP.toast('Cuenta creada. Te pediremos tu cédula para verificarla.');APP.doLogin('mvz',${stay ? "null" : `'${dest || "#/panel"}'`})">
          <div class="grid2"><div class="form-row"><label class="l">Nombre</label><input class="input" required></div><div class="form-row"><label class="l">WhatsApp</label><input class="input" type="tel" required></div></div>
          <div class="form-row"><label class="l">Correo</label><input class="input" type="email" required></div>
          <div class="form-row"><label class="l">Cédula profesional</label><input class="input" inputmode="numeric"></div>
          <div class="form-row"><label class="l">Nivel académico</label><select class="select"><option>MVZ</option><option>Estudiante MVZ</option><option>PMVZ</option><option>EMVZ</option><option>Posgrado</option></select></div>
          <label class="check"><input type="checkbox" required> Acepto el <a href="#/legal/privacidad" onclick="APP.closeModal()">aviso de privacidad</a>.</label>
          <button class="btn btn-accent btn-block" type="submit">Crear cuenta</button></form></div>`, true);
      if (tab) APP.loginTab(1);
    },
    loginTab(i) { $("#tabIn").classList.toggle("on", !i); $("#tabUp").classList.toggle("on", !!i); $("#fIn").hidden = !!i; $("#fUp").hidden = !i; },
    doLogin(role, dest) { S.logged = role; save(); closeModal(); $("#modal").innerHTML = ""; if (dest) { if (location.hash === dest) route(); else location.hash = dest; } else { route(); } const nx = window.__next; window.__next = null; if (nx) setTimeout(nx, 350); if (!nx) toast(role === "admin" ? "Sesión del equipo iniciada con doble factor" : "Sesión iniciada · Dra. Laura Méndez (ejemplo)"); },
    logout() { S.logged = null; save(); if (location.hash === "#/" || location.hash === "") route(); else location.hash = "#/"; toast("Sesión cerrada"); },
    search(e, f) { e.preventDefault(); location.hash = "#/productos?q=" + encodeURIComponent(f.q.value.trim()); return false; },
    filter() { S.q = $("#q").value.trim(); renderGrid(); },
    clearQ() { S.q = ""; S.cat = "Todos"; location.hash = "#/productos?focus=1"; route(); },
    sort(v) { S.sort = v; renderGrid(); },
    tab(btn, i) { $$(".tabs button").forEach(b => b.classList.toggle("on", b === btn)); $$(".tabpane").forEach(p => p.hidden = +p.dataset.pane !== i); },
    play(id) {
      const el = document.getElementById(id); if (!el) return;
      el.innerHTML = `<div class="kstage"><span class="kplate"><img src="assets/img/kiron-logo.png" alt="Kirón"></span><span class="vlabel">Video de ejemplo</span></div>`;
    },
    videoModal(name) { modal(mh(name) + `<div class="modal-b"><div class="kstage-wrap"><div class="kstage"><span class="kplate"><img src="assets/img/kiron-logo.png" alt="Kirón"></span><span class="vlabel">Video de ejemplo</span></div></div><p style="font-size:13px;color:var(--muted);margin-top:10px">Video de ejemplo. En la plataforma se reproduce el video del producto desde Bunny Stream.</p></div>`); },
    recording(i) {
      const w = WEBINARS.past[i]; if (!w) return;
      if (!S.logged) { window.__next = () => APP.recording(i); APP.login("mvz", null, true); return; }
      modal(mh(w.title) + `<div class="modal-b" style="display:grid;grid-template-columns:200px 1fr;gap:22px" id="recGrid"><img src="${w.img}" alt="" style="border-radius:12px;width:100%"><div><span class="badge badge-soft">${w.line} · ${w.date}</span><p style="margin:10px 0">${w.sub}</p><p style="font-size:14px;color:var(--web-navy)"><b>${w.deg}</b> ${w.speaker}</p>
        <div class="player" id="recv" style="margin-top:16px"><span class="ptitle">Grabación · ejemplo</span><button class="playbtn" aria-label="Reproducir grabación" onclick="APP.play('recv')">${I("play")}</button></div>
        <button class="btn btn-ghost btn-sm" style="margin-top:14px" onclick="APP.certificate('webinar','KI-2026-001388')">${I("award")} Constancia de asistencia</button></div></div>`);
      if (innerWidth < 760) $("#recGrid").style.gridTemplateColumns = "1fr";
    },
    webinarReg() {
      if (!S.logged) { window.__next = () => APP.webinarReg(); APP.login("mvz", null, true); toast("Inicia sesión para registrarte al webinar"); return; }
      APP.webinarDone();
    },
    webinarDone() {
      S.webinar = true; save();
      modal(mh("Registro confirmado") + `<div class="modal-b" style="text-align:center"><div class="big-ok">${I("circle-check")}</div><h3 style="font-size:22px;margin:10px 0 6px">${WEBINARS.next.title}</h3><p style="color:var(--muted)">15/12/2026 · 20:00 Hrs (México). Ese día aparece el botón Entrar en tu panel. Te recordamos por correo 24 horas y 1 hora antes.</p>
        <button class="btn btn-primary" style="margin-top:20px" onclick="APP.ics()">${I("calendar")} Agregar a mi calendario</button><p style="font-size:12.5px;color:var(--muted);margin-top:10px">Descarga un archivo .ics para Google Calendar, Outlook o Apple.</p></div>`, true);
      const live = $$(".next-webinar"); if (live.length) setTimeout(route, 50);
    },
    ics() {
      const w = WEBINARS.next;
      download("webinar-kiron-15-12-2026.ics", ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Kirón//Demo//ES", "BEGIN:VEVENT", "UID:webinar-20261215@kironmexico.com", "DTSTAMP:20261118T120000Z", "DTSTART:20261216T020000Z", "DTEND:20261216T033000Z", `SUMMARY:Webinar Kirón · ${w.title}`, `DESCRIPTION:${w.sub}. Imparte ${w.deg} ${w.speaker}.`, "LOCATION:kironmexico.com · Mi panel", "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", "DESCRIPTION:Recordatorio", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n"), "text/calendar");
      toast("Evento descargado. Ábrelo para agregarlo a tu calendario.");
    },
    courseFilter(f) { S.courseFilter = f; save(); route(); setTimeout(() => APP.scrollTo("cursos"), 80); },
    /* Cursos gratuitos: el médico se inscribe solo y la inscripción queda aprobada. */
    enroll(slug) { if (!S.logged) { APP.login("mvz", "#/academia/curso/" + slug); return; } enrUpsert(ME, slug, "approved", "Inscripción en línea"); S.points += 20; save(); route(); toast("Inscripción confirmada · +20 puntos Club MVZ"); },
    /* Cursos con precio: no hay cobro en línea. Se crea una solicitud pendiente que aprueba el equipo. */
    checkout(slug) {
      if (!S.logged) { APP.login("mvz", "#/academia/curso/" + slug); return; }
      const c = courseBy(slug);
      modal(mh("Quiero inscribirme") + `<form class="modal-b" onsubmit="event.preventDefault();APP.enrRequest('${slug}')">
        <p style="margin-bottom:16px"><b>${c.title}</b> · ${money(c.price)}</p>
        <div class="form-row"><label class="l">Nombre</label><input class="input" value="Laura Méndez" required></div>
        <div class="grid2"><div class="form-row"><label class="l">Correo</label><input class="input" type="email" value="laura.mendez@clinica.mx" required></div><div class="form-row"><label class="l">Teléfono</label><input class="input" type="tel" required></div></div>
        <div class="notice" style="margin-bottom:16px">${I("info")}<span>El sitio no cobra en línea. El equipo de Academia te contacta y aprueba tu inscripción; en ese momento se abre el curso en tu panel.</span></div>
        <button class="btn btn-accent btn-block" type="submit">${I("send")} Enviar solicitud</button></form>`, true);
    },
    enrRequest(slug) { enrUpsert(ME, slug, "pending", "Solicitud del médico"); save(); closeModal(); route(); toast("Solicitud enviada. El equipo de Academia te contacta para confirmar tu inscripción."); },
    redeemCourse(slug) { if (!S.logged) { APP.login("mvz", "#/panel/club"); return; } location.hash = "#/panel/club"; setTimeout(() => toast("Este curso cuesta 3,000 puntos. Aquí ves tu saldo."), 300); },
    goLesson(slug, i) {
      const c = courseBy(slug), L = (c.lessons || 12) - 1, dl = dripOf(slug, i), prev = S.logged === "admin" && !acc(slug);
      if (dl) { toast(`Esta lección se abre el ${fechaMx(dl)}`); return; }
      S.curL = Object.assign({}, S.curL);
      if (i >= L) {
        if (!prev && !lessonsDone(slug)) { toast("Termina todas las lecciones para presentar el examen final"); return; }
        S.curL[slug] = -1; save(); route(); if (!S.grades[slug]) APP.exam(slug); return;
      }
      S.curL[slug] = i; save(); route();
      const p = $("#lvid"); if (p) { if (lenis) lenis.scrollTo(p, { offset: -120 }); else p.scrollIntoView({ block: "start" }); }
    },
    /* Simulación del reproductor de Bunny en el demo: el video avanza rápido. En la plataforma el avance lo reporta el
       reproductor cada 15 s y el servidor marca la lección cuando confirma el 100 % visto (sin saltos). El alumno no tiene
       ninguna función para marcar la lección a mano. */
    watch(slug) {
      const el = $("#lvid"); if (!el || window.__wT) return;
      const pb = el.querySelector(".playbtn"); if (!pb) return;
      const i = +el.dataset.i;
      pb.outerHTML = `<div class="kstage"><span class="kplate"><img src="assets/img/kiron-logo.png" alt="Kirón"></span><span class="vlabel">Reproduciendo · simulación ×60</span></div>`;
      const bar = $("#lbar"), tm = $("#ltime"), tot = (tm ? tm.textContent.split("/ ")[1] : "10:00").split(":").reduce((a, b) => a * 60 + +b, 0), dur = reduced ? 1500 : 5000, t0 = performance.now();
      window.__wT = setInterval(() => {
        const p = Math.min(1, (performance.now() - t0) / dur);
        if (bar) bar.style.width = (p * 100).toFixed(1) + "%";
        if (tm) tm.textContent = `${mmss(Math.round(p * tot))} / ${mmss(tot)}`;
        if (p >= 1 || !document.body.contains(el)) { clearInterval(window.__wT); window.__wT = null; if (p >= 1) APP.lessonAuto(slug, i); }
      }, 100);
    },
    lessonAuto(slug, i) {
      if (S.logged === "admin" && !acc(slug)) { toast("Vista de administrador: el video terminó, pero no se guarda avance"); return; }
      const L = (courseBy(slug).lessons || 12) - 1, d = lpOf(slug);
      if (!(i >= 0 && i < L)) return;
      if (d.includes(i)) { toast("Video al 100 % · esta lección ya estaba completada"); return; }
      d.push(i); d.sort((a, b) => a - b); S.points += 20; syncProg(slug);
      S.curL = Object.assign({}, S.curL, { [slug]: nextLesson(slug, d) });
      save(); route(); toast(d.length >= L ? "Video al 100 % · terminaste todas las lecciones. Ya puedes presentar el examen final." : "Video al 100 % · lección completada · +20 puntos Club MVZ");
    },
    exam(slug) {
      if (S.logged === "admin" && !acc(slug)) { toast("Vista de administrador: los exámenes se revisan desde el editor del curso"); return; }
      const key = slug, cfg = qcfg(key), mx = maxAtt(key), used = S.attempts[key] || 0, title = "Examen final";
      if (!lessonsDone(slug)) { toast("Termina todas las lecciones para presentar el examen final"); return; }
      if (cfg.desbloqueo && hoyIso() < cfg.desbloqueo) { toast(`Este examen se abre el ${fechaMx(cfg.desbloqueo)}`); return; }
      if (passed(key)) { toast("Ya aprobaste este examen"); return; }
      if (used >= mx) {
        const req = S.recoveries.find(r => r[0] === ME + " (tú)" && r[1] === key && r[2] === "pendiente");
        modal(mh(title) + `<div class="modal-b"><div class="big-ok lockd">${I("lock")}</div><h3 style="text-align:center;margin:8px 0">Agotaste tus intentos</h3><p style="text-align:center;color:var(--muted)">Usaste ${used} de ${mx} intentos. Terminaste las lecciones, pero sin aprobar el examen no se emite la constancia. Para presentar otra vez, la administración tiene que autorizar un intento adicional.</p>
          ${req ? `<div class="notice" style="margin-top:16px">${I("clock")}<span>Solicitud enviada. Te avisamos por correo cuando la autoricen.</span></div>` : `<button class="btn btn-accent btn-block" style="margin-top:18px" onclick="APP.recoveryReq('${key}')">${I("rotate-ccw")} Solicitar intento adicional</button>`}</div>`, true);
        return;
      }
      let qs = XQ.map((x, i) => Object.assign({ i }, x)); if (cfg.orden === "aleatorio") qs = shuffle(qs); if (cfg.maxPreg) qs = qs.slice(0, cfg.maxPreg);
      const one = cfg.layout === "una" && qs.length > 1;
      modal(mh(title + " · ejemplo") + `<form class="modal-b ${one ? "ex-one" : ""}" id="exF" novalidate data-start="${Date.now()}" onsubmit="return APP.grade(event,'${slug}')">
        <div class="exam-bar"><span>${I("rotate-ccw")} ${mx === Infinity ? "Intento " + (used + 1) : `Intento ${used + 1} de ${mx}`}</span>${cfg.tiempo ? `<span>${I("timer")} <b id="exT">${cfg.tiempo}:00</b></span>` : ""}<span>Mínimo ${cfg.aprobatoria} %</span></div>
        ${qs.map((x, k) => `<fieldset class="q ${one && k ? "hid" : ""}" data-q="${x.i}"><legend>${k + 1}. ${x.q}</legend><span class="qtype">${XQT[x.t]}</span>${x.o.map((o, j) => `<label class="opt"><input type="${x.t === "rm" ? "checkbox" : "radio"}" name="q${x.i}" value="${j}"> ${o}</label>`).join("")}</fieldset>`).join("")}
        ${one ? `<div class="ex-nav"><button type="button" class="btn btn-ghost btn-sm" id="exPrev" onclick="APP.exStep(-1)" disabled>${I("arrow-left")} Anterior</button><span id="exPos">1 / ${qs.length}</span><button type="button" class="btn btn-primary btn-sm" id="exNext" onclick="APP.exStep(1)">Siguiente ${I("arrow-right")}</button></div>` : ""}
        <button class="btn btn-accent btn-block" type="submit" id="exSend" ${one ? "hidden" : ""}>Enviar respuestas</button>
        <p class="ce-hint" style="justify-content:center;margin-top:10px">Al terminar verás tu calificación final.</p></form>`, true);
      clearInterval(window.__exT);
      if (cfg.tiempo) { let left = cfg.tiempo * 60; window.__exT = setInterval(() => { left--; const el = document.getElementById("exT"); if (!el) { clearInterval(window.__exT); return; } if (left <= 0) { clearInterval(window.__exT); const f = $("#exF"); if (f) f.requestSubmit(); return; } el.textContent = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0"); }, 1000); }
    },
    exStep(d) {
      const fs = $$("#exF fieldset.q"), cur = fs.findIndex(f => !f.classList.contains("hid")), nx = Math.max(0, Math.min(fs.length - 1, cur + d));
      fs.forEach((f, i) => f.classList.toggle("hid", i !== nx));
      $("#exPos").textContent = `${nx + 1} / ${fs.length}`; $("#exPrev").disabled = nx === 0; $("#exNext").hidden = nx === fs.length - 1; $("#exSend").hidden = nx !== fs.length - 1;
    },
    /* Calificación automática del demo. En la plataforma el servidor califica, guarda las preguntas que tocaron y rechaza
       envíos fuera del tiempo límite. Constancia = todas las lecciones al 100 % Y examen final aprobado; nada más la emite. */
    grade(e, slug) {
      e.preventDefault(); clearInterval(window.__exT);
      const f = e.target, key = slug, cfg = qcfg(key);
      const ans = $$("fieldset.q", f).map(fs => { const i = +fs.dataset.q, x = XQ[i], v = $$("input:checked", fs).map(n => +n.value); return { i, v, ok: v.length === x.c.length && v.every(y => x.c.includes(y)) }; });
      const nota = Math.round(ans.filter(a => a.ok).length / ans.length * 100) / 10;
      const secs = Math.max(1, Math.min(cfg.tiempo ? cfg.tiempo * 60 : 1e9, Math.round((Date.now() - +f.dataset.start) / 1000)));
      const ok = nota * 10 >= cfg.aprobatoria;
      S.attempts[key] = (S.attempts[key] || 0) + 1;
      S.qa = S.qa || {}; (S.qa[key] = S.qa[key] || []).push({ n: S.attempts[key], nota, ok, t: secs, f: hoyMx(), ans });
      let cert = false;
      if (ok) { S.grades[slug] = nota; syncProg(slug); cert = lessonsDone(slug); if (cert) S.points += 300; }
      save(); closeModal(); route(); APP.examResult(key, cert); return false;
    },
    examResult(key, cert) {
      const L = (S.qa || {})[key] || [], a = L[L.length - 1]; if (!a) return;
      const cfg = qcfg(key), mx = maxAtt(key), left = mx === Infinity ? Infinity : mx - (S.attempts[key] || 0), G = gs();
      const detail = !G.ocultar ? `<div class="q-res">${a.ans.map((r, n) => { const x = XQ[r.i]; return `<div class="${r.ok ? "ok" : "bad"}">${I(r.ok ? "circle-check" : "x")}<div><b>${n + 1}. ${x.q}</b><small>Correcta: ${x.c.map(j => x.o[j]).join(" · ")}</small></div></div>`; }).join("")}</div>` : "";
      modal(mh("Examen final") + `<div class="modal-b"><div class="res-big ${a.ok ? "ok" : "bad"}"><small>Tu calificación</small><b>${a.nota.toFixed(1)}</b><span class="state ${a.ok ? "st-ok" : "st-rev"}">${a.ok ? "Aprobado" : "No aprobado"}</span></div>
        <div class="rows rows-light"><div><span>Calificación mínima</span><b>${(cfg.aprobatoria / 10).toFixed(1)} (${cfg.aprobatoria} %)</b></div><div><span>Intento</span><b>${mx === Infinity ? a.n : a.n + " de " + mx}</b></div><div><span>Calificación final · ${CALC[cfg.calculo]}</span><b>${notaFinal(key).toFixed(1)}</b></div>${a.ok ? "" : `<div><span>Intentos restantes</span><b>${left === Infinity ? "Sin límite" : left}</b></div>`}</div>
        ${detail}
        ${cert ? `<div class="notice" style="margin-top:14px">${I("award")}<span>Terminaste el curso. Tu constancia ya está en tu panel · +300 puntos.</span></div>` : !a.ok ? `<div class="notice warn" style="margin-top:14px">${I("lock")}<span>${left <= 0 ? "Agotaste tus intentos. Sin aprobar el examen no se emite la constancia; puedes pedir un intento adicional desde el examen." : "Sin aprobar el examen no se emite la constancia. Puedes volver a presentarlo."}</span></div>` : ""}
        ${G.ocultar ? `<p class="ce-hint" style="justify-content:center;margin-top:12px">Solo se muestra tu calificación final.</p>` : ""}
        <button class="btn btn-primary btn-block" style="margin-top:14px" onclick="APP.closeModal()">Entendido</button></div>`, true);
    },
    recoveryReq(key) { S.recoveries.unshift([ME + " (tú)", key, "pendiente"]); save(); closeModal(); toast("Solicitud enviada. La administración autoriza el intento adicional."); },
    recovery(i, ok) {
      const r = S.recoveries[i]; r[2] = ok ? "autorizado" : "rechazado";
      if (ok) S.extra[xk(r[0], r[1])] = (S.extra[xk(r[0], r[1])] || 0) + 1;
      save(); route(); toast(ok ? "Intento adicional autorizado. Se avisó al alumno por correo." : "Solicitud rechazada. Se avisó al alumno.");
    },
    qNew() {
      modal(mh("Nueva pregunta") + `<form class="modal-b" onsubmit="return APP.qAdd(event)"><div class="form-row"><label class="l" for="qt">Pregunta</label><textarea class="input" id="qt" rows="3" required></textarea></div>
        <div class="grid2"><div class="form-row"><label class="l" for="qy">Tipo</label><select class="input" id="qy">${Object.values(CE_PREG).map(x => `<option>${x}</option>`).join("")}</select></div>
        <div class="form-row"><label class="l" for="qm">Tema</label><select class="input" id="qm">${["Oftalmología", "Otitis", "Dermatoendocrinología", "Inmunología", "Cardiología"].map(x => `<option>${x}</option>`).join("")}</select></div></div>
        <p style="font-size:12.5px;color:var(--muted);margin-bottom:16px">Las respuestas abiertas y cortas las califica el equipo desde el libro de calificaciones.</p>
        <button class="btn btn-primary btn-block" type="submit">${I("plus")} Agregar al banco</button></form>`, true);
    },
    webinarNew() {
      const f = "font-size:12.5px;color:var(--muted);margin:-12px 0 16px", h = t => `<h4 class="wf-h">${t}</h4>`;
      modal(mh("Nuevo webinar") + `<form class="modal-b" id="fWeb" novalidate onsubmit="return APP.webinarSave(event)">
        ${h("1. Datos del webinar")}
        <div class="grid2"><div class="form-row"><label class="l" for="wTi">Título en español</label><input class="input" id="wTi" maxlength="120" required oninput="APP.webinarSlug()"></div>
        <div class="form-row"><label class="l" for="wTe">Título en inglés</label><input class="input" id="wTe" maxlength="120" required></div></div>
        <div class="grid2"><div class="form-row"><label class="l" for="wSu">Subtítulo en español (opcional)</label><input class="input" id="wSu" maxlength="160"></div>
        <div class="form-row"><label class="l" for="wSe">Subtítulo en inglés (opcional)</label><input class="input" id="wSe" maxlength="160"></div></div>
        <p style="${f}">El sitio se publica en español e inglés: los dos títulos son obligatorios.</p>
        ${h("2. Ponente y horario")}
        <div class="grid2"><div class="form-row"><label class="l" for="wGr">Grado del ponente</label><select class="input" id="wGr">${["MVZ", "Dr.", "Dra.", "M. en C.", "Esp."].map(x => `<option>${x}</option>`).join("")}</select></div>
        <div class="form-row"><label class="l" for="wPo">Nombre del ponente</label><input class="input" id="wPo" maxlength="120" required autocomplete="off"></div></div>
        <div class="grid2"><div class="form-row"><label class="l" for="wFe">Fecha</label><input class="input" type="date" id="wFe" min="${hoyIso()}" required></div>
        <div class="form-row"><label class="l" for="wHo">Hora (centro de México)</label><input class="input" type="time" id="wHo" value="20:00" step="900" required></div></div>
        <div class="grid2"><div class="form-row"><label class="l" for="wDu">Duración</label><select class="input" id="wDu"><option value="60">60 minutos</option><option value="90" selected>90 minutos</option><option value="120">120 minutos</option></select></div>
        <div class="form-row"><label class="l" for="wUm">Minutos para contar asistencia</label><input class="input" type="number" id="wUm" value="45" min="1" max="120" required></div></div>
        <p style="${f}">Quien vea al menos estos minutos en vivo recibe asistencia, constancia y puntos del Club MVZ.</p>
        ${h("3. Flyer y landing")}
        <div class="wf-flyer"><div class="form-row" style="margin:0"><label class="l" for="wFl">Flyer o portada (JPG, PNG o WebP, máximo 2 MB)</label><input class="input file" type="file" id="wFl" accept="image/jpeg,image/png,image/webp" onchange="APP.webinarFlyer(this)">
          <p style="font-size:12.5px;color:var(--muted);margin:8px 0 0">Se muestra en la landing, en Academia y en los correos de recordatorio. Recomendado: 1080 × 1350 px.</p></div>
          <div class="wf-prev" id="wFb" aria-hidden="true">${I("video")}<img id="wFp" alt="Vista previa del flyer" hidden></div></div>
        <div class="form-row" style="margin-top:18px"><label class="l" for="wSl">Dirección de la landing</label><div class="wf-url"><span>kironmexico.com/es/webinar/</span><input class="input" id="wSl" maxlength="60" required oninput="this.dataset.manual='1'" data-notr></div>
          <p style="font-size:12.5px;color:var(--muted);margin:8px 0 0">Página propia del webinar: registro antes del evento y la transmisión dentro del sitio el día del evento. Se arma sola con el título; puedes ajustarla.</p></div>
        ${h("4. Transmisión")}
        <fieldset class="wf-modo"><legend class="sr">Cómo llega la transmisión a la landing</legend>
          <label class="wf-op"><input type="radio" name="wMo" value="cloudflare" checked onchange="APP.webinarModo()"><span><b>Zoom → reproductor del sitio (recomendado)</b><small>No pegas ningún enlace. Al guardar se crea la sala de transmisión y te damos la dirección y la clave que el ponente pone en Zoom (Transmitir en vivo, servicio personalizado). La landing toma la señal sola y mide la asistencia.</small></span></label>
          <label class="wf-op"><input type="radio" name="wMo" value="youtube" onchange="APP.webinarModo()"><span><b>YouTube en vivo no listado (respaldo)</b><small>Solo si la prueba con Zoom falla. El ponente transmite a YouTube y aquí pegas el enlace; la landing lo incrusta. El enlace podría compartirse fuera del sitio.</small></span></label>
        </fieldset>
        <div class="form-row" id="wYtRow" hidden><label class="l" for="wYt">Enlace de la transmisión en YouTube</label><input class="input" id="wYt" type="url" placeholder="https://www.youtube.com/live/..." data-notr></div>
        <label style="display:flex;gap:10px;align-items:center;margin:6px 0 18px;font-size:14px"><input type="checkbox" id="wPu" checked> Publicar en el sitio y abrir el registro</label>
        <p class="err" id="wEr" role="alert" style="color:#b42318;font-size:13.5px;margin-bottom:12px" hidden></p>
        <button class="btn btn-primary btn-block" type="submit">${I("plus")} Crear webinar</button></form>`);
      window.__flyer = null;
    },
    webinarSlug() { const sl = $("#wSl"); if (sl && !sl.dataset.manual) sl.value = slugify($("#wTi").value); },
    webinarModo() { const yt = $("input[name=wMo]:checked").value === "youtube"; $("#wYtRow").hidden = !yt; if (yt) $("#wYt").focus(); },
    webinarFlyer(inp) {
      const fl = inp.files && inp.files[0], pv = $("#wFp"), box = $("#wFb"); window.__flyer = null; pv.hidden = true; box.classList.remove("has");
      if (!fl) return;
      if (!/^image\/(jpeg|png|webp)$/.test(fl.type)) { inp.value = ""; toast("El flyer debe ser JPG, PNG o WebP"); return; }
      if (fl.size > 2 * 1024 * 1024) { inp.value = ""; toast("El flyer pesa más de 2 MB"); return; }
      const r = new FileReader(); r.onload = () => { window.__flyer = r.result; pv.src = r.result; pv.hidden = false; box.classList.add("has"); }; r.readAsDataURL(fl);
    },
    webinarSave(e) {
      e.preventDefault();
      const v = id => $(id).value.trim(), er = $("#wEr");
      const w = { titulo: v("#wTi"), subtitulo: v("#wSu"), tituloEn: v("#wTe"), subtituloEn: v("#wSe"), grado: $("#wGr").value, ponente: v("#wPo"), fecha: $("#wFe").value, hora: $("#wHo").value, duracion: +$("#wDu").value, umbral: +$("#wUm").value, publicado: $("#wPu").checked, slug: slugify(v("#wSl")), modo: $("input[name=wMo]:checked").value, youtube: v("#wYt") };
      let msg = "";
      if (!w.titulo || !w.tituloEn) msg = "Escribe el título en español y en inglés.";
      else if (!w.ponente) msg = "Escribe el nombre del ponente.";
      else if (!w.fecha || !/^\d{2}:\d{2}$/.test(w.hora)) msg = "Elige la fecha y la hora.";
      else if (new Date(`${w.fecha}T${w.hora}:00-06:00`).getTime() <= Date.now()) msg = "La fecha y la hora tienen que ser futuras.";
      else if (!(w.umbral >= 1 && w.umbral <= w.duracion)) msg = "Los minutos para contar asistencia van de 1 a la duración del webinar.";
      else if (!w.slug) msg = "Escribe la dirección de la landing.";
      else if (w.slug === "proximo" || (S.newWebinars || []).some(x => x.slug === w.slug)) msg = "Ya existe un webinar con esa dirección; cámbiala.";
      else if (w.modo === "youtube" && !ytId(w.youtube)) msg = "Pega un enlace válido de YouTube (youtube.com/live/…, youtu.be/… o watch?v=…).";
      if (msg) { er.textContent = msg; er.hidden = false; er.scrollIntoView({ block: "nearest" }); return false; }
      if (w.modo !== "youtube") w.youtube = "";
      w.flyer = window.__flyer || null; window.__flyer = null;
      w.clave = "demo-" + Math.random().toString(36).slice(2, 10);
      S.newWebinars = [w].concat(S.newWebinars || []); save(); route();
      APP.webinarStream(0, true);
      return false;
    },
    webinarStream(i, recien) {
      const w = (S.newWebinars || [])[i]; if (!w) return;
      const row = (l, val, id) => `<div class="form-row"><label class="l" for="${id}">${l}</label><div style="display:flex;gap:8px"><input class="input" id="${id}" value="${esc(val)}" readonly data-notr><button type="button" class="btn btn-ghost btn-sm" onclick="APP.copy('${id}')">${I("copy")} Copiar</button></div></div>`;
      const datos = w.modo === "youtube"
        ? `<div class="notice" style="margin-bottom:16px">${I("info")}<span>Respaldo con YouTube: el ponente transmite a YouTube en vivo como no listado y la landing incrusta ese enlace.</span></div>${row("Enlace de YouTube", w.youtube, "wRy")}`
        : `<h4 class="wf-h">Datos para el ponente (Zoom)</h4>${row("Dirección del servidor (URL de transmisión)", "rtmps://live.cloudflare.com:443/live/", "wRu")}${row("Clave de transmisión", w.clave, "wRk")}
          <ol style="font-size:14px;line-height:1.6;padding-left:20px;margin:6px 0 16px"><li>El ponente abre su reunión en Zoom con cuenta de pago.</li><li>Más, Transmitir en vivo, Servicio de transmisión en vivo personalizado.</li><li>Pega la dirección del servidor y la clave, y en página de transmisión pone la dirección de la landing.</li><li>Inicia la transmisión 15 minutos antes para probar audio y video.</li></ol>`;
      modal(mh(recien ? "Webinar creado" : "Transmisión y landing") + `<div class="modal-b" data-lenis-prevent>
        <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:18px">${w.flyer ? `<img src="${w.flyer}" alt="Flyer del webinar" style="width:110px;border-radius:10px;flex:none">` : ""}<div><h3 style="font-size:20px;margin:0 0 4px" data-notr>${esc(w.titulo)}</h3><p style="color:var(--muted);margin:0"><span>${fechaMx(w.fecha)} · ${w.hora} Hrs (México) · ${w.duracion} min</span> · <span data-notr>${esc(w.grado + " " + w.ponente)}</span></p></div></div>
        <h4 class="wf-h">Landing del webinar</h4>
        ${row("Dirección pública", landingUrl(w.slug), "wRl")}
        <a class="btn btn-ghost btn-sm" style="margin:-6px 0 18px" href="#/webinar/${w.slug}" onclick="APP.closeModal()">${I("eye")} Abrir la landing</a>
        ${datos}
        <p style="font-size:12.5px;color:var(--muted);margin:0">Datos de ejemplo. En la plataforma, la clave la genera Cloudflare Stream, solo la ve el equipo con doble factor y no se envía por correo.</p></div>`);
    },
    wbView(slug, v) { S.wbView = Object.assign({}, S.wbView, { [slug]: v }); save(); route(); },
    wbReg(slug) {
      if (!S.logged) { window.__next = () => APP.wbReg(slug); APP.login("mvz", null, true); toast("Inicia sesión para registrarte al webinar"); return; }
      if (slug === "proximo") S.webinar = true; else S.webReg = Object.assign({}, S.webReg, { [slug]: true });
      save(); route(); toast("Registro confirmado. Te recordamos por correo 24 horas y 1 hora antes.");
    },
    wbAttend(slug) {
      if (wbAtt(slug)) return;
      if (slug === "proximo") S.attended = true; else S.webAtt = Object.assign({}, S.webAtt, { [slug]: true });
      S.points += 50; save(); route(); toast("Asistencia registrada · +50 puntos Club MVZ");
    },
    wbIcs(slug) {
      if (slug === "proximo") return APP.ics();
      const w = webinarBy(slug); if (!w) return;
      const t = d => new Date(d).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
      const fin = new Date(new Date(w.inicio).getTime() + w.duracion * 6e4);
      download(`webinar-kiron-${slug}.ics`, ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Kirón//Demo//ES", "BEGIN:VEVENT", `UID:webinar-${slug}@kironmexico.com`, `DTSTAMP:${t(Date.now())}`, `DTSTART:${t(w.inicio)}`, `DTEND:${t(fin)}`, `SUMMARY:Webinar Kirón · ${w.titulo.replace(/[,;\n]/g, " ")}`, `URL:https://${landingUrl(slug)}`, "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", "DESCRIPTION:Recordatorio", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n"), "text/calendar");
      toast("Evento descargado. Ábrelo para agregarlo a tu calendario.");
    },
    copy(id) { const el = $("#" + id); if (!el) return; el.select(); (navigator.clipboard ? navigator.clipboard.writeText(el.value) : Promise.reject()).then(() => toast("Copiado"), () => { document.execCommand("copy"); toast("Copiado"); }); },
    courseNew() {
      const cats = [...new Set(COURSES.map(c => c.cat).filter(Boolean))];
      modal(mh("Nuevo curso") + `<form class="modal-b" id="fCur" novalidate onsubmit="return APP.courseSave(event)">
        <div class="grid2"><div class="form-row"><label class="l" for="cTi">Título en español</label><input class="input" id="cTi" maxlength="140" required></div>
        <div class="form-row"><label class="l" for="cTe">Título en inglés</label><input class="input" id="cTe" maxlength="140" required></div></div>
        <div class="grid2"><div class="form-row"><label class="l" for="cTy">Tipo</label><select class="input" id="cTy"><option>Curso</option><option>Diplomado</option></select></div>
        <div class="form-row"><label class="l" for="cCa">Categoría</label><select class="input" id="cCa">${cats.map(c => `<option>${esc(c)}</option>`).join("")}<option>Curso independiente</option></select></div></div>
        <div class="grid2"><div class="form-row"><label class="l" for="cIn">Autor o ponente (solo se muestra)</label><input class="input" id="cIn" maxlength="120" required autocomplete="off"></div>
        <div class="form-row"><label class="l" for="cNi">Nivel de dificultad</label><select class="input" id="cNi">${NIVELES.map(x => `<option>${x}</option>`).join("")}</select></div></div>
        <div class="grid2"><div class="form-row"><label class="l" for="cPr">Precio regular en MXN, IVA incluido</label><input class="input" type="number" id="cPr" min="0" step="1" value="0" required></div>
        <div class="form-row"><label class="l" for="cPo">Precio de oferta en MXN, IVA incluido (0 = gratuito)</label><input class="input" type="number" id="cPo" min="0" step="1" value="0" required></div></div>
        <p style="font-size:12.5px;color:var(--muted);margin:-12px 0 16px">El precio solo se muestra. No se cobra en línea ni da acceso: el médico solicita y el equipo aprueba su inscripción.</p>
        <div class="form-row"><label class="l" for="cPt">Imagen destacada (JPG, PNG o WebP, máximo 2 MB)</label><input class="input file" type="file" id="cPt" accept="image/jpeg,image/png,image/webp" onchange="APP.courseCover(this)"></div>
        <h4 style="margin:4px 0 10px">Módulos</h4>
        <div id="cMods"></div>
        <button type="button" class="btn btn-ghost btn-sm" onclick="APP.courseModAdd()">${I("plus")} Agregar módulo</button>
        <p style="font-size:12.5px;color:var(--muted);margin:10px 0 18px">Los módulos solo agrupan lecciones. El curso tiene un solo examen, al final; sus intentos, calificación aprobatoria y tiempo límite se definen en el editor.</p>
        <p class="notice" style="margin-bottom:18px">${I("info")}<span>El curso se crea como borrador y se abre el editor para cargar el video de Bunny, la duración y los archivos de cada lección. Lo publicas desde ahí cuando esté completo.</span></p>
        <p class="err" id="cEr" role="alert" style="color:#b42318;font-size:13.5px;margin-bottom:12px" hidden></p>
        <button class="btn btn-primary btn-block" type="submit">${I("plus")} Crear curso y abrir el editor</button></form>`);
      window.__cover = null; APP.courseModAdd(); APP.courseModAdd();
    },
    courseModAdd() {
      const box = $("#cMods"); if (!box) return;
      const n = box.children.length + 1; if (n > 12) { toast("Máximo 12 módulos por curso"); return; }
      const row = document.createElement("div");
      row.className = "cmod"; row.style.cssText = "display:grid;grid-template-columns:1fr 110px auto;gap:10px;align-items:end;margin-bottom:12px";
      row.innerHTML = `<div><label class="l" style="display:block;font:600 13px var(--f-body);color:var(--muted);margin-bottom:6px">Módulo ${n}</label><input class="input cm-n" maxlength="120" placeholder="Nombre del módulo"></div>
        <div><label class="l" style="display:block;font:600 13px var(--f-body);color:var(--muted);margin-bottom:6px">Lecciones</label><input class="input cm-l" type="number" min="1" max="60" value="4"></div>
        <button type="button" class="icon-btn" aria-label="Quitar módulo" onclick="APP.courseModDel(this)">${I("x")}</button>`;
      box.appendChild(row);
      if (window.I18N) I18N.apply(row);
    },
    courseModDel(btn) {
      const box = $("#cMods"); if (box.children.length <= 1) { toast("El curso necesita al menos un módulo"); return; }
      btn.closest(".cmod").remove();
      [...box.children].forEach((r, i) => { r.querySelector("label.l").textContent = "Módulo " + (i + 1); });
    },
    courseCover(inp) {
      const fl = inp.files && inp.files[0]; window.__cover = null; if (!fl) return;
      if (!/^image\/(jpeg|png|webp)$/.test(fl.type)) { inp.value = ""; toast("La portada debe ser JPG, PNG o WebP"); return; }
      if (fl.size > 2 * 1024 * 1024) { inp.value = ""; toast("La portada pesa más de 2 MB"); return; }
      const r = new FileReader(); r.onload = () => { window.__cover = r.result; }; r.readAsDataURL(fl);
    },
    courseSave(e) {
      e.preventDefault();
      const v = id => $(id).value.trim(), er = $("#cEr");
      const modulos = [...$$("#cMods .cmod")].map(r => ({ nombre: r.querySelector(".cm-n").value.trim(), lecciones: +r.querySelector(".cm-l").value }));
      const c = { titulo: v("#cTi"), tituloEn: v("#cTe"), tipo: $("#cTy").value, categoria: $("#cCa").value, instructor: v("#cIn"), nivel: $("#cNi").value, precioRegular: +$("#cPr").value, precio: +$("#cPo").value, estado: "borrador", fecha: hoyMx(), descripcion: "", modulos };
      let msg = "";
      if (!c.titulo || !c.tituloEn) msg = "Escribe el título en español y en inglés.";
      else if (!c.instructor) msg = "Escribe el nombre del autor o ponente.";
      else if (![c.precio, c.precioRegular].every(x => Number.isInteger(x) && x >= 0)) msg = "Los precios van en pesos enteros, 0 si es gratuito.";
      else if (c.precio > c.precioRegular && c.precioRegular > 0) msg = "El precio de oferta no puede ser mayor que el regular.";
      else if (!modulos.length || modulos.some(m => !m.nombre)) msg = "Cada módulo necesita nombre.";
      else if (modulos.some(m => !Number.isInteger(m.lecciones) || m.lecciones < 1 || m.lecciones > 60)) msg = "Cada módulo lleva de 1 a 60 lecciones.";
      if (msg) { er.textContent = msg; er.hidden = false; if (window.I18N) I18N.apply(er); return false; }
      if (!c.precioRegular) c.precioRegular = c.precio;
      c.portada = window.__cover || null; window.__cover = null;
      ceNorm(c); S.cePrev = false; S.newCourses = [c].concat(S.newCourses || []); save(); closeModal(); location.hash = ceHref(0, 0, 0);
      toast("Curso creado como borrador. Carga el video y los archivos de cada lección.");
      return false;
    },
    ceBasicsSave(e, ci) {
      e.preventDefault();
      const c = S.newCourses[ci], v = id => $(id).value.trim(), er = $("#bEr");
      const d = { titulo: v("#bTi"), tituloEn: v("#bTe"), descripcion: $("#bDe").value, tipo: $("#bTy").value, categoria: $("#bCa").value, nivel: $("#bNi").value, instructor: v("#bAu"), precioRegular: +$("#bPr").value, precio: +$("#bPo").value, estado: $("#bEs").value, fechaProg: $("#bFp").value };
      let msg = "";
      if (!d.titulo || !d.tituloEn) msg = "Escribe el título en español y en inglés.";
      else if (!d.instructor) msg = "Escribe el nombre del autor o ponente.";
      else if (![d.precio, d.precioRegular].every(x => Number.isInteger(x) && x >= 0)) msg = "Los precios van en pesos enteros, 0 si es gratuito.";
      else if (d.precio > d.precioRegular && d.precioRegular > 0) msg = "El precio de oferta no puede ser mayor que el regular.";
      else if (d.estado === "programado" && !(d.fechaProg && d.fechaProg > hoyIso())) msg = "Elige una fecha de publicación futura.";
      if (msg) { er.textContent = msg; er.hidden = false; if (window.I18N) I18N.apply(er); return false; }
      const want = d.estado; Object.assign(c, d); if (!c.precioRegular) c.precioRegular = c.precio;
      if (window.__cover) { c.portada = window.__cover; window.__cover = null; }
      if (want === "publicado" || want === "programado") { const p = ceIssues(c); if (p.length) { c.estado = "borrador"; c.publicado = false; save(); route(); APP.ceIssuesShow(p); return false; } }
      c.publicado = c.estado === "publicado"; save(); route(); toast(want === "programado" ? `Curso programado para el ${fechaMx(d.fechaProg)}` : "Datos del curso guardados"); return false;
    },
    ceDescPrev(v) { const el = $("#bDp"); if (el) el.innerHTML = cleanHtml(v) || "<p>Sin descripción.</p>"; },
    ceSet(ci, mi, li, bi, k, v) { const l = ceL(ci, mi, li); if (!l) return; l[k] = v; save(); if (k === "titulo" || k === "retro" || k === "layout" || k === "calculo") route(); },
    ceDur(ci, mi, li, v) { const t = String(v || "").trim(); if (t && !/^\d{1,3}:\d{2}(:\d{2})?$/.test(t)) { toast("Escribe la duración como min:seg, por ejemplo 12:40"); return; } ceL(ci, mi, li).dur = t; save(); route(); },
    ceVideo(ci, mi, li, val) {
      const ids = bunnyIds(val), l = ceL(ci, mi, li);
      if (!ids) { toast("No encontramos la librería y el ID del video en lo que pegaste"); return; }
      l.video = { lib: ids.lib, vid: ids.vid }; save(); route(); toast("Video vinculado a Bunny Stream");
    },
    ceVideoTest(ci, mi, li) {
      const v = ceL(ci, mi, li).video; if (!v.lib) return;
      modal(mh("Prueba del reproductor") + `<div class="modal-b"><div style="position:relative;aspect-ratio:16/9;background:#000;border-radius:12px;overflow:hidden"><iframe src="https://iframe.mediadelivery.net/embed/${encodeURIComponent(v.lib)}/${encodeURIComponent(v.vid)}?autoplay=false&preload=false&responsive=true" title="Reproductor de Bunny Stream" loading="lazy" allow="accelerometer;gyroscope;encrypted-media;picture-in-picture" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe></div>
        <p style="font-size:12.5px;color:var(--muted);margin:12px 0 0">Si tu librería tiene activada la autenticación por token, aquí verás un error 403: es lo esperado. En la plataforma el servidor firma cada reproducción.</p></div>`);
    },
    ceAdj(ci, mi, li, inp) {
      const l = ceL(ci, mi, li), fs = [...(inp.files || [])]; let bad = 0;
      fs.forEach(f => { if (!/\.(pdf|docx?|xlsx?|pptx?|zip)$/i.test(f.name) || f.size > 50 * 1048576) { bad++; return; } l.adjuntos.push({ nombre: f.name.slice(0, 120), tam: f.size, key: Date.now().toString(36) + Math.random().toString(36).slice(2, 5) }); });
      save(); route(); toast(bad ? `${fs.length - bad} archivos agregados; ${bad} no son de un tipo permitido o pesan más de 50 MB` : "Archivos listos. En la plataforma se guardan en almacenamiento privado.");
    },
    ceAdjDel(ci, mi, li, k) { ceL(ci, mi, li).adjuntos.splice(k, 1); save(); route(); toast("Archivo quitado"); },
    ceLesAdd(ci, mi, tipo) {
      const m = S.newCourses[ci].modulos[mi], c = S.newCourses[ci];
      const at = m.lecciones.length;
      m.lecciones.splice(at, 0, ceLeccion(`Lección ${m.lecciones.filter(l => l.tipo === "leccion").length + 1}`));
      save(); location.hash = ceHref(ci, mi, at);
    },
    ceLesMove(ci, mi, li, d) {
      const a = S.newCourses[ci].modulos[mi].lecciones, j = li + d;
      if (j < 0 || j >= a.length) return; if (a[j].tipo === "examen") { toast("El examen va al final del módulo"); return; }
      [a[li], a[j]] = [a[j], a[li]]; save(); location.hash = ceHref(ci, mi, j);
    },
    ceLesDel(ci, mi, li) {
      const a = S.newCourses[ci].modulos[mi].lecciones; if (a[li] && a[li].final) return;
      a.splice(li, 1); save(); toast("Elemento eliminado del temario"); const n = Math.max(li - 1, 0); if (location.hash === ceHref(ci, mi, n)) route(); else location.hash = ceHref(ci, mi, n);
    },
    ceModAdd(ci) {
      const ms = S.newCourses[ci].modulos, at = ms.findIndex(m => m.final), pos = at < 0 ? ms.length : at;
      ms.splice(pos, 0, { nombre: `Módulo ${pos + 1}`, lecciones: [ceLeccion("Lección 1")] });
      save(); location.hash = ceHref(ci, pos, 0);
    },
    ceModName(ci, mi, v) { const t = v.trim(); if (t) { S.newCourses[ci].modulos[mi].nombre = t.slice(0, 120); save(); } },
    cePrev() { S.cePrev = !S.cePrev; save(); route(); },
    ceIssuesShow(p) { modal(mh("Antes de publicar") + `<div class="modal-b"><p style="margin-top:0">Hay ${p.length} pendientes. Mientras tanto el curso sigue como borrador y se guarda solo.</p><ul class="ce-issues">${p.slice(0, 14).map(x => `<li data-notr>${esc(x)}</li>`).join("")}</ul>${p.length > 14 ? `<p style="color:var(--muted)">y ${p.length - 14} más.</p>` : ""}<button class="btn btn-primary btn-block" onclick="APP.closeModal()">Entendido</button></div>`, true); },
    cePublish(ci) {
      const c = S.newCourses[ci], p = ceIssues(c);
      if (p.length) { APP.ceIssuesShow(p); return; }
      c.estado = "publicado"; c.publicado = true; save(); route(); toast("Curso publicado. Ya aparece en Academia.");
    },
    ceQAdd(ci, mi, li, tipo) { ceL(ci, mi, li).preguntas.push(ceQNew(tipo)); save(); route(); ceScrollLast(); },
    ceQ(ci, mi, li, i, k, v) { ceL(ci, mi, li).preguntas[i][k] = v; save(); },
    ceQDel(ci, mi, li, i) { ceL(ci, mi, li).preguntas.splice(i, 1); save(); route(); toast("Pregunta eliminada"); },
    ceQOpt(ci, mi, li, i, k, v) { ceL(ci, mi, li).preguntas[i].opciones[k] = v; save(); },
    ceQOptAdd(ci, mi, li, i) { ceL(ci, mi, li).preguntas[i].opciones.push(""); save(); route(); },
    ceQCorr(ci, mi, li, i, k, on) { const q = ceL(ci, mi, li).preguntas[i]; if (q.tipo === "rm") q.correctas = on ? [...new Set(q.correctas.concat(k))] : q.correctas.filter(x => x !== k); else q.correctas = [k]; save(); },
    ceQPar(ci, mi, li, i, k, s, v) { ceL(ci, mi, li).preguntas[i].pares[k][s] = v; save(); },
    ceQParAdd(ci, mi, li, i) { ceL(ci, mi, li).preguntas[i].pares.push(["", ""]); save(); route(); },
    /* Exportar e importar exámenes (complemento Quiz Export/Import). Formato JSON propio, validado al importar. */
    ceExport(ci, mi, li) {
      const l = ceL(ci, mi, li), aj = {}; QKEYS.forEach(k => { aj[k] = l[k]; });
      download(`examen-${slugify(l.titulo) || "kiron"}.json`, JSON.stringify({ formato: "kiron-examen", version: 1, titulo: l.titulo, ajustes: aj, preguntas: l.preguntas }, null, 2), "application/json");
      toast("Examen exportado");
    },
    ceImport(ci, mi, li, inp) {
      const f = inp.files && inp.files[0]; if (!f) return; inp.value = "";
      if (f.size > 2 * 1048576) { toast("El archivo pesa más de 2 MB"); return; }
      const r = new FileReader();
      r.onload = () => {
        let d; try { d = JSON.parse(r.result); } catch (e) { toast("El archivo no es un examen válido"); return; }
        if (!d || d.formato !== "kiron-examen" || !Array.isArray(d.preguntas) || d.preguntas.length > 200) { toast("El archivo no es un examen exportado desde la academia"); return; }
        const str = (x, n) => String(x ?? "").slice(0, n), arr = (x, n, m) => (Array.isArray(x) ? x : []).slice(0, n).map(y => str(y, m));
        const qs = d.preguntas.filter(q => q && CE_PREG[q.tipo]).map(q => Object.assign(ceQNew(q.tipo), { texto: str(q.texto, 600), puntos: Math.max(1, Math.min(10, +q.puntos || 1)), requerida: q.requerida !== false, mezclar: !!q.mezclar, explicacion: str(q.explicacion, 400), opciones: arr(q.opciones, 10, 200), correctas: (Array.isArray(q.correctas) ? q.correctas : []).map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < 10), pares: (Array.isArray(q.pares) ? q.pares : []).slice(0, 8).map(p => [str((p || [])[0], 160), str((p || [])[1], 160)]), modelo: str(q.modelo, 2000) }));
        const l = ceL(ci, mi, li); l.preguntas.push(...qs); save(); route(); toast(qs.length === 1 ? "1 pregunta importada" : `${qs.length} preguntas importadas`);
      };
      r.readAsText(f);
    },
    ceBank(ci, mi, li) {
      modal(mh("Traer preguntas del banco") + `<form class="modal-b" onsubmit="return APP.ceBankAdd(event,${ci},${mi},${li})">${S.bank.map((q, k) => `<label class="list-row" style="cursor:pointer"><input type="checkbox" name="bq" value="${k}"><div><b data-notr>${esc(q[0])}</b><small>${q[1]} · ${q[2]}</small></div></label>`).join("")}
        <button class="btn btn-primary btn-block" style="margin-top:14px" type="submit">${I("plus")} Agregar seleccionadas</button></form>`);
    },
    ceBankAdd(e, ci, mi, li) {
      e.preventDefault(); const sel = [...e.target.querySelectorAll("input[name=bq]:checked")].map(x => +x.value); if (!sel.length) { toast("Elige al menos una pregunta"); return false; }
      const map = Object.fromEntries(Object.entries(CE_PREG).map(([k, v]) => [v, k]));
      sel.forEach(k => { const q = S.bank[k], t = map[q[1]] || "om"; ceL(ci, mi, li).preguntas.push(Object.assign(ceQNew(t), { texto: q[0] })); q[3] += 1; });
      save(); closeModal(); route(); toast(sel.length === 1 ? "1 pregunta agregada desde el banco" : `${sel.length} preguntas agregadas desde el banco`); return false;
    },
    qAdd(e) { e.preventDefault(); S.bank.unshift([$("#qt").value.trim(), $("#qy").value, $("#qm").value, 0]); save(); closeModal(); route(); toast("Pregunta agregada al banco"); return false; },
    gbFilter(v) { S.gbFilter = v; save(); route(); },
    history(i) {
      const r = gbRows()[i]; const c = courseBy(r[1]); const n = c.lessons || 12; const done = Math.round(r[2] / 100 * n);
      const ev = [["Se inscribió al curso", "user"], [`Completó ${done} de ${n} lecciones`, "book-open"]];
      for (let k = 1; k <= r[4]; k++) ev.push([k === r[4] && r[3] ? `Examen final · intento ${k} · ${r[3].toFixed(1)}` : `Examen final · intento ${k} · no aprobado`, "list-checks"]);
      ev.unshift(["Inscripción " + (EST[((enrList().find(x => x.u === r[0] && x.s === r[1]) || {}).st) || "approved"][0]).toLowerCase(), "badge-check"]);
      if (r[3]) ev.push(["Constancia emitida", "award"]);
      ev.push([`Último acceso: ${r[5]}`, "clock"]);
      modal(mh(r[0]) + `<div class="modal-b"><p style="color:var(--muted);margin-bottom:14px">${c.title} · historial de ejemplo</p><div class="hist">${ev.map(x => `<div>${I(x[1])}<span>${x[0]}</span></div>`).join("")}</div></div>`, true);
    },
    importOpen() {
      modal(mh("Importar alumnos") + `<div class="modal-b" id="impB"><label class="drop"><input type="file" accept=".csv,.xlsx,.xls" hidden onchange="APP.importRun(this.files[0]&&this.files[0].name)">${I("upload")}<b>Elige tu archivo</b><small>Excel o CSV</small></label><button class="btn btn-ghost btn-block" style="margin-top:12px" onclick="APP.importRun('alumnos-ejemplo.xlsx')">Usar un archivo de ejemplo</button></div>`, true);
    },
    importRun(name) {
      if (!name) return;
      const rows = [["MVZ Karla Medina", "karla.medina@correo.mx", "Equipo clínico Bajío"], ["MVZ Óscar Lozano", "oscar.lozano@correo.mx", "Equipo clínico Bajío"], ["MVZ Daniela Ríos", "daniela.rios@correo.mx", "Equipo clínico Bajío"], ["MVZ Tomás Villa", "tomas.villa@correo.mx", "Equipo clínico Bajío"]];
      $("#impB").innerHTML = `<p style="color:var(--muted);margin-bottom:12px">${esc(name)} · vista previa con datos de ejemplo</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Nombre</th><th>Correo</th><th>Grupo</th></tr></thead><tbody>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join("")}</tbody></table></div>
        <div class="rows" style="margin:14px 0"><div><span>Alumnos válidos</span><b>4</b></div><div><span>Correos repetidos (se omiten)</span><b>0</b></div></div>
        <button class="btn btn-primary btn-block" onclick="APP.importDone(4)">${I("check")} Inscribir 4 alumnos</button>`;
    },
    importDone(n) { const g = S.groups.find(x => x[0] === "Equipo clínico Bajío"); if (g) g[1] += n; save(); closeModal(); route(); toast(`${n} alumnos inscritos y agregados a su grupo. Recibieron su acceso por correo.`); },
    template() { download("plantilla-alumnos.csv", "﻿nombre,correo,whatsapp,cedula,grupo\n", "text/csv;charset=utf-8"); toast("Plantilla descargada"); },
    groupAdd(e) { e.preventDefault(); S.groups.push([$("#gn").value.trim(), 0, "", "", 0]); save(); route(); toast("Grupo creado. Ya puedes importar alumnos y asignarle un curso."); return false; },
    groupAssign(i) {
      const g = S.groups[i];
      modal(mh("Asignar curso al grupo") + `<form class="modal-b" onsubmit="return APP.groupSave(event,${i})"><p style="color:var(--muted);margin-bottom:14px">${esc(g[0])}</p><div class="form-row"><label class="l" for="ga">Curso o diplomado</label><select class="input" id="ga">${COURSES.map(c => `<option value="${c.slug}" ${g[2] === c.slug ? "selected" : ""}>${c.title}</option>`).join("")}</select></div>
        <div class="form-row"><label class="l" for="gd">Fecha límite</label><input class="input" id="gd" type="date" required value="2027-01-31"></div><button class="btn btn-primary btn-block" type="submit">Asignar</button></form>`, true);
    },
    groupSave(e, i) { e.preventDefault(); const d = $("#gd").value.split("-"); S.groups[i][2] = $("#ga").value; S.groups[i][3] = `${d[2]}/${d[1]}/${d[0]}`; save(); closeModal(); route(); toast("Curso asignado. Los alumnos del grupo ya lo ven en su panel."); return false; },
    groupView(i) {
      const g = S.groups[i]; const m = GB.filter(r => r[6] === i);
      modal(mh(esc(g[0])) + `<div class="modal-b"><p style="color:var(--muted);margin-bottom:14px">${g[2] ? ctitle(g[2]) + " · vence " + g[3] : "Sin curso asignado"} · alumnos de ejemplo</p>
        ${m.length ? m.map(r => `<div class="list-row"><span class="avatar" style="width:34px;height:34px;font-size:12px">${r[0].split(" ").slice(-2).map(x => x[0]).join("")}</span><div><b>${r[0]}</b><small>${r[2]}% · ${ctitle(r[1])}</small></div></div>`).join("") : `<p class="sub">Todavía no hay alumnos en este grupo.</p>`}
        <button class="btn btn-ghost btn-block" style="margin-top:14px" onclick="APP.closeModal();APP.toast('Recordatorio enviado al grupo por correo')">${I("bell")} Enviar recordatorio al grupo</button></div>`, true);
    },
    autoToggle(i, k) { S.autos[i][k] = !S.autos[i][k]; save(); route(); },
    autoPreview(i) { modal(mh(AUTOS[i][0]) + `<div class="modal-b"><p style="color:var(--muted);margin-bottom:12px">${AUTOS[i][1]}</p><div class="mail-prev"><small>Asunto: ${AUTOS[i][0]} · Academia Kirón</small><p>${AUTOS[i][2]}</p></div><p style="font-size:12.5px;color:var(--muted);margin-top:12px">Los campos entre llaves se llenan con los datos de cada alumno.</p></div>`, true); },
    report(kind, fmt) {
      const rows = gbRows(); let head, data;
      if (kind === "curso") { head = ["Curso", "Inscritos", "Aprobados", "Calificación promedio"]; data = COURSES.map(c => { const r = rows.filter(x => x[1] === c.slug), a = r.filter(x => x[3]); return [c.title, r.length, a.length, a.length ? (a.reduce((s, x) => s + x[3], 0) / a.length).toFixed(1) : "—"]; }); }
      else if (kind === "instructor") { head = ["Instructor", "Curso", "Alumnos", "Calificación promedio"]; data = COURSES.map((c, i) => { const r = rows.filter(x => x[1] === c.slug), a = r.filter(x => x[3]); return ["Instructor " + (i + 1) + " (ejemplo)", c.title, r.length, a.length ? (a.reduce((s, x) => s + x[3], 0) / a.length).toFixed(1) : "—"]; }); }
      else if (kind === "avance") { head = ["Alumno", "Curso", "Avance %"]; data = rows.map(r => [r[0], ctitle(r[1]), r[2]]); }
      else if (kind === "inactividad") { head = ["Alumno", "Curso", "Último acceso", "Avance %"]; data = rows.filter(r => INACT.includes(r[5])).map(r => [r[0], ctitle(r[1]), r[5], r[2]]); }
      else { head = ["Alumno", "Curso", "Avance %", "Calificación", "Intentos", "Último acceso", "Estado"]; data = rows.map(r => [r[0], ctitle(r[1]), r[2], r[3] ? r[3].toFixed(1) : "", r[4], r[5], gbState(r)[0]]); }
      const tr = x => (S.lang === "en" && window.I18N && I18N.tr(String(x))) || x;
      head = head.map(tr); data = data.map(r => r.map(tr));
      const name = "reporte-" + kind + "-petspharma-demo";
      if (fmt === "csv") download(name + ".csv", "﻿" + [head, ...data].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n"), "text/csv;charset=utf-8");
      else download(name + ".xls", `<html><head><meta charset="utf-8"></head><body><table border="1"><tr>${head.map(h => `<th>${esc(h)}</th>`).join("")}</tr>${data.map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</table></body></html>`, "application/vnd.ms-excel");
      toast("Reporte descargado (datos de ejemplo)");
    },
    material(slug, n) { const c = courseBy(slug); printDoc("Material", `<h1>${c.title}</h1><p style="color:#6b7065">Lección ${String(n).padStart(2, "0")} · presentación</p><div class="notice" style="margin-top:20px">El contenido de la presentación lo carga el ponente desde el administrador de la academia. Este documento es de ejemplo.</div>`); },
    certificate(slug, folio) {
      const c = courseBy(slug); const title = c ? c.title : "Webinar · Gabapentina en neurología canina";
      const fecha = c && slug === "inmunologia" ? "12/09/2026" : "30/10/2026", tpl = c ? certOf(slug) : null;
      if (tpl) { printDoc("Constancia " + folio, `<div style="margin-top:20px">${certSheet(tpl, { nombre: "Laura Méndez", curso: title, fecha, folio })}</div><p style="font-size:12px;color:#6b7065;margin-top:12px">Plantilla «${esc(tpl.nombre)}» · verifica en kironmexico.com/verificar · QR y datos de ejemplo.</p>`); return; }
      printDoc("Constancia " + folio, `<div style="text-align:center;padding:30px 0"><p style="font:700 13px Montserrat;letter-spacing:.2em;color:#4d7404">CONSTANCIA DE ${c ? "PARTICIPACIÓN Y APROBACIÓN" : "ASISTENCIA"}</p><p style="margin-top:22px;color:#6b7065">Se otorga a</p><h1 style="font-size:40px">Laura Méndez</h1><p style="color:#6b7065">por ${c ? "aprobar el curso" : "asistir al webinar"}</p><h2 style="font-size:24px;margin-top:8px">${title}</h2>
        <div style="display:flex;justify-content:center;align-items:center;gap:28px;margin-top:34px"><div>${qrSvg(folio, 110)}</div><div style="text-align:left"><p><b>Folio:</b> ${folio}</p><p><b>Fecha:</b> ${fecha}</p><p style="font-size:12px;color:#6b7065">Verifica en kironmexico.com/verificar<br>QR de ejemplo · datos de ejemplo</p></div></div></div>`);
    },
    yt(i) {
      if (!S.logged) { APP.login("mvz", location.hash, true); toast("Inicia sesión para ver los videos de la videoteca"); return; }
      const v = VIDEOS[i];
      modal(mh(v[0]) + `<div class="modal-b"><div class="yt-frame"><iframe src="https://www.youtube-nocookie.com/embed/${v[1]}?autoplay=1&rel=0" title="${esc(v[0])}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe></div></div>`);
    },
    recipe() {
      if (!S.logged) { APP.login("mvz", "#/recetas-cuantificadas", true); toast("Para acceder a este contenido necesitas una cuenta"); return; }
      modal(mh("Recetas cuantificadas · Tutorial 1") + `<div class="modal-b"><div class="kstage-wrap"><div class="kstage"><span class="kplate"><img src="assets/img/kiron-logo.png" alt="Kirón"></span><span class="vlabel">Video de ejemplo</span></div></div><p style="font-size:13px;color:var(--muted);margin-top:10px">Video de ejemplo. En la plataforma se reproduce el tutorial que hoy está en el sitio actual.</p></div>`);
    },
    distSubmit(e, kind) { e.preventDefault(); S.distSent[kind] = true; save(); route(); APP.scrollTo("view"); toast("Solicitud enviada al equipo comercial"); return false; },
    fvSubmit(e) {
      e.preventDefault();
      $("#fvform").outerHTML = `<div class="panel success"><div class="big-ok">${I("circle-check")}</div><h3 style="font-size:24px;margin:10px 0 6px">Reporte recibido</h3><p style="color:var(--muted)">Folio FV-2026-0042 (ejemplo). El área de farmacovigilancia te contactará si necesita más información.</p><a class="btn btn-ghost" style="margin-top:18px" href="#/">Volver al inicio</a></div>`;
      APP.scrollTo("view"); toast("Reporte enviado al área de farmacovigilancia"); return false;
    },
    fichaTecnica(slug) {
      if (!S.logged) { window.__next = () => APP.fichaTecnica(slug); APP.login("mvz", null, true); return; }
      const p = prodBy(slug);
      modal(mh("Ficha técnica · " + p.name) + `<div class="modal-b"><div class="kstage-wrap"><div class="kstage"><span class="kplate"><img src="assets/img/kiron-logo.png" alt="Kirón"></span><span class="vlabel">PDF de ejemplo</span></div></div>
        <p style="font-size:14px;color:var(--muted);margin-top:14px">La ficha técnica se publica como PDF, con el diseño de Kirón y aprobada por el área técnica. Elige el idioma.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px"><button class="btn ${S.lang === "en" ? "btn-ghost" : "btn-primary"}" onclick="APP.fichaPdf('${p.slug}','es')">${I("download")} PDF en español</button><button class="btn ${S.lang === "en" ? "btn-primary" : "btn-ghost"}" onclick="APP.fichaPdf('${p.slug}','en')">${I("download")} PDF en inglés</button></div></div>`, true);
    },
    fichaPdf(slug, lang) { toast(lang === "en" ? "Descarga de ejemplo. En la plataforma se baja el PDF aprobado en inglés." : "Descarga de ejemplo. En la plataforma se baja el PDF aprobado en español."); },
    redeem(id, cost) {
      const name = (S.rewards.find(r => r[3] === id) || [""])[0];
      modal(mh("Confirmar canje") + `<div class="modal-b"><p>Vas a canjear <b>${name}</b> por <b>${cost.toLocaleString("es-MX")} puntos</b>. Te quedarán ${(S.points - cost).toLocaleString("es-MX")}.</p><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:20px"><button class="btn btn-ghost" onclick="APP.closeModal()">Cancelar</button><button class="btn btn-primary" onclick="APP.doRedeem('${id}',${cost})">Canjear</button></div></div>`, true);
    },
    doRedeem(id, cost) { S.points -= cost; S.redeemed.push(id); if (COURSES.some(c => c.slug === id)) enrUpsert(ME, id, "approved", "Canje Club MVZ"); save(); closeModal(); route(); toast("Canje confirmado"); },
    verify(i) { S.verif[i][2] = true; save(); route(); toast(S.verif[i][0] + " verificado. Se le avisó por correo y sumó 200 puntos."); },
    live() {
      if (!S.logged) { window.__next = () => APP.live(); APP.login("mvz", null, true); return; }
      S.wbView = Object.assign({}, S.wbView, { proximo: "vivo" }); save(); closeModal(); location.hash = "#/webinar/proximo"; return;
      const w = WEBINARS.next, first = !S.attended;
      if (first) { S.attended = true; S.points += 50; save(); }
      $("#modal").innerHTML = `<div class="live-room" role="dialog" aria-modal="true" aria-label="Webinar en vivo">
        <div class="lr-top"><span class="lr-live"><i></i> EN VIVO</span><b>${w.title}</b><span class="lr-sp">${w.deg} ${w.speaker}</span><button class="icon-btn lr-x" aria-label="Salir del webinar" onclick="APP.closeModal();APP.route()">${I("x")}</button></div>
        <div class="lr-main"><div class="lr-stage"><div class="kstage"><span class="kplate"><img src="assets/img/kiron-logo.png" alt="Kirón"></span><span class="vlabel">En vivo</span></div><span class="lr-tag">Transmisión de ejemplo · en el sitio real llega desde Zoom</span><span class="lr-count">${I("users")} 342 conectados</span></div>
          <aside class="lr-side"><b>Preguntas al ponente</b><div class="lr-q" id="lrq"><div><small>MVZ Paola R.</small>¿La grabación queda disponible?</div><div><small>Dr. Andrés S.</small>¿Desde cuándo se descarga la constancia?</div></div>
            <form class="lr-in" onsubmit="return APP.liveAsk(event)"><input name="q" placeholder="Escribe tu pregunta" aria-label="Tu pregunta" required><button class="btn btn-primary btn-sm">${I("send")}</button></form></aside></div>
        <div class="lr-foot">${I("circle-check")} ${first ? "Tu asistencia quedó registrada · +50 puntos Club MVZ" : "Tu asistencia ya estaba registrada"}</div></div>`;
      $("#modalBg").classList.add("open", "live");
      $$("#modal video").forEach(v => { const p = v.play(); if (p) p.catch(() => {}); });
      if (window.I18N) I18N.apply($("#modal"));
    },
    liveAsk(e) { e.preventDefault(); const q = e.target.q.value.trim(); if (!q) return false; const d = document.createElement("div"); d.innerHTML = `<small>Tú</small>${esc(q)}`; $("#lrq").appendChild(d); e.target.reset(); toast("Pregunta enviada al moderador"); return false; },
    route() { route(); },
    heroGo(i, auto) { const s = $$("#hcar .hc-slide"); if (!s.length) return; const n = (i + s.length) % s.length; s.forEach((el, k) => el.classList.toggle("on", k === n)); $$("#hcar .hc-dots button").forEach((b, k) => b.classList.toggle("on", k === n)); window.__hc = n; if (!auto) heroAuto(); },
    hero(d) { APP.heroGo((window.__hc || 0) + d); },
    attendees(i) { const names = ["Dra. Laura Méndez (tú)", "MVZ Paola Ruiz", "Dr. Andrés Salinas", "MVZ Diego Herrera", "MVZ Karla Jiménez", "Dr. Ricardo Torres"]; const list = PASTW[i][4] === null ? names.slice(0, 1) : names.slice(1);
      modal(mh("Asistentes · " + PASTW[i][0]) + `<div class="modal-b">${list.map(n => `<div class="list-row"><span class="lr-ico">${I("user")}</span><div><b>${n}</b><small>Entró desde el sitio · nombres de ejemplo</small></div><span class="end"><span class="badge badge-ok">+50</span></span></div>`).join("")}<button class="btn btn-ghost btn-sm" style="margin-top:14px" onclick="APP.toast('Lista exportada a Excel (ejemplo)')">${I("download")} Exportar lista</button></div>`, true); },
    invoice() {
      modal(mh("Sube tu factura") + `<div class="modal-b" id="invb"><div class="notice warn" style="margin-bottom:16px">${I("info")}<span>Función en evaluación con Kirón. Así funcionaría: subes la factura de tu distribuidor y el sistema lee el producto para sumarte los puntos de la promoción.</span></div>
        <label class="drop">${I("download")}<b>Elige tu factura</b><small>PDF, XML o foto</small><input type="file" accept=".pdf,.xml,image/*" hidden onchange="APP.invoiceRun(this.files[0] ? this.files[0].name : 'factura.pdf')"></label>
        <button class="btn btn-ghost btn-block" style="margin-top:12px" onclick="APP.invoiceRun('factura-ejemplo.pdf')">Usar una factura de ejemplo</button></div>`, true);
    },
    invoiceRun(name) {
      $("#invb").innerHTML = `<div style="text-align:center;padding:16px 0"><span class="spin dark"></span><p style="margin-top:12px">Leyendo ${esc(name)}…</p></div>`;
      setTimeout(() => { S.points += 500; S.invoices.push(name); save();
        $("#invb").innerHTML = `<div style="text-align:center"><div class="big-ok">${I("circle-check")}</div><h3 style="font-size:20px;margin:8px 0">Compra validada</h3>
          <div class="rows" style="text-align:left;margin:14px 0"><div><span>Producto identificado</span><b>Kir–Anthel Max Suspensión</b></div><div><span>Promoción</span><b>Promoción de ejemplo</b></div><div><span>Puntos sumados</span><b>+500</b></div></div>
          <p style="font-size:12.5px;color:var(--muted)">Lectura simulada para el demo.</p><button class="btn btn-primary" style="margin-top:14px" onclick="APP.closeModal();APP.route()">Ver mis puntos</button></div>`;
        if (window.I18N) I18N.apply($("#invb"));
      }, 1600);
    },
    ruleSave(i, v) { S.rules[i][1] = Math.max(0, parseInt(v, 10) || 0); save(); toast("Regla guardada · " + S.rules[i][0] + ": " + S.rules[i][1] + " puntos"); },
    rewardAdd(e) { e.preventDefault(); const n = $("#rw1").value.trim(), p = parseInt($("#rw2").value, 10); if (!n || !p) return false; S.rewards.push([n, p, "gift", "rw-" + Date.now()]); save(); route(); toast("Premio agregado. Ya aparece en el Club de los médicos."); return false; },
    rewardDel(i) { const r = S.rewards.splice(i, 1)[0]; save(); route(); toast("Premio quitado: " + r[0]); },
    bot() { const b = $("#bot"); b.classList.toggle("open"); renderBot(); if (b.classList.contains("open")) setTimeout(() => { const i = $("#bot input"); if (i) i.focus(); }, 60); },
    botAsk(q) {
      q = String(q || "").trim(); if (!q) return; botLog.push(["mine", q]);
      const n = q.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
      const hit = BOT.find(r => r[0].some(k => n.includes(k.normalize("NFD").replace(/[̀-ͯ]/g, ""))));
      const en = S.lang === "en";
      botLog.push(["bot", hit ? hit[en ? 2 : 1] : (en ? "I don't have that answer yet. Leave your question and the Academy team will reply by email." : "Aún no tengo esa respuesta. Deja tu pregunta y el equipo de Academia te responde por correo.")]);
      renderBot();
    },
    editPage(i) {
      const p = i >= 0 ? S.pages[i] : ["Nueva página", "/nueva-pagina/", "Borrador", "Hoy"];
      const blocks = i === 0 ? ["Héroe con video", "Academia y panel del médico", "Productos destacados", "Próximo webinar", "Lo que encuentras aquí", "Presencia internacional"] : ["Héroe", "Texto", "Productos destacados", "Formulario"];
      modal(mh("Editar · " + p[0]) + `<div class="modal-b editor"><div><p class="l">Bloques de la página</p><ul class="blocks" id="blocks">${blocks.map((b, j) => `<li>${I("sliders-horizontal")} ${b}<span><button class="mini" onclick="APP.moveBlock(${j},-1)" aria-label="Subir">↑</button><button class="mini" onclick="APP.moveBlock(${j},1)" aria-label="Bajar">↓</button></span></li>`).join("")}</ul>
        <div class="add-block"><select class="select" id="nb"><option>Testimonios</option><option>Preguntas frecuentes</option><option>Galería</option><option>Banner de webinar</option></select><button class="btn btn-ghost btn-sm" onclick="APP.addBlock()">${I("plus")} Agregar</button></div></div>
        <div><p class="l">SEO</p><div class="form-row"><label class="l">Título</label><input class="input" value="${esc(p[0])} · Kirón"></div><div class="form-row"><label class="l">Descripción</label><input class="input" value="Laboratorio veterinario mexicano"></div><div class="form-row"><label class="l">Idioma</label><select class="select"><option>Español</option><option>English</option></select></div>
          <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-ghost" onclick="APP.closeModal();location.hash='#/'">${I("eye")} Vista previa</button><button class="btn btn-ghost" onclick="APP.toast('Programada para el 02/11/2026 09:00')">${I("calendar")} Programar</button><button class="btn btn-primary" onclick="APP.publishPage(${i})">Publicar</button></div></div></div>`);
      window.__blocks = blocks.slice();
    },
    moveBlock(j, d) { const b = window.__blocks, k = j + d; if (k < 0 || k >= b.length) return; [b[j], b[k]] = [b[k], b[j]]; $("#blocks").innerHTML = b.map((x, n) => `<li>${I("sliders-horizontal")} ${x}<span><button class="mini" onclick="APP.moveBlock(${n},-1)" aria-label="Subir">↑</button><button class="mini" onclick="APP.moveBlock(${n},1)" aria-label="Bajar">↓</button></span></li>`).join(""); },
    addBlock() { window.__blocks.push($("#nb").value); APP.moveBlock(0, 0); toast("Bloque agregado"); },
    publishPage(i) { if (i < 0) S.pages.push(["Nueva página", "/nueva-pagina/", "Publicada", "Hoy"]); else { S.pages[i][2] = "Publicada"; S.pages[i][3] = "Hoy"; } save(); closeModal(); route(); toast("Página publicada · la versión anterior quedó guardada"); },
    kpiCsv() { download("tablero-kiron-demo.csv", "﻿Indicador,Valor\nMédicos activos esta semana,412\nInscripciones a cursos,186\nAsistentes al último webinar,342\nConstancias emitidas,214\n", "text/csv;charset=utf-8"); toast("Tablero exportado (cifras de ejemplo)"); },
  };

  /* ---------- Acciones del LMS v2.4 (administrador) ---------- */
  const selCount = (set, id, one, many, none) => { const el = document.getElementById(id); if (el) { el.textContent = set.size ? (set.size === 1 ? one : set.size + " " + many) : none; if (window.I18N) I18N.apply(el.parentElement); } };
  Object.assign(window.APP, {
    /* Inscripciones */
    enrF(k, v) { S.enrF = Object.assign({}, S.enrF, { [k]: v }); window.__selE = new Set(); save(); route(); },
    enrQ(q) { APP.enrF("q", String(q || "").trim()); },
    enrSel(id, on) { const s = window.__selE || (window.__selE = new Set()); if (on) s.add(id); else s.delete(id); selCount(s, "selNE", "1 seleccionada", "seleccionadas", "Ninguna seleccionada"); },
    enrAll(on) { const s = window.__selE = new Set(); $$(".tbl td.chk input").forEach(x => { x.checked = on; }); if (on) { const F = Object.assign({ s: "", st: "", q: "", f: "" }, S.enrF || {}); enrList().filter(e => (!F.s || e.s === F.s) && (!F.st || e.st === F.st) && (!F.q || (e.u + " " + stuMail(e.u)).toLowerCase().includes(F.q.toLowerCase())) && enRango(e.f, F.f)).forEach(e => s.add(e.id)); } selCount(s, "selNE", "1 seleccionada", "seleccionadas", "Ninguna seleccionada"); },
    enrSet(id, st) { const e = enrList().find(x => x.id === id); if (!e) return; enrUpsert(e.u, e.s, st, "Equipo Kirón"); save(); route(); toast(st === "approved" ? "Inscripción aprobada. El alumno ya ve el curso en su panel." : "Inscripción cancelada. El alumno pierde el acceso; sus constancias se conservan."); },
    enrBulk(st) {
      const s = window.__selE || new Set(); if (!s.size) { toast("Selecciona al menos una inscripción"); return; }
      let n = 0; enrList().filter(e => s.has(e.id) && e.st !== st).forEach(e => { enrUpsert(e.u, e.s, st, "Equipo Kirón"); n++; });
      window.__selE = new Set(); save(); route(); toast(st === "approved" ? (n === 1 ? "1 inscripción aprobada" : `${n} inscripciones aprobadas`) : (n === 1 ? "1 inscripción cancelada" : `${n} inscripciones canceladas`));
    },
    enrNew(pre) {
      const pn = typeof pre === "number" && STUDENTS[pre] ? STUDENTS[pre][0] : null;
      modal(mh("Inscribir alumnos") + `<form class="modal-b" onsubmit="return APP.enrNewSave(event)">
        <div class="form-row"><label class="l" for="enC">Curso o diplomado</label><select class="input" id="enC">${COURSES.map(c => `<option value="${c.slug}">${c.title}</option>`).join("")}</select></div>
        <div class="form-row"><label class="l" for="enQ">Alumnos</label><input class="input" id="enQ" placeholder="Filtrar por nombre o correo" oninput="APP.enrFilter(this.value)" autocomplete="off"></div>
        <div class="pick" id="enL">${STUDENTS.map((s, i) => `<label class="list-row" data-k="${esc((s[0] + " " + s[1]).toLowerCase())}"><input type="checkbox" name="es" value="${i}" ${s[0] === pn ? "checked" : ""}><div><b data-notr>${esc(s[0])}</b><small data-notr>${esc(s[1])}</small></div></label>`).join("")}</div>
        <p style="font-size:12.5px;color:var(--muted);margin:12px 0 16px">La inscripción queda aprobada y el alumno ve el curso en su panel. No hay cobro; el precio del curso no interviene.</p>
        <button class="btn btn-primary btn-block" type="submit">${I("check")} Inscribir y aprobar</button></form>`);
    },
    enrFilter(q) { q = String(q || "").toLowerCase(); $$("#enL [data-k]").forEach(el => { el.hidden = !!q && !el.dataset.k.includes(q); }); },
    enrNewSave(e) {
      e.preventDefault(); const s = $("#enC").value, ids = $$("#enL input[name=es]:checked").map(x => +x.value);
      if (!ids.length) { toast("Elige al menos un alumno"); return false; }
      ids.forEach(i => enrUpsert(STUDENTS[i][0], s, "approved", "Equipo Kirón"));
      save(); closeModal(); if (location.hash !== "#/admin/academia/inscripciones") location.hash = "#/admin/academia/inscripciones"; else route();
      toast(ids.length === 1 ? "1 alumno inscrito. Ya ve el curso en su panel." : `${ids.length} alumnos inscritos. Ya ven el curso en su panel.`); return false;
    },
    /* Alumnos e intentos */
    stuF(k, v) { S.stuF = Object.assign({}, S.stuF, { [k]: v }); save(); route(); },
    stuQ(q) { APP.stuF("q", String(q || "").trim()); },
    qaF(k, v) { S.qaF = Object.assign({}, S.qaF, { [k]: v }); save(); route(); },
    qaQ(q) { APP.qaF("q", String(q || "").trim()); },
    qaView(i) {
      const r = qaRows()[i]; if (!r) return; const s = r[1], a = r[6];
      let items;
      if (a) items = a.ans.map((x, n) => { const q = XQ[x.i]; return [`${n + 1}. ${q.q}`, x.v.length ? x.v.map(j => q.o[j]).join(" · ") : "Sin respuesta", q.c.map(j => q.o[j]).join(" · "), x.ok]; });
      else { const tot = 10, ok = Math.floor(r[4]); items = Array.from({ length: tot }, (_, n) => [`${n + 1}. Pregunta ${n + 1} del banco · ${XQT[["om", "vf", "rm"][n % 3]]}`, "Respuesta del alumno", "Respuesta correcta", ((n * 7 + r[2]) % tot) < ok]); }
      modal(mh("Intento " + r[2] + " · " + r[0]) + `<div class="modal-b"><p style="color:var(--muted);margin-bottom:12px">${ctitle(s)} · Examen final · ${r[3]}</p>
        <div class="rows rows-light"><div><span>Calificación</span><b>${r[4].toFixed(1)}</b></div><div><span>Tiempo usado</span><b>${mmss(r[5])}</b></div><div><span>Resultado</span><b>${qaOk(r) ? "Aprobado" : "No aprobado"}</b></div></div>
        <div class="q-res">${items.map(x => `<div class="${x[3] ? "ok" : "bad"}">${I(x[3] ? "circle-check" : "x")}<div><b>${x[0]}</b><small>${a ? `Respondió: ${x[1]} · Correcta: ${x[2]}` : x[3] ? "Correcta" : "Incorrecta"}</small></div></div>`).join("")}</div>
        ${a ? "" : `<p class="ce-hint" style="margin-top:10px">Intento de ejemplo: preguntas y respuestas ilustrativas.</p>`}
        <p class="ce-hint" style="margin-top:6px">${I("shield-check")} Este detalle solo lo ve la administración.</p></div>`);
    },
    /* Exámenes por curso */
    qcfgOpen(key) {
      const q = qcfg(key), s = key, G = gs();
      const num = (id, f, label, min, max, hint = "") => `<div class="form-row"><label class="l" for="${id}">${label}</label><input class="input" type="number" id="${id}" min="${min}" max="${max}" value="${q[f]}">${hint ? `<small class="ce-hint">${hint}</small>` : ""}</div>`;
      const sel = (id, f, label, map, dis) => `<div class="form-row"><label class="l" for="${id}">${label}</label><select class="input" id="${id}">${Object.entries(map).map(([v, t]) => `<option value="${v}" ${q[f] === v ? "selected" : ""} ${dis === v ? "disabled" : ""}>${t}</option>`).join("")}</select></div>`;
      modal(mh("Examen final · reglas") + `<form class="modal-b" onsubmit="return APP.qcfgSave(event,'${key}')"><p style="color:var(--muted);margin-bottom:14px">${ctitle(s)}</p>
        <div class="grid2">${num("qA", "intentos", "Intentos permitidos", 0, 20, "0 = sin límite")}${num("qP", "aprobatoria", "Calificación aprobatoria (%)", 1, 100)}</div>
        <div class="grid2">${num("qT", "tiempo", "Tiempo límite (minutos)", 0, 300, "0 = sin límite")}${num("qM", "maxPreg", "Preguntas a responder", 0, 200, "0 = todas")}</div>
        <div class="grid2">${sel("qL", "layout", "Presentación", LAYOUT)}${sel("qO", "orden", "Orden de preguntas", ORDEN)}</div>
        <div class="grid2">${sel("qC", "calculo", "Nota final", CALC)}${sel("qR", "retro", "Retroalimentación", RETRO, G.ocultar ? "revelar" : "")}</div>
        <div class="grid2">${num("qB", "lcAbierta", "Caracteres · respuesta abierta", 100, 10000)}<div class="form-row"><label class="l" for="qU">Se abre el (opcional)</label><input class="input" type="date" id="qU" value="${q.desbloqueo}"></div></div>
        <button class="btn btn-primary btn-block" type="submit">Guardar reglas del examen</button></form>`, true);
    },
    qcfgSave(e, key) {
      e.preventDefault(); const n = (id, a, b) => Math.max(a, Math.min(b, Math.round(+$(id).value || 0)));
      S.qcfg = Object.assign({}, S.qcfg, { [key]: { intentos: n("#qA", 0, 20), aprobatoria: Math.max(1, n("#qP", 1, 100)), tiempo: n("#qT", 0, 300), maxPreg: n("#qM", 0, 200), layout: $("#qL").value, orden: $("#qO").value, calculo: $("#qC").value, retro: $("#qR").value, lcAbierta: n("#qB", 100, 10000), desbloqueo: $("#qU").value } });
      save(); closeModal(); route(); toast("Reglas del examen guardadas. Aplican desde el siguiente intento."); return false;
    },
    /* Ajustes globales */
    gsSet(k, v) { S.gs = Object.assign({}, gs(), { [k]: v }); save(); route(); toast("Ajuste guardado para todos los cursos"); },
    /* Cursos: filtros y acciones en lote */
    crsF(k, v) { S.crsF = Object.assign({}, S.crsF, { [k]: v }); window.__selC = new Set(); save(); route(); },
    crsQ(q) { APP.crsF("q", String(q || "").trim()); },
    crsSel(key, on) { const s = window.__selC || (window.__selC = new Set()); if (on) s.add(key); else s.delete(key); selCount(s, "selNC", "1 seleccionado", "seleccionados", "Ninguno seleccionado"); },
    crsAll(on) { const s = window.__selC = new Set(); $$(".tbl td.chk input").forEach(x => { x.checked = on; const m = /crsSel\('([^']+)'/.exec(x.getAttribute("onchange") || ""); if (on && m) s.add(m[1]); }); selCount(s, "selNC", "1 seleccionado", "seleccionados", "Ninguno seleccionado"); },
    crsBulk() {
      const s = window.__selC || new Set(), st = $("#cba").value; if (!s.size) { toast("Selecciona al menos un curso"); return; }
      let n = 0, skip = 0;
      s.forEach(key => {
        if (key.startsWith("s:")) { S.cst = Object.assign({}, S.cst, { [key.slice(2)]: { estado: st } }); n++; return; }
        const c = (S.newCourses || [])[+key.slice(2)]; if (!c) return; ceNorm(c);
        if (st === "publicado" && ceIssues(c).length) { skip++; return; }
        c.estado = st; c.publicado = st === "publicado"; n++;
      });
      window.__selC = new Set(); save(); route();
      toast((n === 1 ? "1 curso actualizado" : `${n} cursos actualizados`) + (skip ? ` · ${skip} sin publicar porque tienen pendientes` : ""));
    },
    /* Plantillas de constancia */
    certPick(i) { S.certEdit = i; S.certVar = "nombre"; save(); route(); },
    certNew() { const L = certList(); L.push({ id: "c" + Date.now().toString(36), nombre: "Nueva plantilla", estado: "draft", cursos: [], vars: CV0() }); S.certEdit = L.length - 1; S.certVar = "nombre"; save(); route(); toast("Plantilla creada como borrador. Sube la imagen del diseño."); },
    certSet(i, k, v) { const t = certList()[i]; t[k] = k === "nombre" ? (String(v).trim().slice(0, 80) || t.nombre) : v; save(); route(); if (k === "estado") toast(v === "published" ? "Plantilla publicada. Se usa en las constancias nuevas de sus cursos." : "Plantilla en borrador"); },
    certVarOn(i, k, on) { certList()[i].vars[k].on = on; if (on) S.certVar = k; save(); route(); },
    certSize(i, k, v) { const t = certList()[i]; t.vars[k].size = v; const el = $(`#certCanvas .cert-var[data-k="${k}"]`); if (el) el.style[k === "qr" ? "width" : "fontSize"] = v / 8.8 + "cqw"; clearTimeout(window.__cs); window.__cs = setTimeout(save, 200); },
    certCourse(i, slug, on) { const L = certList(); if (on) L.forEach((t, j) => { if (j !== i) t.cursos = t.cursos.filter(x => x !== slug); }); const t = L[i]; t.cursos = on ? [...new Set(t.cursos.concat(slug))] : t.cursos.filter(x => x !== slug); save(); route(); },
    certImg(i, inp) {
      const f = inp.files && inp.files[0]; if (!f) return; const t = certList()[i];
      if (!/^image\/(jpeg|png)$/.test(f.type)) { inp.value = ""; toast("La imagen debe ser JPG o PNG"); return; }
      if (f.size > 3 * 1048576) { inp.value = ""; toast("La imagen pesa más de 3 MB"); return; }
      const r = new FileReader(); r.onload = () => { try { sessionStorage.setItem("kiron-cert-bg-" + t.id, r.result); } catch (e) { toast("La imagen es muy pesada para el demo; prueba con una más ligera"); return; } route(); toast("Imagen base cargada. Acomoda los datos encima."); }; r.readAsDataURL(f);
    },
    certImgDel(i) { try { sessionStorage.removeItem("kiron-cert-bg-" + certList()[i].id); } catch (e) {} route(); },
    certPreview(i) { const t = certList()[i]; printDoc("Vista previa · " + t.nombre, `<div style="margin-top:20px">${certSheet(t, { nombre: "Laura Méndez", curso: "Nombre del curso o diplomado", fecha: hoyMx(), folio: "KI-2026-000000" })}</div><p style="font-size:12px;color:#6b7065;margin-top:12px">Vista previa con datos de ejemplo.</p>`); },
  });
  /* Arrastre de los datos sobre la plantilla de constancia (mouse, touch y teclado). */
  function bindCertDrag() {
    const cv = $("#certCanvas"); if (!cv) return; const t = certList()[S.certEdit || 0]; if (!t) return;
    const put = (el, k, x, y) => { x = Math.min(98, Math.max(2, x)); y = Math.min(97, Math.max(3, y)); el.style.left = x + "%"; el.style.top = y + "%"; t.vars[k].x = Math.round(x * 10) / 10; t.vars[k].y = Math.round(y * 10) / 10; };
    const pick = el => { const k = el.dataset.k; if (S.certVar !== k) { S.certVar = k; save(); const sz = $("#ctS"); if (sz) { route(); setTimeout(() => { const n = $(`#certCanvas .cert-var[data-k="${k}"]`); if (n) n.focus(); }, 0); return true; } } return false; };
    cv.querySelectorAll(".cert-var").forEach(el => {
      el.onpointerdown = e => {
        e.preventDefault(); const k = el.dataset.k, r = cv.getBoundingClientRect();
        cv.querySelectorAll(".cert-var").forEach(x => x.classList.toggle("on", x === el)); el.setPointerCapture(e.pointerId);
        let moved = false;
        el.onpointermove = ev => { moved = true; put(el, k, (ev.clientX - r.left) / r.width * 100, (ev.clientY - r.top) / r.height * 100); };
        el.onpointerup = () => { el.onpointermove = null; el.onpointerup = null; save(); if (!moved || S.certVar !== k) pick(el); };
      };
      el.onkeydown = e => { const d = { ArrowLeft: [-.5, 0], ArrowRight: [.5, 0], ArrowUp: [0, -.5], ArrowDown: [0, .5] }[e.key]; if (!d) return; e.preventDefault(); const k = el.dataset.k; put(el, k, t.vars[k].x + d[0] * (e.shiftKey ? 4 : 1), t.vars[k].y + d[1] * (e.shiftKey ? 4 : 1)); clearTimeout(window.__cs); window.__cs = setTimeout(save, 200); };
      el.onfocus = () => { cv.querySelectorAll(".cert-var").forEach(x => x.classList.toggle("on", x === el)); };
    });
  }

  /* ---------- Arranque ---------- */
  let lenis = null;
  if (!reduced && window.Lenis) { lenis = new Lenis({ duration: 1.1, smoothWheel: true }); const raf = tm => { lenis.raf(tm); requestAnimationFrame(raf); }; requestAnimationFrame(raf); if (window.ScrollTrigger) lenis.on("scroll", ScrollTrigger.update); }
  if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  if (reduced) document.documentElement.classList.add("no-motion");
  $("#modalBg").addEventListener("click", e => { if (e.target.id === "modalBg") closeModal(); });
  addEventListener("keydown", e => { if (e.key === "Escape") { closeModal(); const m = $("#mnav"); if (m) m.classList.remove("open"); } });
  addEventListener("hashchange", () => { closeModal(); route(); });
  route();
})();
