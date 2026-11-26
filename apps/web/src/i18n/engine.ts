/* Motor de traducción portado de legacy/assets/js/i18n.js, sin tocar el DOM (ADR-004).
   Orden de búsqueda, igual que el demo: 1) diccionario exacto, 2) expresiones regulares, 3) funciones y,
   si nada coincide y el texto contiene " · ", 4) traduce cada parte por separado y las vuelve a unir.
   Los diccionarios en inglés (en.ts y extra-*.ts) se cargan bajo demanda con import() la primera vez que se pide inglés
   (loadEnglish). El español no espera nada. Mientras no carga, translate() devuelve null y la interfaz sigue en español. */
import type { Lang } from "@kiron/shared";
import type { Groups, I18nFn, I18nFnContext } from "./en";

interface Dictionaries {
  dict: Readonly<Record<string, string>>;
  rx: ReadonlyArray<readonly [RegExp, string]>;
  fn: readonly I18nFn[];
}

let dicts: Dictionaries | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const HAS_LETTERS = /[A-Za-zÁÉÍÓÚáéíóúñÑ]/;

/* Carga (una sola vez) los diccionarios en inglés en su propio chunk. */
export function loadEnglish(): Promise<void> {
  if (dicts) return Promise.resolve();
  loading ??= Promise.all([import("./en"), import("./extra"), import("./extra-academia"), import("./extra-admin")])
    .then(([en, ex, ac, ad]) => {
      dicts = {
        dict: { ...en.I18N_EN, ...ex.I18N_EXTRA, ...ac.I18N_EXTRA_ACADEMIA, ...ad.I18N_EXTRA_ADMIN },
        rx: [...ad.I18N_EXTRA_ADMIN_RX, ...ac.I18N_EXTRA_ACADEMIA_RX, ...ex.I18N_EXTRA_RX, ...en.I18N_RX].map(([a, b]) => [new RegExp(a), b] as const),
        fn: en.I18N_FN,
      };
      listeners.forEach((f) => f());
    })
    .catch((e: unknown) => {
      loading = null;
      throw e;
    });
  return loading;
}

/* ¿Ya están los diccionarios en inglés? Para useSyncExternalStore. */
export const isEnglishReady = (): boolean => dicts !== null;
export function onEnglishReady(f: () => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}

let cats: readonly string[] = [];
/* Las categorías del catálogo vienen de la API; la regla "Ver <categoría>" las necesita. */
export function setI18nCategories(list: readonly string[]): void {
  cats = list;
}

function one(k: string): string | null {
  if (!dicts) return null;
  const { dict, rx, fn } = dicts;
  if (Object.hasOwn(dict, k)) return dict[k] ?? null;
  for (const [r, b] of rx) if (r.test(k)) return k.replace(r, b);
  const ctx: I18nFnContext = { tr: translate, cats };
  for (const [r, f] of fn) {
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
  /* Sin diccionario todavía (cargando): se muestra el español y no cuenta como faltante. */
  if (lang === "es" || !dicts) return s;
  const v = translate(s);
  if (v == null) {
    if (HAS_LETTERS.test(s)) missing.add(s.trim());
    return s;
  }
  return v;
}
