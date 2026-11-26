import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { Lang } from "@kiron/shared";
import { useSession } from "../state/session";
import { isEnglishReady, loadEnglish, onEnglishReady, translateTo } from "./engine";

export type TFunction = (es: string) => string;

interface I18nValue {
  lang: Lang;
  t: TFunction;
}

const I18nContext = createContext<I18nValue | null>(null);

/* Idioma que se puede pintar ya: si piden inglés y el diccionario sigue cargando, se queda en español (sin pantalla en
   blanco ni textos a medias) y cambia de golpe cuando llega. El español nunca espera. */
function useEffectiveLang(): { lang: Lang; pending: boolean } {
  const { lang } = useSession();
  const ready = useSyncExternalStore(onEnglishReady, isEnglishReady, isEnglishReady);
  useEffect(() => {
    if (lang === "en" && !ready) loadEnglish().catch(() => undefined);
  }, [lang, ready]);
  const pending = lang === "en" && !ready;
  return { lang: pending ? "es" : lang, pending };
}

/* Provee el idioma de la sesión y t(). Sincroniza <html lang> para lectores de pantalla. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { lang, pending } = useEffectiveLang();
  const value = useMemo<I18nValue>(() => ({ lang, t: (es: string) => translateTo(lang, es) }), [lang]);
  useEffect(() => {
    document.documentElement.lang = lang === "en" ? "en" : "es-MX";
    /* Mientras llega el diccionario: cursor de espera discreto, sin cambiar el contenido. */
    document.documentElement.toggleAttribute("aria-busy", pending);
    document.documentElement.classList.toggle("i18n-loading", pending);
  }, [lang, pending]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/* t("texto en español") -> texto en el idioma actual. Los datos de la API (nombres de producto, títulos de curso)
   NO se pasan por t(). */
export function useT(): TFunction {
  return useI18n().t;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  const { lang } = useSession();
  return ctx ?? { lang: lang === "en" && isEnglishReady() ? "en" : "es", t: (es: string) => translateTo(lang, es) };
}
