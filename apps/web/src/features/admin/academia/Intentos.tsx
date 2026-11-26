/* Pestaña Intentos (APP.qaF, APP.qaView): intentos del examen final con su detalle. El detalle de respuestas solo lo ve
   la administración. */
import { useState } from "react";
import { mmss, type AttemptDetail, type AttemptRow, type DateRange } from "@kiron/shared";
import { Icon } from "../../../components/Icon";
import { ApiStatus, Notice } from "../../../components/ui";
import { useT } from "../../../i18n";
import { openModal } from "../../../state/modal";
import { EmptyRow, FECHAS, FilterSelect, qs, SearchBox, StateTag, useAdminApi } from "../common";
import { useCourseOptions } from "./options";

function AttemptView({ id }: { id: number }) {
  const t = useT();
  const { data: a, loading, error, refetch } = useAdminApi<AttemptDetail>(`/admin/academia/intentos/${id}`);
  return (
    <div className="modal-b">
      <ApiStatus loading={loading && !a} error={error} onRetry={refetch} />
      {a ? (
        <>
          <p style={{ color: "var(--muted)", marginBottom: 12 }}>
            {a.titulo} · {t("Examen final")} · {a.f}
          </p>
          <div className="rows rows-light">
            <div>
              <span>{t("Calificación")}</span>
              <b>{a.nota.toFixed(1)}</b>
            </div>
            <div>
              <span>{t("Tiempo usado")}</span>
              <b>{mmss(a.t)}</b>
            </div>
            <div>
              <span>{t("Resultado")}</span>
              <b>{t(a.ok ? "Aprobado" : "No aprobado")}</b>
            </div>
          </div>
          {a.respuestas.length ? (
            <div className="q-res">
              {a.respuestas.map((x, n) => (
                <div key={x.i} className={x.ok ? "ok" : "bad"}>
                  <Icon name={x.ok ? "circle-check" : "x"} />
                  <div>
                    <b>
                      {n + 1}. {x.q}
                    </b>
                    <small>
                      {t("Respondió")}: {x.elegidas.length ? x.elegidas.join(" · ") : t("Sin respuesta")} · {t("Correcta")}: {x.correctas.join(" · ")}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="ce-hint" style={{ marginTop: 10 }}>
              {t("Este intento se migró de la plataforma anterior y no tiene respuestas guardadas; solo se conserva su calificación.")}
            </p>
          )}
          <p className="ce-hint" style={{ marginTop: 6 }}>
            <Icon name="shield-check" /> {t("Este detalle solo lo ve la administración.")}
          </p>
        </>
      ) : null}
    </div>
  );
}

export function IntentosTab() {
  const t = useT();
  const copts = useCourseOptions();
  const [f, setF] = useState<{ curso: string; q: string; rango: DateRange }>({ curso: "", q: "", rango: "" });
  const { data, loading, error, refetch } = useAdminApi<AttemptRow[]>("/admin/academia/intentos" + qs(f));
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  return (
    <>
      <div className="tool-row">
        <FilterSelect id="qf1" label="Curso" value={f.curso} options={[["", "Todos los cursos"], ...copts]} translate={(v) => v === ""} onChange={set("curso")} />
        <FilterSelect id="qf2" label="Fecha" value={f.rango} options={FECHAS} onChange={set("rango")} />
        <span className="grow" />
        <SearchBox value={f.q} placeholder="Buscar alumno" onSearch={set("q")} />
      </div>
      <ApiStatus loading={loading && !data} error={error} onRetry={refetch} />
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">{t("Alumno")}</th>
              <th scope="col">{t("Curso")}</th>
              <th scope="col">{t("Examen")}</th>
              <th scope="col">{t("Intento")}</th>
              <th scope="col">{t("Fecha")}</th>
              <th scope="col">{t("Calificación")}</th>
              <th scope="col">{t("Tiempo usado")}</th>
              <th scope="col">{t("Resultado")}</th>
              <th scope="col">
                <span className="sr">{t("Acciones")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.map((r) => (
              <tr key={r.id}>
                <td>
                  <b style={{ color: "var(--web-navy)" }}>{r.u}</b>
                </td>
                <td>{r.titulo}</td>
                <td>{t("Examen final")}</td>
                <td>{r.n}</td>
                <td className="nowrap">{r.f}</td>
                <td>{r.nota.toFixed(1)}</td>
                <td>{mmss(r.t)}</td>
                <td>
                  <StateTag cls={r.ok ? "st-ok" : "st-rev"}>{t(r.ok ? "Aprobado" : "No aprobado")}</StateTag>
                </td>
                <td className="nowrap">
                  <button
                    type="button"
                    className="mini"
                    aria-label={`${t("Ver respuestas")} · ${r.u} · ${t("Intento")} ${r.n}`}
                    onClick={() => openModal({ title: `Intento ${r.n} · ${r.u}`, content: <AttemptView id={r.id} /> })}
                  >
                    <Icon name="eye" /> {t("Ver respuestas")}
                  </button>
                </td>
              </tr>
            ))}
            {data && !data.length ? <EmptyRow cols={9}>{t("No hay intentos con esos filtros.")}</EmptyRow> : null}
          </tbody>
        </table>
      </div>
      <Notice icon="shield-check" style={{ marginTop: 16 }}>
        {t("El detalle de respuestas solo lo ve la administración. El alumno ve únicamente su calificación final.")}
      </Notice>
    </>
  );
}
