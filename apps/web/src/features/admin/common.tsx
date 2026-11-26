/* Piezas compartidas del administrador: refresco tras escrituras, etiquetas del LMS, selects de filtro, búsqueda,
   switch accesible, estado de curso y manejo de errores de la API. */
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { CourseState, DateRange, EnrollmentState, ExamFeedback, ExamLayout, ExamOrder, GradeCalc } from "@kiron/shared";
import { COURSE_STATE_LABEL, DEMO_ROLE_HEADER, GRADE_CALC_LABEL } from "@kiron/shared";
import { Icon } from "../../components/Icon";
import { useT } from "../../i18n";
import { API_BASE, ApiError, useApi, type ApiState } from "../../lib/api";
import { cx } from "../../lib/cx";
import { downloadText } from "../../lib/download";
import { createStore, useStore } from "../../state/createStore";
import { getSession } from "../../state/session";
import { toast } from "../../state/toasts";

/* Cada escritura llama bumpAdmin(): las lecturas hechas con useAdminApi se vuelven a pedir (contadores de la barra
   lateral, pestañas y tablas), como el route() del demo después de cada acción. */
const adminTick = createStore(0);
export const bumpAdmin = () => adminTick.set((n) => n + 1);

export function useAdminApi<T>(path: string | null): ApiState<T> {
  const res = useApi<T>(path);
  const tick = useStore(adminTick);
  const seen = useRef(tick);
  const { refetch } = res;
  useEffect(() => {
    if (seen.current === tick) return;
    seen.current = tick;
    refetch();
  }, [tick, refetch]);
  return res;
}

/* Arma una query omitiendo los valores vacíos. */
export const qs = (params: Record<string, string | number | undefined | null>): string => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  const s = p.toString();
  return s ? "?" + s : "";
};

/* Muestra el mensaje de error de la API (ya viene en español) o uno genérico. */
export function failToast(e: unknown, fallback = "No se pudo guardar. Intenta de nuevo."): void {
  toast(e instanceof ApiError && e.message ? e.message : fallback);
}

/* Ejecuta una escritura: marca ocupado, refresca las lecturas y avisa. Devuelve el resultado o undefined si falló. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const run = async <T,>(fn: () => Promise<T>, ok?: string | ((r: T) => string), fallback?: string): Promise<T | undefined> => {
    setBusy(true);
    try {
      const r = await fn();
      bumpAdmin();
      if (ok) toast(typeof ok === "function" ? ok(r) : ok);
      return r;
    } catch (e) {
      failToast(e, fallback);
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

/* ---------- Etiquetas (las mismas del demo) ---------- */
export const CSTATES: Record<CourseState, string> = COURSE_STATE_LABEL;
export const CST_CLS: Record<CourseState, string> = { publicado: "st-ok", borrador: "st-draft", programado: "st-rev", privado: "st-draft", papelera: "st-draft" };
export const CALC: Record<GradeCalc, string> = GRADE_CALC_LABEL;
export const LAYOUT: Record<ExamLayout, string> = { una: "Una pregunta por pantalla", todas: "Todas las preguntas juntas" };
export const ORDEN: Record<ExamOrder, string> = { aleatorio: "Aleatorio", fijo: "Fijo" };
export const RETRO: Record<ExamFeedback, string> = { defecto: "Por defecto", revelar: "Revelar respuestas", reintentar: "Reintentar" };
export const EST: Record<EnrollmentState, [string, string]> = { approved: ["Aprobada", "st-ok"], pending: ["Pendiente", "st-rev"], cancelled: ["Cancelada", "st-draft"] };
export const FECHAS: Array<[DateRange, string]> = [["", "Cualquier fecha"], ["7", "Últimos 7 días"], ["30", "Últimos 30 días"], ["anio", "Este año"]];

export const attTxt = (u: number, m: number | null) => (m === null ? `${u} · sin límite` : `${u} de ${m}`);
export const initialsOf = (name: string) =>
  name
    .split(" ")
    .slice(-2)
    .map((x) => x[0] ?? "")
    .join("");

export function StateTag({ cls, children }: { cls: string; children: ReactNode }) {
  return <span className={cx("state", cls)}>{children}</span>;
}

/* Select de filtro con su etiqueta (sel() del demo). Las opciones se traducen salvo translate=false (datos). */
export function FilterSelect({
  id,
  label,
  value,
  options,
  onChange,
  translate = true,
}: {
  id: string;
  label: string;
  value: string;
  options: ReadonlyArray<readonly [string, string]>;
  onChange: (v: string) => void;
  translate?: boolean | ((value: string) => boolean);
}) {
  const t = useT();
  const tr = (v: string, txt: string) => ((typeof translate === "function" ? translate(v) : translate) ? t(txt) : txt);
  return (
    <>
      <label className="l" htmlFor={id}>
        {t(label)}
      </label>
      <select className="input" id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, txt]) => (
          <option key={v} value={v}>
            {tr(v, txt)}
          </option>
        ))}
      </select>
    </>
  );
}

/* Caja de búsqueda (srch() del demo): busca al enviar. */
export function SearchBox({ value, placeholder, onSearch }: { value: string; placeholder: string; onSearch: (q: string) => void }) {
  const t = useT();
  const [q, setQ] = useState(value);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(q.trim());
  };
  return (
    <form className="srch" onSubmit={submit} role="search">
      <input className="input" name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t(placeholder)} aria-label={t(placeholder)} />
      <button className="icon-btn" type="submit" aria-label={t("Buscar")}>
        <Icon name="search" />
      </button>
    </form>
  );
}

/* Interruptor accesible (role=switch + aria-checked). label ya en español; se traduce aquí. */
export function Switch({ on, label, onToggle, disabled }: { on: boolean; label: string; onToggle: () => void; disabled?: boolean }) {
  const t = useT();
  return (
    <button type="button" className={cx("switch", on && "on")} role="switch" aria-checked={on} aria-label={t(label)} onClick={onToggle} disabled={disabled}>
      <i />
    </button>
  );
}

/* Barra de avance pequeña de las tablas. */
export function MiniProgress({ pct }: { pct: number }) {
  return (
    <>
      <div className="progress" style={{ width: 90 }} aria-hidden="true">
        <i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
      </div>
      <small style={{ color: "var(--muted)" }}>{pct}%</small>
    </>
  );
}

export function EmptyRow({ cols, children }: { cols: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={cols} style={{ color: "var(--muted)" }}>
        {children}
      </td>
    </tr>
  );
}

/* Lee un archivo de imagen como data URL validando tipo y peso. Devuelve null y avisa si no cumple. */
export function readImage(file: File | undefined, types: RegExp, maxBytes: number, msgs: { type: string; size: string }): Promise<string | null> {
  return new Promise((resolve) => {
    if (!file) return resolve(null);
    if (!types.test(file.type)) {
      toast(msgs.type);
      return resolve(null);
    }
    if (file.size > maxBytes) {
      toast(msgs.size);
      return resolve(null);
    }
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === "string" ? r.result : null);
    r.onerror = () => resolve(null);
    r.readAsDataURL(file);
  });
}

/* Descarga un CSV que genera la API (tablero, reportes) con el rol de la sesión. */
export async function downloadApiCsv(path: string, name: string): Promise<boolean> {
  const headers: Record<string, string> = { Accept: "text/csv" };
  const role = getSession().role;
  if (role) headers[DEMO_ROLE_HEADER] = role;
  try {
    const res = await fetch(API_BASE + path, { headers });
    if (!res.ok) throw new ApiError(`Error ${res.status}`, res.status);
    downloadText(name, await res.text(), "text/csv;charset=utf-8");
    return true;
  } catch (e) {
    failToast(e, "No se pudo descargar el archivo. Intenta de nuevo.");
    return false;
  }
}

/* Copia el valor de un campo de solo lectura (APP.copy del demo). */
export async function copyText(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    /* Sin permiso de portapapeles: el campo queda seleccionado para copiar a mano. */
  }
  toast("Copiado");
}
