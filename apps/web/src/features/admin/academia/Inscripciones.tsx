/* Pestaña Inscripciones (APP.enrF, enrSel, enrAll, enrSet, enrBulk, enrNew, enrNewSave). La inscripción aprobada es el
   único control de acceso; el precio no interviene. */
import { useMemo, useState, type FormEvent } from "react";
import type {
  AdminEnrollRequest,
  AdminEnrollment,
  AdminEnrollmentList,
  DateRange,
  Enrollment,
  EnrollmentBulkRequest,
  EnrollmentState,
  StudentRow,
} from "@kiron/shared";
import { normalize } from "@kiron/shared";
import { Icon } from "../../../components/Icon";
import { ApiStatus, Notice } from "../../../components/ui";
import { useT } from "../../../i18n";
import { apiPatch, apiPost } from "../../../lib/api";
import { closeModal, openModal } from "../../../state/modal";
import { navigate } from "../../../state/session";
import { toast } from "../../../state/toasts";
import { EmptyRow, EST, FECHAS, FilterSelect, qs, SearchBox, StateTag, useAction, useAdminApi } from "../common";
import { useCourseOptions } from "./options";

const KPIS: Array<[EnrollmentState, string, string]> = [
  ["approved", "Aprobadas", "Dan acceso al curso"],
  ["pending", "Pendientes", "Solicitudes por revisar"],
  ["cancelled", "Canceladas", "Sin acceso; las constancias se conservan"],
];

const okMsg = (st: EnrollmentState) =>
  st === "approved" ? "Inscripción aprobada. El alumno ya ve el curso en su panel." : "Inscripción cancelada. El alumno pierde el acceso; sus constancias se conservan.";

function EnrollRow({ e, checked, onCheck }: { e: AdminEnrollment; checked: boolean; onCheck: (on: boolean) => void }) {
  const t = useT();
  const { busy, run } = useAction();
  const set = (st: EnrollmentState) => run(() => apiPatch<Enrollment>(`/admin/inscripciones/${e.id}`, { estado: st }), okMsg(st));
  const [label, cls] = EST[e.st];
  return (
    <tr>
      <td className="chk">
        <input type="checkbox" aria-label={`${t("Seleccionar a")} ${e.u}`} checked={checked} onChange={(x) => onCheck(x.target.checked)} />
      </td>
      <td>
        <b style={{ color: "var(--web-navy)" }}>{e.u}</b>
        <small style={{ display: "block", color: "var(--muted)" }}>{e.correo}</small>
      </td>
      <td>{e.titulo}</td>
      <td className="nowrap">{e.f}</td>
      <td>
        <StateTag cls={cls}>{t(label)}</StateTag>
      </td>
      <td>{t(e.por)}</td>
      <td className="nowrap">
        {e.st !== "approved" ? (
          <button type="button" className="mini" disabled={busy} onClick={() => set("approved")} aria-label={`${t("Aprobar")} · ${e.u} · ${e.titulo}`}>
            <Icon name="check" /> {t("Aprobar")}
          </button>
        ) : null}
        {e.st !== "cancelled" ? (
          <>
            {" "}
            <button type="button" className="mini" disabled={busy} onClick={() => set("cancelled")} aria-label={`${t("Cancelar")} · ${e.u} · ${e.titulo}`}>
              <Icon name="x" /> {t("Cancelar")}
            </button>
          </>
        ) : null}
      </td>
    </tr>
  );
}

export function InscripcionesTab() {
  const t = useT();
  const copts = useCourseOptions();
  const [f, setF] = useState<{ curso: string; estado: "" | EnrollmentState; q: string; rango: DateRange }>({ curso: "", estado: "", q: "", rango: "" });
  const [sel, setSel] = useState<Set<number>>(new Set());
  const counts = useAdminApi<AdminEnrollmentList>("/admin/inscripciones");
  const { data, loading, error, refetch } = useAdminApi<AdminEnrollmentList>("/admin/inscripciones" + qs(f));
  const { busy, run } = useAction();
  const rows = data?.items ?? [];
  const setFilter = (k: keyof typeof f, v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    setSel(new Set());
  };
  const allOn = rows.length > 0 && rows.every((e) => sel.has(e.id));
  const bulk = async (estado: EnrollmentState) => {
    if (!sel.size) {
      toast("Selecciona al menos una inscripción");
      return;
    }
    const body: EnrollmentBulkRequest = { ids: [...sel], estado };
    const r = await run(
      () => apiPost<{ actualizadas: number }>("/admin/inscripciones/lote", body),
      ({ actualizadas: n }) =>
        estado === "approved" ? (n === 1 ? "1 inscripción aprobada" : `${n} inscripciones aprobadas`) : n === 1 ? "1 inscripción cancelada" : `${n} inscripciones canceladas`,
    );
    if (r) setSel(new Set());
  };
  const conteo = counts.data?.conteo;

  return (
    <>
      <div className="kpis kpis-3">
        {KPIS.map(([k, label, sub]) => (
          <button key={k} type="button" className={`kpi kpi-btn ${f.estado === k ? "on" : ""}`} aria-pressed={f.estado === k} onClick={() => setFilter("estado", f.estado === k ? "" : k)}>
            <small>{t(label)}</small>
            <b>{conteo?.[k] ?? 0}</b>
            <span className="trend">{t(sub)}</span>
          </button>
        ))}
      </div>
      <div className="tool-row">
        <FilterSelect id="ef1" label="Curso" value={f.curso} options={[["", "Todos los cursos"], ...copts]} translate={(v) => v === ""} onChange={(v) => setFilter("curso", v)} />
        <FilterSelect
          id="ef2"
          label="Estado"
          value={f.estado}
          options={[
            ["", "Todos"],
            ["approved", "Aprobadas"],
            ["pending", "Pendientes"],
            ["cancelled", "Canceladas"],
          ]}
          onChange={(v) => setFilter("estado", v)}
        />
        <FilterSelect id="ef3" label="Fecha" value={f.rango} options={FECHAS} onChange={(v) => setFilter("rango", v)} />
        <span className="grow" />
        <SearchBox value={f.q} placeholder="Buscar alumno o correo" onSearch={(v) => setFilter("q", v)} />
      </div>
      <div className="bulk" id="bulkE">
        <label className="ce-chk">
          <input type="checkbox" id="selAllE" checked={allOn} onChange={(e) => setSel(e.target.checked ? new Set(rows.map((x) => x.id)) : new Set())} />{" "}
          <span>
            {t("Seleccionar los")} {rows.length} {t("resultados")}
          </span>
        </label>
        <span className="bulk-n" aria-live="polite">
          {sel.size ? (sel.size === 1 ? t("1 seleccionada") : `${sel.size} ${t("seleccionadas")}`) : t("Ninguna seleccionada")}
        </span>
        <span className="grow" />
        <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => bulk("approved")}>
          <Icon name="check" /> {t("Aprobar")}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => bulk("cancelled")}>
          <Icon name="x" /> {t("Cancelar")}
        </button>
      </div>
      <ApiStatus loading={loading && !data} error={error} onRetry={refetch} />
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th className="chk" scope="col">
                <span className="sr">{t("Seleccionar")}</span>
              </th>
              <th scope="col">{t("Alumno")}</th>
              <th scope="col">{t("Curso")}</th>
              <th scope="col">{t("Fecha")}</th>
              <th scope="col">{t("Estado")}</th>
              <th scope="col">{t("Inscrito por")}</th>
              <th scope="col">
                <span className="sr">{t("Acciones")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <EnrollRow
                key={e.id}
                e={e}
                checked={sel.has(e.id)}
                onCheck={(on) =>
                  setSel((s) => {
                    const n = new Set(s);
                    if (on) n.add(e.id);
                    else n.delete(e.id);
                    return n;
                  })
                }
              />
            ))}
            {data && !rows.length ? <EmptyRow cols={7}>{t("No hay inscripciones con esos filtros.")}</EmptyRow> : null}
          </tbody>
        </table>
      </div>
      <Notice style={{ marginTop: 16 }}>
        {t(
          "La inscripción es el único control de acceso: no hay cobro en línea y el precio del curso no interviene. Solo una inscripción aprobada abre el curso. Al cancelarla, el médico pierde el acceso al contenido, pero conserva sus constancias emitidas. En la plataforma, las acciones en lote se procesan en segundo plano para miles de registros.",
        )}
      </Notice>
    </>
  );
}

/* Inscribir alumnos registrados a un curso (APP.enrNew). Quedan aprobadas. */
export function EnrollForm({ preselect }: { preselect?: string }) {
  const t = useT();
  const copts = useCourseOptions();
  const students = useAdminApi<StudentRow[]>("/admin/academia/alumnos");
  const [curso, setCurso] = useState("");
  const [filter, setFilter] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set(preselect ? [preselect] : []));
  const { busy, run } = useAction();
  const visible = useMemo(() => {
    const q = normalize(filter.trim());
    return (students.data ?? []).map((s) => ({ s, hidden: !!q && !normalize(`${s.nombre} ${s.correo}`).includes(q) }));
  }, [students.data, filter]);
  const slug = curso || copts[0]?.[0] || "";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!picked.size) {
      toast("Elige al menos un alumno");
      return;
    }
    if (!slug) return;
    const body: AdminEnrollRequest = { curso: slug, correos: [...picked] };
    const n = picked.size;
    const r = await run(
      () => apiPost<{ inscritas: Enrollment[] }>("/admin/inscripciones", body),
      n === 1 ? "1 alumno inscrito. Ya ve el curso en su panel." : `${n} alumnos inscritos. Ya ven el curso en su panel.`,
    );
    if (r) {
      closeModal();
      navigate("/admin/academia/inscripciones");
    }
  };

  return (
    <form className="modal-b" onSubmit={submit}>
      <div className="form-row">
        <label className="l" htmlFor="enC">
          {t("Curso o diplomado")}
        </label>
        <select className="input" id="enC" value={slug} onChange={(e) => setCurso(e.target.value)}>
          {copts.map(([s, title]) => (
            <option key={s} value={s}>
              {title}
            </option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <label className="l" htmlFor="enQ">
          {t("Alumnos")}
        </label>
        <input className="input" id="enQ" placeholder={t("Filtrar por nombre o correo")} value={filter} onChange={(e) => setFilter(e.target.value)} autoComplete="off" />
      </div>
      <ApiStatus loading={students.loading && !students.data} error={students.error} onRetry={students.refetch} />
      <div className="pick" id="enL">
        {visible.map(({ s, hidden }) => (
          <label className="list-row" key={s.correo} hidden={hidden}>
            <input
              type="checkbox"
              name="es"
              checked={picked.has(s.correo)}
              onChange={(e) =>
                setPicked((p) => {
                  const n = new Set(p);
                  if (e.target.checked) n.add(s.correo);
                  else n.delete(s.correo);
                  return n;
                })
              }
            />
            <div>
              <b>{s.nombre}</b>
              <small>{s.correo}</small>
            </div>
          </label>
        ))}
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "12px 0 16px" }}>
        {t("La inscripción queda aprobada y el alumno ve el curso en su panel. No hay cobro; el precio del curso no interviene.")}
      </p>
      <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
        <Icon name="check" /> {t("Inscribir y aprobar")}
      </button>
    </form>
  );
}

export const openEnroll = (correo?: string) => openModal({ title: "Inscribir alumnos", content: <EnrollForm preselect={correo} /> });
