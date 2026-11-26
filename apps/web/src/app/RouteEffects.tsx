/* Efectos globales por cambio de ruta: título del documento, scroll al inicio, cierre del modal y puente del
   navigate del router hacia el store de sesión. */
import { useEffect, useLayoutEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { useT } from "../i18n";
import { scrollToTop } from "../lib/motion";
import { closeModal } from "../state/modal";
import { setNavigator } from "../state/session";

const TITLES: Record<string, string> = {
  productos: "Productos",
  producto: "Producto",
  academia: "Academia",
  panel: "Mi panel",
  admin: "Administrador",
  representantes: "Representantes",
  webinar: "Webinar",
  farmacovigilancia: "Farmacovigilancia",
  verificar: "Verificar constancia",
  legal: "Legal",
};

/* Título como el demo: "<Sección> · Kirón · Demo" (o "Kirón · Demo" en el inicio). Sección en español. */
export function titleFor(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (!seg) return "Kirón · Demo";
  return `${TITLES[seg] ?? "Kirón"} · Kirón · Demo`;
}

export function RouteEffects() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const t = useT();

  useLayoutEffect(() => {
    setNavigator((to) => navigate(to));
    return () => setNavigator(null);
  }, [navigate]);

  useEffect(() => {
    const [section, ...rest] = titleFor(pathname).split(" · ");
    document.title = [t(section ?? ""), ...rest].join(" · ");
  }, [pathname, t]);

  /* Al cambiar de página: cierra el modal y sube al inicio (salvo que la URL pida una sección con ?sec=). */
  useEffect(() => {
    closeModal();
    if (!new URLSearchParams(search).get("sec")) scrollToTop();
  }, [pathname, search]);

  return null;
}
