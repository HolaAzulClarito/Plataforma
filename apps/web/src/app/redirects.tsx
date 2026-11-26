/* Compatibilidad con las URLs del demo (docs/mapa-rutas.md):
   - Enlaces viejos con hash: /#/productos?cat=X -> /productos?cat=X
   - Alias: /consultorio* -> /panel*, /videoteca-pets -> /videoteca, /distribuidores-mexico, /distribuidores-mundo,
     /distribuidores (y cualquier subruta que no sea "mundo") -> /distribuidores/mexico, /donde-comprar -> /representantes,
     /webinar (sin slug) -> /webinar/proximo (legacy app.js: webinarLanding(seg[1] || "proximo")) */
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

/* "#/ruta?x=1" -> "/ruta?x=1". Devuelve null si el hash no es una ruta vieja (p. ej. "#view" del skip-link). */
export function legacyHashToPath(hash: string): string | null {
  if (!hash.startsWith("#/")) return null;
  const path = hash.slice(1);
  return path || "/";
}

/* Ruta canónica para un alias, o null si la ruta ya es canónica. Conserva el resto de la ruta en /consultorio. */
export function resolveAlias(pathname: string): string | null {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/consultorio" || p.startsWith("/consultorio/")) return "/panel" + p.slice("/consultorio".length);
  if (p === "/videoteca-pets") return "/videoteca";
  if (p === "/distribuidores-mexico") return "/distribuidores/mexico";
  if (p === "/distribuidores-mundo") return "/distribuidores/mundo";
  if (p === "/distribuidores") return "/distribuidores/mexico";
  if (p.startsWith("/distribuidores/") && p !== "/distribuidores/mexico" && p !== "/distribuidores/mundo") return "/distribuidores/mexico";
  if (p === "/donde-comprar") return "/representantes";
  if (p === "/webinar") return "/webinar/proximo";
  return null;
}

/* Calcula a dónde redirigir (o null). Un hash viejo se resuelve primero y luego pasa por los alias. */
export function redirectTarget(pathname: string, search: string, hash: string): string | null {
  const fromHash = legacyHashToPath(hash);
  if (fromHash !== null) {
    const [path = "/", qs = ""] = fromHash.split("?");
    return (resolveAlias(path) ?? path) + (qs ? "?" + qs : "");
  }
  const alias = resolveAlias(pathname);
  return alias === null ? null : alias + search;
}

/* Envuelve las rutas: si la URL es vieja, redirige (replace) antes de pintar. */
export function LegacyRedirects({ children }: { children: ReactNode }) {
  const { pathname, search, hash } = useLocation();
  const to = redirectTarget(pathname, search, hash);
  if (to !== null) return <Navigate to={to} replace />;
  return <>{children}</>;
}
