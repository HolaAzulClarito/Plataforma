/* Documentos imprimibles (printDoc del demo): constancias y material de la lección.
   Abre una ventana nueva con los estilos de la app y un botón "Guardar como PDF o imprimir".
   El HTML se arma aquí con texto escapado: los datos de la API nunca se insertan sin escapar. */
import { todayMx, type CertTemplate, type CertVarKey, type CertificateDocument } from "@kiron/shared";
import { qrCells } from "../../components/QrCode";
import type { TFunction } from "../../i18n";
import { apiGet, ApiError } from "../../lib/api";
import { toast } from "../../state/toasts";

export const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/* QR de ejemplo como SVG (mismo patrón que <QrCode>). */
export function qrSvg(seed: string, size = 120): string {
  const n = 25;
  const cell = size / n;
  const rects = qrCells(seed)
    .map(([x, y]) => `<rect x="${x * cell}" y="${y * cell}" width="${cell + 0.2}" height="${cell + 0.2}"/>`)
    .join("");
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" fill="#1d1d1b" role="img" aria-label="QR">${rects}</svg>`;
}

/* Copia las hojas de estilo cargadas (en desarrollo son <style>, en producción <link>) para que el documento
   use las mismas clases que la app. */
const styles = (): string =>
  [...document.querySelectorAll<HTMLElement>('style, link[rel="stylesheet"]')].map((n) => n.outerHTML).join("");

const openWindow = (): Window | null => {
  const w = window.open("", "_blank");
  if (!w) toast("Permite ventanas emergentes para abrir el PDF");
  return w;
};

export function printDoc(title: string, body: string, t: TFunction, lang: string, win?: Window | null): boolean {
  const w = win ?? openWindow();
  if (!w) return false;
  w.document.open();
  const base = location.origin + "/";
  w.document.write(
    `<!doctype html><html lang="${lang === "en" ? "en" : "es-MX"}"><head><meta charset="utf-8"><title>${esc(title)}</title><base href="${base}">${styles()}` +
      `<style>body{background:#fff;padding:0}.doc{max-width:760px;margin:0 auto;padding:48px 40px;font-size:14px}.doc h1{font-size:30px;margin:18px 0 6px}.doc .bar{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #b42318;padding-bottom:14px}.doc .foot{margin-top:40px;font-size:11.5px;color:#6b7065;border-top:1px solid #dfe2da;padding-top:12px}.noprint{position:fixed;right:20px;top:20px}@media print{.noprint{display:none}}</style></head>` +
      `<body><div class="noprint"><button class="btn btn-primary" onclick="print()">${esc(t("Guardar como PDF o imprimir"))}</button></div>` +
      `<div class="doc"><div class="bar"><img src="/img/kiron-logo.png" style="height:52px" alt="Kirón"><span style="font:600 12px var(--f-body);color:#6b7065">${esc(t("Documento de ejemplo · demo"))}</span></div>${body}` +
      `<div class="foot">${esc(t("Laboratorios Kirón México · kironmexico.com · Generado desde la plataforma (demo)"))} · ${todayMx()}</div></div></body></html>`,
  );
  w.document.close();
  return true;
}

const certBase = (t: TFunction) =>
  `<div class="cert-base"><img src="/img/kiron-logo.png" alt="Kirón"><b>${esc(t("CONSTANCIA"))}</b><span>${esc(t("Se otorga a"))}</span><i></i><em>${esc(t("por aprobar"))}</em></div>`;

/* Hoja de la plantilla: imagen base (o diseño por defecto) con las variables en su posición (certSheet del demo). */
export function certSheetHtml(tpl: CertTemplate, imagen: string | null, d: CertificateDocument["datos"], t: TFunction): string {
  const bg = imagen ? `<img class="cert-bg" src="${esc(imagen)}" alt="">` : certBase(t);
  const vars = (Object.entries(tpl.vars) as Array<[CertVarKey, CertTemplate["vars"][CertVarKey]]>)
    .filter(([, v]) => v.on)
    .map(([k, v]) => {
      const style = `left:${v.x}%;top:${v.y}%;${k === "qr" ? `width:${v.size / 8.8}cqw` : `font-size:${v.size / 8.8}cqw`}`;
      const inner = k === "qr" ? qrSvg(d.folio, 120) : `<span>${esc(d[k])}</span>`;
      return `<div class="cert-var ${k === "qr" ? "qr" : ""}" style="${style}">${inner}</div>`;
    })
    .join("");
  return `<div class="cert-sheet">${bg}${vars}</div>`;
}

export function certificateHtml(doc: CertificateDocument, t: TFunction): string {
  const { constancia: c, plantilla, imagen, datos } = doc;
  if (plantilla)
    return (
      `<div style="margin-top:20px">${certSheetHtml(plantilla, imagen, datos, t)}</div>` +
      `<p style="font-size:12px;color:#6b7065;margin-top:12px">${esc(t("Plantilla"))} «${esc(plantilla.nombre)}» · ${esc(t("verifica en kironmexico.com/verificar · QR y datos de ejemplo."))}</p>`
    );
  const webinar = c.tipo === "webinar";
  return (
    `<div style="text-align:center;padding:30px 0"><p style="font:700 13px Montserrat;letter-spacing:.2em;color:#4d7404">${esc(t(webinar ? "CONSTANCIA DE ASISTENCIA" : "CONSTANCIA DE PARTICIPACIÓN Y APROBACIÓN"))}</p>` +
    `<p style="margin-top:22px;color:#6b7065">${esc(t("Se otorga a"))}</p><h1 style="font-size:40px">${esc(datos.nombre)}</h1>` +
    `<p style="color:#6b7065">${esc(t(webinar ? "por asistir al webinar" : "por aprobar el curso"))}</p><h2 style="font-size:24px;margin-top:8px">${esc(datos.curso)}</h2>` +
    `<div style="display:flex;justify-content:center;align-items:center;gap:28px;margin-top:34px"><div>${qrSvg(datos.folio, 110)}</div>` +
    `<div style="text-align:left"><p><b>${esc(t("Folio:"))}</b> ${esc(datos.folio)}</p><p><b>${esc(t("Fecha:"))}</b> ${esc(datos.fecha)}</p>` +
    `<p style="font-size:12px;color:#6b7065">${esc(t("Verifica en kironmexico.com/verificar"))}<br>${esc(t("QR de ejemplo · datos de ejemplo"))}</p></div></div></div>`
  );
}

/* Constancia del médico (APP.certificate): la pide a la API y abre el documento para imprimir o guardar en PDF.
   La ventana se abre antes de la llamada para que el navegador no la bloquee. */
export async function downloadCertificate(folio: string, t: TFunction, lang: string): Promise<void> {
  const w = openWindow();
  if (!w) return;
  try {
    const doc = await apiGet<CertificateDocument>(`/api/me/constancias/${encodeURIComponent(folio)}`);
    printDoc(`${t("Constancia")} ${folio}`, certificateHtml(doc, t), t, lang, w);
  } catch (e) {
    w.close();
    toast(e instanceof ApiError ? e.message : "No pudimos abrir la constancia");
  }
}

/* Presentación de la lección (APP.material). */
export function printMaterial(title: string, n: number, t: TFunction, lang: string): void {
  const nn = String(n).padStart(2, "0");
  printDoc(
    t("Material"),
    `<h1>${esc(title)}</h1><p style="color:#6b7065">${esc(t(`Lección ${nn} · presentación`))}</p><div class="notice" style="margin-top:20px">${esc(
      t("El contenido de la presentación lo carga el ponente desde el administrador de la academia. Este documento es de ejemplo."),
    )}</div>`,
    t,
    lang,
  );
}
