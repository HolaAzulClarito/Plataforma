/* Academia del administrador (adminAcademia(t) del demo): encabezado, 10 pestañas y el contenido de cada una. */
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Icon, type IconName } from "../../../components/Icon";
import { useT } from "../../../i18n";
import { cx } from "../../../lib/cx";
import { useAdminCounts } from "../Shell";
import { AjustesTab } from "./Ajustes";
import { AlumnosTab } from "./Alumnos";
import { AutomatizacionesTab } from "./Automatizaciones";
import { CalificacionesTab } from "./Calificaciones";
import { ConstanciasTab } from "./Constancias";
import { openCourseNew } from "../editor/CourseNew";
import { CursosTab } from "./Cursos";
import { ExamenesTab } from "./Examenes";
import { InscripcionesTab, openEnroll } from "./Inscripciones";
import { IntentosTab } from "./Intentos";
import { ReportesTab } from "./Reportes";

export const ACADEMIA_TABS = [
  ["cursos", "book-open", "Cursos"],
  ["inscripciones", "badge-check", "Inscripciones"],
  ["alumnos", "users", "Alumnos y grupos"],
  ["calificaciones", "list-checks", "Calificaciones"],
  ["intentos", "history", "Intentos"],
  ["examenes", "clipboard-list", "Exámenes"],
  ["constancias", "award", "Constancias"],
  ["automatizaciones", "bell", "Automatizaciones"],
  ["reportes", "chart-column", "Reportes"],
  ["ajustes", "settings", "Ajustes"],
] as const satisfies ReadonlyArray<readonly [string, IconName, string]>;

export type AcademiaTab = (typeof ACADEMIA_TABS)[number][0];
export const isAcademiaTab = (s: string): s is AcademiaTab => ACADEMIA_TABS.some((x) => x[0] === s);


const BODY: Record<AcademiaTab, () => ReactNode> = {
  cursos: () => <CursosTab />,
  inscripciones: () => <InscripcionesTab />,
  alumnos: () => <AlumnosTab />,
  calificaciones: () => <CalificacionesTab />,
  intentos: () => <IntentosTab />,
  examenes: () => <ExamenesTab />,
  constancias: () => <ConstanciasTab />,
  automatizaciones: () => <AutomatizacionesTab />,
  reportes: () => <ReportesTab />,
  ajustes: () => <AjustesTab />,
};

export function AcademiaAdmin({ tab }: { tab: AcademiaTab }) {
  const t = useT();
  const { inscripciones: pendN } = useAdminCounts();
  return (
    <>
      <div className="main-head">
        <div>
          <h1>{t("Academia")}</h1>
          <p>{t("Cursos, inscripciones, exámenes y reportes · alumnos de ejemplo")}</p>
        </div>
        {tab === "cursos" ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={openCourseNew}>
            <Icon name="plus" /> {t("Nuevo curso")}
          </button>
        ) : tab === "inscripciones" ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => openEnroll()}>
            <Icon name="plus" /> {t("Inscribir alumnos")}
          </button>
        ) : null}
      </div>
      <nav className="atabs" aria-label={t("Secciones de la academia")}>
        {ACADEMIA_TABS.map(([k, ic, label]) => (
          <Link key={k} className={cx(tab === k && "on")} to={`/admin/academia/${k}`} aria-current={tab === k ? "page" : undefined}>
            <Icon name={ic} />
            <span>{t(label)}</span>
            {k === "inscripciones" && pendN ? (
              <span className="ct" aria-label={`${pendN} ${t("pendientes")}`}>
                {pendN}
              </span>
            ) : null}
          </Link>
        ))}
      </nav>
      {BODY[tab]()}
    </>
  );
}
