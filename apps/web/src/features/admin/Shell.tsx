/* Marco del administrador (adminShell() del demo): barra lateral con contadores, "Ver sitio" y "Salir". */
import type { ReactNode } from "react";
import { Link } from "react-router";
import { DEMO_ADMIN, type Dashboard } from "@kiron/shared";
import { Icon, type IconName } from "../../components/Icon";
import { useT } from "../../i18n";
import { cx } from "../../lib/cx";
import { navigate, session } from "../../state/session";
import { useAdminApi } from "./common";

export type AdminSection = "" | "medicos" | "webinars" | "club" | "academia" | "paginas";

const LINKS: Array<[AdminSection, IconName, string, string?]> = [
  ["", "chart-column", "Tablero"],
  ["medicos", "badge-check", "Médicos"],
  ["webinars", "video", "Webinars"],
  ["club", "gift", "Club MVZ"],
  ["academia", "graduation-cap", "Academia"],
  ["paginas", "pencil", "Páginas", "hide-m"],
];

/* Contadores de pendientes (cédulas e inscripciones). Comparte la lectura del tablero. */
export function useAdminCounts() {
  const { data } = useAdminApi<Dashboard>("/admin/tablero");
  return { cedulas: data?.cedulasPendientes ?? 0, inscripciones: data?.inscripcionesPendientes ?? 0 };
}

export function AdminShell({ section, children }: { section: AdminSection; children: ReactNode }) {
  const t = useT();
  const counts = useAdminCounts();
  return (
    <div className="app">
      <nav className="side" aria-label={t("Administrador")}>
        <div className="who">
          <span className="avatar" style={{ background: "var(--pp-red)", color: "var(--ink)" }} aria-hidden="true">
            {DEMO_ADMIN.initials}
          </span>
          <div>
            <b>{DEMO_ADMIN.name}</b>
            <small>
              <Icon name="shield-check" /> {t("Doble factor activo")}
            </small>
          </div>
        </div>
        {LINKS.map(([s, ic, label, cls]) => {
          const ct = s === "medicos" ? counts.cedulas : 0;
          return (
            <Link key={s || "tablero"} className={cx(section === s && "on", cls)} to={s ? `/admin/${s}` : "/admin"} aria-current={section === s ? "page" : undefined}>
              <Icon name={ic} />
              <span>{t(label)}</span>
              {ct ? (
                <span className="ct" aria-label={`${ct} ${t("pendientes")}`}>
                  {ct}
                </span>
              ) : null}
            </Link>
          );
        })}
        <div className="bottom hide-m">
          <Link to="/">
            <Icon name="globe" />
            <span>{t("Ver sitio")}</span>
          </Link>
          <button type="button" className="side-btn" onClick={() => {
              /* Primero sale de /admin: si no, RequireRole volvería a iniciar la sesión de administrador. */
              navigate("/");
              setTimeout(() => session.logout(), 0);
            }}>
            <Icon name="log-out" />
            <span>{t("Salir")}</span>
          </button>
        </div>
      </nav>
      <main className="main" id="admin-main">
        {children}
      </main>
    </div>
  );
}

/* Encabezado de sección (.main-head). */
export function MainHead({ title, sub, actions, translateTitle = true }: { title: string; sub?: string; actions?: ReactNode; translateTitle?: boolean }) {
  const t = useT();
  return (
    <div className="main-head">
      <div>
        <h1>{translateTitle ? t(title) : title}</h1>
        {sub ? <p>{t(sub)}</p> : null}
      </div>
      {actions}
    </div>
  );
}
