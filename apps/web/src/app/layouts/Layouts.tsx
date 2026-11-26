/* Layouts:
   - PublicLayout: aviso de demo + encabezado + contenido (#view) + pie. Sitio, academia y webinars.
   - AppLayout: aviso de demo + encabezado + contenido, SIN pie. /panel/* y /admin/*.
   - RequireRole: comportamiento heredado del demo: entrar a /panel o /admin sin el rol inicia la sesión simulada. */
import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { Outlet, useLocation } from "react-router";
import type { Role } from "@kiron/shared";
import { useReveal } from "../../lib/motion";
import { hasRole, session, useSession } from "../../state/session";
import { Footer } from "./Footer";
import { Header } from "./Header";

function View({ main }: { main: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  /* El contenedor #view es estable (el revelado observa sus cambios); el hijo con key = pathname reinicia la
     animación de entrada de página en cada cambio de ruta, como el demo. */
  useReveal(ref);
  const inner = (
    <div className="page-enter" key={pathname}>
      <Outlet />
    </div>
  );
  return main ? (
    <main id="view" ref={ref} tabIndex={-1}>
      {inner}
    </main>
  ) : (
    <div id="view" ref={ref as RefObject<HTMLDivElement | null>} tabIndex={-1}>
      {inner}
    </div>
  );
}

export function PublicLayout() {
  return (
    <>
      <Header />
      <View main />
      <Footer />
    </>
  );
}

/* En /panel y /admin la página trae su propio <main class="main"> dentro de .app; aquí va un div. */
export function AppLayout() {
  return (
    <>
      <Header />
      <View main={false} />
    </>
  );
}

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const current = useSession().role;
  const ok = hasRole(current, role);
  useEffect(() => {
    if (!ok) session.ensureRole(role);
  }, [ok, role]);
  return ok ? <>{children}</> : null;
}
