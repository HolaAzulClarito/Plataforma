/* Pestaña Alumnos y grupos (APP.stuF, importOpen/importRun/importDone, template, groupAdd/Assign/Save/View). */
import { useState, type FormEvent } from "react";
import type { DateRange, Group, GroupDetail, GroupUpdateRequest, ImportRequest, ImportResult, StudentOrder, StudentRow } from "@kiron/shared";
import { Icon } from "../../../components/Icon";
import { ApiStatus } from "../../../components/ui";
import { useT } from "../../../i18n";
import { apiPatch, apiPost } from "../../../lib/api";
import { downloadText } from "../../../lib/download";
import { closeModal, openModal } from "../../../state/modal";
import { toast } from "../../../state/toasts";
import { EmptyRow, FECHAS, FilterSelect, initialsOf, MiniProgress, qs, SearchBox, useAction, useAdminApi } from "../common";
import { openEnroll } from "./Inscripciones";
import { courseTitleOf, useCourseOptions } from "./options";

type ImportRow = { nombre: string; correo: string; grupo: string };

/* Lista de ejemplo del demo (botón "Usar un archivo de ejemplo"). Correos ficticios. */
const SAMPLE: ImportRow[] = [
  { nombre: "MVZ Karla Medina", correo: "karla.medina@correo-ejemplo.mx", grupo: "Equipo clínico Bajío" },
  { nombre: "MVZ Óscar Lozano", correo: "oscar.lozano@correo-ejemplo.mx", grupo: "Equipo clínico Bajío" },
  { nombre: "MVZ Daniela Ríos", correo: "daniela.rios@correo-ejemplo.mx", grupo: "Equipo clínico Bajío" },
  { nombre: "MVZ Tomás Villa", correo: "tomas.villa@correo-ejemplo.mx", grupo: "Equipo clínico Bajío" },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* CSV con encabezados nombre,correo,whatsapp,cedula,grupo (la plantilla). Separador coma o punto y coma. */
export function parseStudentsCsv(text: string): { rows: ImportRow[]; invalid: number } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { rows: [], invalid: 0 };
  const sep = lines[0]!.includes(";") && !lines[0]!.includes(",") ? ";" : ",";
  const cells = (l: string) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
  const head = cells(lines[0]!).map((h) => h.toLowerCase());
  const iN = head.indexOf("nombre");
  const iC = head.indexOf("correo");
  const iG = head.indexOf("grupo");
  const body = iN >= 0 && iC >= 0 ? lines.slice(1) : lines;
  let invalid = 0;
  const rows: ImportRow[] = [];
  for (const l of body) {
    const c = cells(l);
    const r = { nombre: (c[iN >= 0 ? iN : 0] ?? "").slice(0, 120), correo: (c[iC >= 0 ? iC : 1] ?? "").toLowerCase(), grupo: iG >= 0 ? (c[iG] ?? "") : "" };
    if (!r.nombre || !EMAIL.test(r.correo)) invalid++;
    else rows.push(r);
  }
  return { rows, invalid };
}

function ImportDialog({ groups }: { groups: Group[] }) {
  const t = useT();
  const [file, setFile] = useState<{ name: string; rows: ImportRow[]; invalid: number } | null>(null);
  const [grupo, setGrupo] = useState("");
  const { busy, run } = useAction();
  const pick = (name: string, rows: ImportRow[], invalid: number) => {
    setFile({ name, rows, invalid });
    const g = groups.find((x) => rows.some((r) => r.grupo === x.nombre));
    setGrupo(g ? String(g.id) : "");
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) {
      toast("Por ahora importa la lista en CSV: en Excel, Guardar como, CSV UTF-8.");
      return;
    }
    const { rows, invalid } = parseStudentsCsv(await f.text());
    pick(f.name, rows, invalid);
  };
  const submit = async () => {
    if (!file?.rows.length) return;
    const body: ImportRequest = { alumnos: file.rows.map(({ nombre, correo }) => ({ nombre, correo })), ...(grupo ? { grupo: Number(grupo) } : {}) };
    const r = await run(() => apiPost<ImportResult>("/admin/academia/alumnos/importar", body), (x) =>
      x.repetidos ? `${x.agregados} alumnos agregados · ${x.repetidos} correos repetidos omitidos` : `${x.agregados} alumnos agregados. Recibieron su acceso por correo.`,
    );
    if (r) closeModal();
  };
  if (!file)
    return (
      <div className="modal-b" id="impB">
        <label className="drop">
          <input type="file" accept=".csv,.xlsx,.xls" className="sr" onChange={(e) => onFile(e.target.files?.[0])} />
          <Icon name="upload" />
          <b>{t("Elige tu archivo")}</b>
          <small>{t("CSV con las columnas de la plantilla")}</small>
        </label>
        <button type="button" className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={() => pick("alumnos-ejemplo.csv", SAMPLE, 0)}>
          {t("Usar un archivo de ejemplo")}
        </button>
      </div>
    );
  return (
    <div className="modal-b" id="impB">
      <p style={{ color: "var(--muted)", marginBottom: 12 }}>
        {file.name} · {t("vista previa")}
      </p>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">{t("Nombre")}</th>
              <th scope="col">{t("Correo")}</th>
              <th scope="col">{t("Grupo")}</th>
            </tr>
          </thead>
          <tbody>
            {file.rows.slice(0, 50).map((r) => (
              <tr key={r.correo}>
                <td>{r.nombre}</td>
                <td>{r.correo}</td>
                <td>{r.grupo || "—"}</td>
              </tr>
            ))}
            {!file.rows.length ? <EmptyRow cols={3}>{t("No encontramos alumnos válidos en el archivo.")}</EmptyRow> : null}
          </tbody>
        </table>
      </div>
      <div className="rows" style={{ margin: "14px 0" }}>
        <div>
          <span>{t("Alumnos válidos")}</span>
          <b>{file.rows.length}</b>
        </div>
        <div>
          <span>{t("Filas sin nombre o correo válido (se omiten)")}</span>
          <b>{file.invalid}</b>
        </div>
      </div>
      <div className="form-row">
        <label className="l" htmlFor="impG">
          {t("Agregar al grupo")}
        </label>
        <select className="input" id="impG" value={grupo} onChange={(e) => setGrupo(e.target.value)}>
          <option value="">{t("Sin grupo")}</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.nombre}
            </option>
          ))}
        </select>
      </div>
      <button type="button" className="btn btn-primary btn-block" disabled={busy || !file.rows.length} onClick={submit}>
        <Icon name="check" /> {t("Importar alumnos")} ({file.rows.length})
      </button>
    </div>
  );
}

function AssignDialog({ g }: { g: Group }) {
  const t = useT();
  const copts = useCourseOptions();
  const [curso, setCurso] = useState(g.curso);
  const [vence, setVence] = useState("2027-01-31");
  const { busy, run } = useAction();
  const slug = curso || copts[0]?.[0] || "";
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body: GroupUpdateRequest = { curso: slug, vence };
    if (await run(() => apiPatch<Group>(`/admin/academia/grupos/${g.id}`, body), "Curso asignado. Los alumnos del grupo ya lo ven en su panel.")) closeModal();
  };
  return (
    <form className="modal-b" onSubmit={submit}>
      <p style={{ color: "var(--muted)", marginBottom: 14 }}>{g.nombre}</p>
      <div className="form-row">
        <label className="l" htmlFor="ga">
          {t("Curso o diplomado")}
        </label>
        <select className="input" id="ga" value={slug} onChange={(e) => setCurso(e.target.value)}>
          {copts.map(([s, title]) => (
            <option key={s} value={s}>
              {title}
            </option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <label className="l" htmlFor="gd">
          {t("Fecha límite")}
        </label>
        <input className="input" id="gd" type="date" required value={vence} onChange={(e) => setVence(e.target.value)} />
      </div>
      <button className="btn btn-primary btn-block" type="submit" disabled={busy || !slug}>
        {t("Asignar")}
      </button>
    </form>
  );
}

function GroupView({ id }: { id: number }) {
  const t = useT();
  const copts = useCourseOptions();
  const { data, loading, error, refetch } = useAdminApi<GroupDetail>(`/admin/academia/grupos/${id}`);
  return (
    <div className="modal-b">
      <ApiStatus loading={loading && !data} error={error} onRetry={refetch} />
      {data ? (
        <>
          <p style={{ color: "var(--muted)", marginBottom: 14 }}>
            {data.curso ? `${courseTitleOf(copts, data.curso)} · ${t("vence")} ${data.vence}` : t("Sin curso asignado")} · {t("alumnos de ejemplo")}
          </p>
          {data.alumnos.length ? (
            data.alumnos.map((r) => (
              <div className="list-row" key={`${r.u}-${r.s}`}>
                <span className="avatar" style={{ width: 34, height: 34, fontSize: 12 }} aria-hidden="true">
                  {initialsOf(r.u)}
                </span>
                <div>
                  <b>{r.u}</b>
                  <small>
                    {r.avance}% · {r.titulo}
                  </small>
                </div>
              </div>
            ))
          ) : (
            <p className="sub">{t("Todavía no hay alumnos en este grupo.")}</p>
          )}
          <button
            type="button"
            className="btn btn-ghost btn-block"
            style={{ marginTop: 14 }}
            onClick={() => {
              closeModal();
              toast("Recordatorio enviado al grupo por correo");
            }}
          >
            <Icon name="bell" /> {t("Enviar recordatorio al grupo")}
          </button>
        </>
      ) : null}
    </div>
  );
}

export function AlumnosTab() {
  const t = useT();
  const copts = useCourseOptions();
  const [f, setF] = useState<{ curso: string; rango: DateRange; orden: StudentOrder; q: string }>({ curso: "", rango: "", orden: "recientes", q: "" });
  const students = useAdminApi<StudentRow[]>("/admin/academia/alumnos" + qs(f));
  const groups = useAdminApi<Group[]>("/admin/academia/grupos");
  const { busy, run } = useAction();
  const [gname, setGname] = useState("");
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));

  const addGroup = async (e: FormEvent) => {
    e.preventDefault();
    const nombre = gname.trim();
    if (!nombre) return;
    if (await run(() => apiPost<Group>("/admin/academia/grupos", { nombre }), "Grupo creado. Ya puedes importar alumnos y asignarle un curso.")) setGname("");
  };

  return (
    <>
      <h3 style={{ margin: "0 0 14px", fontSize: 22 }}>{t("Alumnos registrados")}</h3>
      <div className="tool-row">
        <FilterSelect id="sf1" label="Curso" value={f.curso} options={[["", "Todos los cursos"], ...copts]} translate={(v) => v === ""} onChange={set("curso")} />
        <FilterSelect id="sf2" label="Registro" value={f.rango} options={FECHAS} onChange={set("rango")} />
        <FilterSelect
          id="sf3"
          label="Orden"
          value={f.orden}
          options={[
            ["recientes", "Más recientes"],
            ["nombre", "Nombre (A-Z)"],
            ["cursos", "Más cursos"],
          ]}
          onChange={set("orden")}
        />
        <span className="grow" />
        <SearchBox value={f.q} placeholder="Buscar nombre o correo" onSearch={set("q")} />
      </div>
      <ApiStatus loading={students.loading && !students.data} error={students.error} onRetry={students.refetch} />
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">{t("Nombre")}</th>
              <th scope="col">{t("Correo")}</th>
              <th scope="col">{t("Fecha de registro")}</th>
              <th scope="col">{t("Cursos inscritos")}</th>
              <th scope="col">
                <span className="sr">{t("Acciones")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {students.data?.map((s) => (
              <tr key={s.correo}>
                <td>
                  <b style={{ color: "var(--web-navy)" }}>{s.nombre}</b>
                </td>
                <td>{s.correo}</td>
                <td className="nowrap">{s.registro}</td>
                <td>{s.cursos}</td>
                <td className="nowrap">
                  <button type="button" className="mini" onClick={() => openEnroll(s.correo)} aria-label={`${t("Inscribir a un curso")} · ${s.nombre}`}>
                    <Icon name="plus" /> {t("Inscribir a un curso")}
                  </button>
                </td>
              </tr>
            ))}
            {students.data && !students.data.length ? <EmptyRow cols={5}>{t("No hay alumnos con esos filtros.")}</EmptyRow> : null}
          </tbody>
        </table>
      </div>
      <div className="two" style={{ marginTop: 28 }}>
        <div className="panel">
          <h3>{t("Inscripción masiva")}</h3>
          <p className="sub">{t("Sube la lista de alumnos en Excel o CSV y se inscriben de una vez")}</p>
          <div className="seg" style={{ flexWrap: "wrap" }}>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => openModal({ title: "Importar alumnos", content: <ImportDialog groups={groups.data ?? []} />, size: "sm" })}>
              <Icon name="upload" /> {t("Importar Excel o CSV")}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                downloadText("plantilla-alumnos.csv", "\uFEFFnombre,correo,whatsapp,cedula,grupo\n", "text/csv;charset=utf-8");
                toast("Plantilla descargada");
              }}
            >
              <Icon name="download" /> {t("Descargar plantilla")}
            </button>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 12 }}>{t("Columnas: nombre, correo, WhatsApp, cédula y grupo. Los correos repetidos se omiten.")}</p>
        </div>
        <div className="panel">
          <h3>{t("Nuevo grupo")}</h3>
          <p className="sub">{t("Agrupa alumnos para asignarles un diplomado con fecha límite")}</p>
          <form onSubmit={addGroup}>
            <div className="form-row">
              <label className="l" htmlFor="gn">
                {t("Nombre del grupo")}
              </label>
              <input className="input" id="gn" required maxLength={120} placeholder={t("Ej. Clínica Veterinaria del Valle")} value={gname} onChange={(e) => setGname(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              <Icon name="plus" /> {t("Crear grupo")}
            </button>
          </form>
        </div>
      </div>
      <h3 style={{ margin: "28px 0 14px", fontSize: 22 }}>{t("Grupos")}</h3>
      <ApiStatus loading={groups.loading && !groups.data} error={groups.error} onRetry={groups.refetch} />
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">{t("Grupo")}</th>
              <th scope="col">{t("Alumnos")}</th>
              <th scope="col">{t("Curso asignado")}</th>
              <th scope="col">{t("Vence")}</th>
              <th scope="col">{t("Avance promedio")}</th>
              <th scope="col">
                <span className="sr">{t("Acciones")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.data?.map((g) => (
              <tr key={g.id}>
                <td>
                  <b style={{ color: "var(--web-navy)" }}>{g.nombre}</b>
                </td>
                <td>{g.total}</td>
                <td>{g.curso ? courseTitleOf(copts, g.curso) : "—"}</td>
                <td>{g.vence || "—"}</td>
                <td>
                  <MiniProgress pct={g.avance} />
                </td>
                <td className="nowrap">
                  <button type="button" className="mini" onClick={() => openModal({ title: "Asignar curso al grupo", content: <AssignDialog g={g} />, size: "sm" })} aria-label={`${t("Asignar")} · ${g.nombre}`}>
                    <Icon name="graduation-cap" /> {t("Asignar")}
                  </button>{" "}
                  <button type="button" className="mini" onClick={() => openModal({ title: g.nombre, content: <GroupView id={g.id} />, size: "sm" })} aria-label={`${t("Ver grupo")} · ${g.nombre}`}>
                    <Icon name="eye" /> {t("Ver grupo")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
