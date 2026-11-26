/* Motor de traducción portado de legacy/assets/js/i18n.js, sin tocar el DOM (ADR-004).
   Orden de búsqueda, igual que el demo: 1) diccionario exacto, 2) expresiones regulares, 3) funciones y,
   si nada coincide y el texto contiene " · ", 4) traduce cada parte por separado y las vuelve a unir. */
import type { Lang } from "@kiron/shared";
import { I18N_EN, I18N_FN, I18N_RX, type Groups, type I18nFnContext } from "./en";
import { I18N_EXTRA, I18N_EXTRA_RX } from "./extra";

const DICT: Readonly<Record<string, string>> = { ...I18N_EN, ...I18N_EXTRA };
const RX: ReadonlyArray<readonly [RegExp, string]> = [...I18N_EXTRA_RX, ...I18N_RX].map(([a, b]) => [new RegExp(a), b] as const);
const HAS_LETTERS = /[A-Za-zÁÉÍÓÚáéíóúñÑ]/;

let cats: readonly string[] = [];
/* Las categorías del catálogo vienen de la API; la regla "Ver <categoría>" las necesita. */
export function setI18nCategories(list: readonly string[]): void {
  cats = list;
}

function one(k: string): string | null {
  if (Object.hasOwn(DICT, k)) return DICT[k] ?? null;
  for (const [r, b] of RX) if (r.test(k)) return k.replace(r, b);
  const ctx: I18nFnContext = { tr: translate, cats };
  for (const [r, f] of I18N_FN) {
    const m = k.match(r);
    if (m) {
      const v = f(m as unknown as Groups, ctx);
      if (v != null) return v;
    }
  }
  return null;
}

function core(k: string): string | null {
  const v = one(k);
  if (v != null) return v;
  if (k.includes(" · ")) {
    let hit = false;
    const out = k.split(" · ").map((p) => {
      const x = p.trim() ? one(p.trim()) : null;
      if (x != null) {
        hit = true;
        return x;
      }
      return p;
    });
    if (hit) return out.join(" · ");
  }
  return null;
}

/* Traduce al inglés conservando los espacios alrededor. Devuelve null si no hay traducción (equivale a I18N.tr). */
export function translate(s: string): string | null {
  const k = s.trim();
  if (!k || !HAS_LETTERS.test(k)) return null;
  const v = core(k);
  return v == null ? null : s.replace(k, v);
}

/* Textos sin traducción encontrados en inglés. Lo usan los tests para detectar faltantes. */
const missing = new Set<string>();
export const getMissing = (): string[] => [...missing];
export const clearMissing = (): void => missing.clear();

export function translateTo(lang: Lang, s: string): string {
  if (lang === "es") return s;
  const v = translate(s);
  if (v == null) {
    if (HAS_LETTERS.test(s)) missing.add(s.trim());
    return s;
  }
  return v;
}
