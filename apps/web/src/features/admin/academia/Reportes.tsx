/* Pestaña Reportes: indicadores, inscripciones por mes, promedio por examen, tabla por curso y descargas CSV
   (GET /api/admin/academia/reportes/:tipo). */
import type { AcademyReport, ReportKind } from "@kiron/shared";
import { Icon, type IconName } from "../../../components/Icon";
import { ApiStatus } from "../../../components/ui";
import { useT } from "../../../i18n";
import { EmptyRow, MiniProgress, useAdminApi } from "../common";
import { reportCsv } from "./Calificaciones";

const MN: Record<string, string> = { "01": "Ene", "02": "Feb", "03": "Mar", "04": "Abr", "05": "May", "06": "Jun", "07": "Jul", "08": "Ago", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dic" };

const R: Array<[ReportKind, IconName, string, string]> = [
  ["alumno", "user", "Por alumno", "Avance, calificaciones e intentos de cada alumno"],
  ["curso", "book-open", "Por curso", "Inscritos, aprobados y calificación promedio por curso"],
  ["instructor", "graduation-cap", "Por instructor", "Cursos, alumnos y calificación promedio por instructor"],
  ["avance", "trending-up", "Avance", "Porcentaje de avance por alumno y curso"],
  ["inactividad", "user-x", "Inactividad", "Alumnos sin entrar en los últimos 30 días"],
];

export function ReportesTab() {
  const t = useT();
  const { data, loading, error, refetch } = useAdminApi<AcademyReport>("/admin/academia/reportes");
  if (!data) return <ApiStatus loading={loading} error={error} onRetry={refetch} />;
  const k = data.kpis;
  const max = Math.max(1, ...data.inscripcionesPorMes.map((m) => m.total));
  const year = new Date().getFullYear();
  const kpis: Array<[string, string, string]> = [
    ["Tasa de finalización", `${k.tasaFinalizacion} %`, "Terminaron / inscripciones aprobadas"],
    ["Calificación promedio", k.calificacionPromedio === null ? "—" : k.calificacionPromedio.toFixed(1), "Examen final"],
    ["Activos / inactivos", `${k.activos} / ${k.inactivos}`, "Según su última lección vista"],
    ["Constancias emitidas", String(k.constancias), "Cursos y diplomados"],
  ];
  return (
    <>
      <div className="kpis">
        {kpis.map(([label, val, sub]) => (
          <div className="kpi" key={label}>
            <small>{t(label)}</small>
            <b>{val}</b>
            <span className="trend">{t(sub)}</span>
          </div>
        ))}
      </div>
      <div className="two" style={{ marginTop: 0 }}>
        <div className="panel">
          <h3>{t("Inscripciones por mes")}</h3>
          <p className="sub">
            {year} · {t("inscripciones registradas")}
          </p>
          <div className="bars">
            {data.inscripcionesPorMes.map((m) => {
              const label = `${t(MN[m.mes] ?? m.mes)}: ${m.total}`;
              return (
                <div key={m.mes} style={{ height: `${Math.max(4, (m.total / max) * 100)}%` }} tabIndex={0} title={label} aria-label={label}>
                  <em>{m.total}</em>
                  <span>{t(MN[m.mes] ?? m.mes)}</span>
                </div>
              );
            })}
          </div>
          <div style={{ height: 26 }} />
        </div>
        <div className="panel">
          <h3>{t("Promedio por examen")}</h3>
          <p className="sub">{t("Todos los intentos registrados")}</p>
          {data.promedioPorExamen.slice(0, 7).map((x) => (
            <div className="list-row" key={x.slug}>
              <span className="lr-ico">
                <Icon name="clipboard-list" />
              </span>
              <div>
                <b>{x.titulo}</b>
                <small>
                  {t("Examen final")} · {x.intentos === 1 ? t("1 intento") : `${x.intentos} ${t("intentos")}`}
                </small>
              </div>
              <span className="end">
                <b>{x.promedio.toFixed(1)}</b>
              </span>
            </div>
          ))}
        </div>
      </div>
      <h3 style={{ margin: "28px 0 14px", fontSize: 22 }}>{t("Por curso")}</h3>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">{t("Curso")}</th>
              <th scope="col">{t("Inscripciones aprobadas")}</th>
              <th scope="col">{t("Terminaron")}</th>
              <th scope="col">{t("Tasa de finalización")}</th>
              <th scope="col">{t("Calificación promedio")}</th>
              <th scope="col">{t("Constancias emitidas")}</th>
            </tr>
          </thead>
          <tbody>
            {data.porCurso.map((x) => (
              <tr key={x.slug}>
                <td>
                  <b style={{ color: "var(--web-navy)" }}>{x.titulo}</b>
                </td>
                <td>{x.inscritas}</td>
                <td>{x.terminaron}</td>
                <td>
                  <MiniProgress pct={x.tasa} />
                </td>
                <td>{x.promedio === null ? "—" : x.promedio.toFixed(1)}</td>
                <td>{x.constancias}</td>
              </tr>
            ))}
            {!data.porCurso.length ? <EmptyRow cols={6}>{t("Sin inscripciones aprobadas todavía.")}</EmptyRow> : null}
          </tbody>
        </table>
      </div>
      <h3 style={{ margin: "28px 0 14px", fontSize: 22 }}>{t("Descargas")}</h3>
      <div className="grid-p three rep-grid">
        {R.map(([kind, ic, title, desc]) => (
          <div className="panel" key={kind}>
            <span className="lr-ico">
              <Icon name={ic} />
            </span>
            <h3 style={{ marginTop: 12 }}>{t(title)}</h3>
            <p className="sub">{t(desc)}</p>
            <div className="seg" style={{ flexWrap: "wrap" }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => reportCsv(kind)} aria-label={`${t("Descargar CSV")} · ${t(title)}`}>
                <Icon name="download" /> {t("CSV (abre en Excel)")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
