import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import type { Lang } from "@kiron/shared";
import { useSession } from "../state/session";
import { translateTo } from "./engine";

export type TFunction = (es: string) => string;

interface I18nValue {
  lang: Lang;
  t: TFunction;
}

const I18nContext = createContext<I18nValue | null>(null);

/* Provee el idioma de la sesión y t(). Sincroniza <html lang> para lectores de pantalla. */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { lang } = useSession();
  const value = useMemo<I18nValue>(() => ({ lang, t: (es: string) => translateTo(lang, es) }), [lang]);
  useEffect(() => {
    document.documentElement.lang = lang === "en" ? "en" : "es-MX";
  }, [lang]);
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
  return ctx ?? { lang, t: (es: string) => translateTo(lang, es) };
}
