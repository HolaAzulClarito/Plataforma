/* Formatos de Azul Clarito: fechas DD/MM/AAAA y montos en MXN. */

/* Cómo se muestra el IVA en precios. [FALTA DATO]: Kirón debe confirmar si sus precios incluyen IVA.
   Mientras no se confirme, el precio se muestra con la leyenda "IVA por confirmar" para no afirmar algo falso. */
export type IvaMode = "incluido" | "mas" | "pendiente";
export const PRICE_IVA: IvaMode = "pendiente";

const IVA_LABEL: Record<IvaMode, string> = {
  incluido: "IVA incluido",
  mas: "+ IVA",
  pendiente: "IVA por confirmar",
};

export const money = (n: number): string => "$" + n.toLocaleString("es-MX") + " MXN";
export const ivaLabel = (mode: IvaMode = PRICE_IVA): string => IVA_LABEL[mode];

const pad2 = (n: number) => String(n).padStart(2, "0");

/* Hoy en formato DD/MM/AAAA. */
export const todayMx = (d: Date = new Date()): string =>
  `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;

/* Hoy en formato AAAA-MM-DD. */
export const todayIso = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/* DD/MM/AAAA -> AAAA-MM-DD ("" si no es válida). */
export const mxToIso = (s: string | undefined): string => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s ?? "");
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};

/* AAAA-MM-DD -> DD/MM/AAAA ("" si no es válida). */
export const isoToMx = (s: string | undefined): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
};

export const daysSince = (mx: string, now: number = Date.now()): number => {
  const iso = mxToIso(mx);
  return iso ? Math.floor((now - new Date(iso + "T12:00:00").getTime()) / 864e5) : 1e9;
};

export type DateRange = "" | "7" | "30" | "anio";

export const inRange = (mx: string, r: DateRange, now: Date = new Date()): boolean => {
  if (!r) return true;
  if (r === "7") return daysSince(mx, now.getTime()) <= 7;
  if (r === "30") return daysSince(mx, now.getTime()) <= 30;
  return mx.slice(-4) === String(now.getFullYear());
};

export const slugify = (t: string | undefined): string =>
  String(t ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");

export const youtubeId = (u: string | undefined): string | null => {
  const m = /(?:youtube\.com\/(?:live\/|watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/.exec(u ?? "");
  return m?.[1] ?? null;
};

export const mmss = (s: number): string => `${Math.floor(s / 60)}:${pad2(s % 60)}`;

/* Normaliza para búsqueda: sin acentos y en minúsculas. */
export const normalize = (s: string): string =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* ---------- CSV ----------
   Una celda entre comillas, con comillas dobladas. Si empieza con = + - @ tabulador o retorno se antepone ' para que
   Excel/Sheets no la ejecuten como fórmula (inyección CSV). Úsalo en TODA exportación CSV, del cliente o del servidor. */
export const csvCell = (v: unknown): string => {
  const t = String(v ?? "");
  const safe = /^[=+\-@\t\r]/.test(t) ? "'" + t : t;
  return `"${safe.replace(/"/g, '""')}"`;
};

/* Documento CSV completo con BOM (para que Excel lea UTF-8) y salto de línea final. */
export const csvDocument = (rows: readonly (readonly unknown[])[]): string => "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
