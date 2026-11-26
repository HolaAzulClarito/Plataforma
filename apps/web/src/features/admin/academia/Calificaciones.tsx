/* Pestaña Calificaciones (libro de calificaciones, APP.gbFilter, APP.history) y descarga a Excel. */
import { useState } from "react";
import type { GradebookRow, GradebookState, HistoryEvent } from "@kiron/shared";
import { ICONS } from "../../../components/icons";
import { Icon, type IconName } from "../../../components/Icon";
import { ApiStatus, Notice } from "../../../components/ui";
import { useT } from "../../../i18n";
import { openModal } from "../../../state/modal";
import { toast } from "../../../state/toasts";
import { attTxt, downloadApiCsv, EmptyRow, FilterSelect, MiniProgress, qs, StateTag, useAdminApi } from "../common";
import { useCourseOptions } from "./options";

const GB_CLS: Record<GradebookState, string> = { Aprobado: "st-ok", Inactivo: "st-draft", "Sin intentos": "st-rev", "En curso": "st-draft" };
const iconOf = (s: string): IconName => (s in ICONS ? (s as IconName) : "circle-dot");

function History({ u, s, titulo }: { u: string; s: string; titulo: string }) {
  const t = useT();
  const { data, loading, error, refetch } = useAdminApi<HistoryEvent[]>("/admin/academia/calificaciones/historial" + qs({ alumno: u, curso: s }));
  return (
    <div className="modal-b">
      <p style={{ color: "var(--muted)", marginBottom: 14 }}>
        {titulo} · {t("historial")}
      </p>
      <ApiStatus loading={loading && !data} error={error} onRetry={refetch} />
      {data ? (
        <div className="hist">
          {data.map((x, i) => (
            <div key={i}>
              <Icon name={iconOf(x.icono)} />
              <span>{t(x.texto)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export const reportCsv = async (tipo: string) => {
  if (await downloadApiCsv(`/admin/academia/reportes/${tipo}`, `reporte-${tipo}-kiron-demo.csv`)) toast("Reporte descargado (datos de ejemplo)");
};

export function CalificacionesTab() {
  const t = useT();
  const copts = useCourseOptions();
  const [curso, setCurso] = useState("");
  const { data, loading, error, refetch } = useAdminApi<GradebookRow[]>("/admin/academia/calificaciones" + qs({ curso }));
  return (
    <>
      <div className="tool-row">
        <FilterSelect id="gbf" label="Curso" value={curso} options={[["", "Todos los cursos"], ...copts]} translate={(v) => v === ""} onChange={setCurso} />
        <span className="grow" />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => reportCsv("alumno")}>
          <Icon name="file-spreadsheet" /> {t("Exportar a Excel")}
        </button>
      </div>
      <ApiStatus loading={loading && !data} error={error} onRetry={refetch} />
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">{t("Alumno")}</th>
              <th scope="col">{t("Curso")}</th>
              <th scope="col">{t("Avance")}</th>
              <th scope="col">{t("Calificación")}</th>
              <th scope="col">{t("Intentos del examen final")}</th>
              <th scope="col">{t("Último acceso")}</th>
              <th scope="col">{t("Estado")}</th>
              <th scope="col">
                <span className="sr">{t("Acciones")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.map((r) => (
              <tr key={`${r.u}|${r.s}`}>
                <td>
                  <b style={{ color: "var(--web-navy)" }}>{r.u}</b>
                </td>
                <td>{r.titulo}</td>
                <td>
                  <MiniProgress pct={r.avance} />
                </td>
                <td>{r.nota !== null ? r.nota.toFixed(1) : "—"}</td>
                <td>{t(attTxt(r.intentosUsados, r.intentosMax))}</td>
                <td>{r.ultimoAcceso}</td>
                <td>
                  <StateTag cls={GB_CLS[r.estado]}>{t(r.estado)}</StateTag>
                </td>
                <td className="nowrap">
                  <button
                    type="button"
                    className="mini"
                    aria-label={`${t("Historial")} · ${r.u}`}
                    onClick={() => openModal({ title: r.u, content: <History u={r.u} s={r.s} titulo={r.titulo} />, size: "sm" })}
                  >
                    <Icon name="history" /> {t("Historial")}
                  </button>
                </td>
              </tr>
            ))}
            {data && !data.length ? <EmptyRow cols={8}>{t("No hay alumnos con esos filtros.")}</EmptyRow> : null}
          </tbody>
        </table>
      </div>
      <Notice style={{ marginTop: 16 }}>
        {t("El libro de calificaciones se llena solo: cada lección vista, cada intento de examen y cada constancia queda en el historial del alumno.")}
      </Notice>
    </>
  );
}
