/* Editor de cursos (ceView del demo): datos del curso, temario con módulos y lecciones, examen final y vista del
   alumno. Ruta: /admin/academia/editor/:id/:mi/:li, con :mi = número de módulo, "datos" o "examen".
   Cada cambio se guarda en la API (PATCH/POST/DELETE de /api/admin/editor/cursos/:id/...), que devuelve el curso
   completo con sus pendientes. */
import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { AcademySettings, EditorCourse, EditorCourseDetail } from "@kiron/shared";
import { Icon } from "../../../components/Icon";
import { ApiStatus, Notice } from "../../../components/ui";
import { useT } from "../../../i18n";
import { ApiError, apiDelete, apiPatch, apiPost, errorField, useApi } from "../../../lib/api";
import { cx } from "../../../lib/cx";
import { closeModal, openModal } from "../../../state/modal";
import { navigate } from "../../../state/session";
import { toast } from "../../../state/toasts";
import { bumpAdmin, CST_CLS, CSTATES, failToast, StateTag, useAdminApi } from "../common";
import { AIcon } from "../icons";
import { BasicsForm } from "./Basics";
import { ExamEditor } from "./Exam";
import { LessonEditor } from "./Lesson";
import { StudentPreview } from "./Student";

export const ceHref = (id: string, mi: number | "datos" | "examen", li = 0) => `/admin/academia/editor/${id}/${mi}/${li}`;

export interface EditorApi {
  c: EditorCourse;
  pendientes: string[];
  busy: boolean;
  /* Generación del temario: cambia cuando se agregan, quitan o reordenan elementos (para remontar formularios). */
  gen: number;
  ocultar: boolean;
  mut: (fn: () => Promise<EditorCourseDetail>, ok?: string, structural?: boolean) => Promise<EditorCourseDetail | undefined>;
  base: string;
}

function Issues({ p }: { p: string[] }) {
  const t = useT();
  return (
    <div className="modal-b">
      <p style={{ marginTop: 0 }}>
        {t("Hay")} {p.length} {t("pendientes. Mientras tanto el curso sigue como borrador y se guarda solo.")}
      </p>
      <ul className="ce-issues">
        {p.slice(0, 14).map((x) => (
          <li key={x}>{t(x)}</li>
        ))}
      </ul>
      {p.length > 14 ? (
        <p style={{ color: "var(--muted)" }}>
          {t("y")} {p.length - 14} {t("más.")}
        </p>
      ) : null}
      <button type="button" className="btn btn-primary btn-block" onClick={() => closeModal()}>
        {t("Entendido")}
      </button>
    </div>
  );
}
const isStringList = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");

export const showIssues = (p: string[]) => openModal({ title: "Antes de publicar", content: <Issues p={p} />, size: "sm" });

/* Confirmación antes de borrar un módulo con sus lecciones (DELETE .../modulos/:mi). */
function ConfirmDeleteModule({ nombre, lecciones, onConfirm }: { nombre: string; lecciones: number; onConfirm: () => void }) {
  const t = useT();
  return (
    <div className="modal-b">
      <p style={{ marginTop: 0 }}>
        {t("Se borrará el módulo")} <b>{nombre}</b> {lecciones === 1 ? t("y su lección.") : lecciones ? `${t("y sus")} ${lecciones} ${t("lecciones.")}` : "."}{" "}
        {t("No se puede deshacer.")}
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" className="btn btn-ghost" style={{ flex: 1 }} onClick={() => closeModal()}>
          {t("Cancelar")}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={() => {
            closeModal();
            onConfirm();
          }}
        >
          <AIcon name="trash" /> {t("Borrar módulo")}
        </button>
      </div>
    </div>
  );
}

function Outline({ api, mi, li, datos }: { api: EditorApi; mi: number | "examen"; li: number; datos: boolean }) {
  const t = useT();
  const { c, mut, base } = api;
  const id = c.id;
  const [names, setNames] = useState(() => c.modulos.map((m) => m.nombre));
  useEffect(() => setNames(c.modulos.map((m) => m.nombre)), [c.modulos]);
  const addLesson = async (a: number) => {
    const n = c.modulos[a]?.lecciones.length ?? 0;
    const r = await mut(() => apiPost<EditorCourseDetail>(`${base}/modulos/${a}/lecciones`, { titulo: `Lección ${n + 1}` }), undefined, true);
    if (r) navigate(ceHref(id, a, n));
  };
  const addModule = async () => {
    const pos = c.modulos.length;
    const r = await mut(() => apiPost<EditorCourseDetail>(`${base}/modulos`, { nombre: `Módulo ${pos + 1}` }), undefined, true);
    if (r) navigate(ceHref(id, pos, 0));
  };
  const removeModule = (a: number) => {
    const m = c.modulos[a];
    if (!m) return;
    openModal({
      title: "Borrar módulo",
      size: "sm",
      content: (
        <ConfirmDeleteModule
          nombre={m.nombre}
          lecciones={m.lecciones.length}
          onConfirm={async () => {
            const r = await mut(() => apiDelete<EditorCourseDetail>(`${base}/modulos/${a}`), "Módulo borrado", true);
            if (r && mi !== "examen" && (mi >= a || mi >= r.curso.modulos.length)) navigate(ceHref(id, Math.max(Math.min(mi === a ? a - 1 : mi - 1, r.curso.modulos.length - 1), 0), 0));
          }}
        />
      ),
    });
  };
  const rename = (a: number) => {
    const v = (names[a] ?? "").trim();
    if (!v || v === c.modulos[a]?.nombre) {
      setNames(c.modulos.map((m) => m.nombre));
      return;
    }
    void mut(() => apiPatch<EditorCourseDetail>(`${base}/modulos/${a}`, { nombre: v.slice(0, 120) }));
  };
  return (
    <aside className="ce-out panel" aria-label={t("Temario del curso")}>
      <h3>{t("Temario")}</h3>
      {c.modulos.map((m, a) => (
        <div className="ce-mod" key={a}>
          <div className="ce-mh">
            <input
              className="ce-mname"
              value={names[a] ?? ""}
              aria-label={`${t("Nombre del módulo")} ${a + 1}`}
              maxLength={120}
              onChange={(e) => setNames((n) => n.map((x, k) => (k === a ? e.target.value : x)))}
              onBlur={() => rename(a)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
            />
            <small>
              {t("Módulo")} {a + 1}
            </small>
          </div>
          {m.lecciones.map((l, b) => (
            <Link key={b} className={cx("ce-les", !datos && a === mi && b === li && "on")} to={ceHref(id, a, b)} aria-current={!datos && a === mi && b === li ? "page" : undefined}>
              <Icon name="video" />
              <span>{l.titulo}</span>
              <em>{l.dur || t("sin video")}</em>
            </Link>
          ))}
          <div className="ce-madd">
            <button type="button" onClick={() => addLesson(a)} disabled={api.busy || m.lecciones.length >= 60}>
              <Icon name="plus" /> {t("Lección")}
            </button>
            <button
              type="button"
              onClick={() => removeModule(a)}
              disabled={api.busy || c.modulos.length <= 1}
              aria-label={`${t("Borrar módulo")} ${a + 1}`}
              title={t("Borrar módulo")}
            >
              <AIcon name="trash" />
            </button>
          </div>
        </div>
      ))}
      <div className="ce-mod">
        <div className="ce-mh">
          <b>{t("Cierre del curso")}</b>
          <small />
        </div>
        <Link className={cx("ce-les ex", !datos && mi === "examen" && "on")} to={ceHref(id, "examen")} aria-current={!datos && mi === "examen" ? "page" : undefined}>
          <Icon name="clipboard-list" />
          <span>{c.examen.titulo}</span>
          <em>
            {c.examen.preguntas.length} {t("preg.")}
          </em>
        </Link>
      </div>
      <button type="button" className="btn btn-ghost btn-sm btn-block" onClick={addModule} disabled={api.busy || c.modulos.length >= 12}>
        <Icon name="plus" /> {t("Agregar módulo")}
      </button>
    </aside>
  );
}

export function EditorView({ id, mi: miRaw, li: liRaw }: { id: string; mi: string; li: string }) {
  const t = useT();
  const base = `/admin/editor/cursos/${id}`;
  const res = useApi<EditorCourseDetail>(base);
  const gs = useAdminApi<AcademySettings>("/admin/academia/ajustes");
  const [local, setLocal] = useState<EditorCourseDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [gen, setGen] = useState(0);
  const [prev, setPrev] = useState(false);
  const d = local ?? res.data;

  if (!d) {
    if (res.error && !res.loading)
      return (
        <>
          <div className="main-head">
            <div>
              <h1>{t("Editor de curso")}</h1>
            </div>
          </div>
          <Notice>
            {res.status === 404 || res.status === 400 ? t("No encontramos el curso. Créalo desde Academia con el botón Nuevo curso.") : res.error}
          </Notice>
        </>
      );
    return <ApiStatus loading error={null} />;
  }

  const c = d.curso;
  const datos = miRaw === "datos";
  const exam = miRaw === "examen";
  const mi = exam || datos ? 0 : Math.min(Math.max(Number(miRaw) || 0, 0), Math.max(c.modulos.length - 1, 0));
  const m = c.modulos[mi];
  const li = Math.min(Math.max(Number(liRaw) || 0, 0), Math.max((m?.lecciones.length ?? 1) - 1, 0));
  const lesson = !exam && !datos ? m?.lecciones[li] : undefined;
  const showPrev = prev && !datos;

  const api: EditorApi = {
    c,
    pendientes: d.pendientes,
    busy,
    gen,
    ocultar: !!gs.data?.ocultar,
    base,
    mut: async (fn, ok, structural) => {
      setBusy(true);
      try {
        const r = await fn();
        setLocal(r);
        if (structural) setGen((g) => g + 1);
        if (ok) toast(ok);
        return r;
      } catch (e) {
        failToast(e);
        return undefined;
      } finally {
        setBusy(false);
      }
    },
  };

  const publish = async () => {
    if (d.pendientes.length) {
      showIssues(d.pendientes);
      return;
    }
    setBusy(true);
    try {
      const r = await apiPost<EditorCourseDetail>(`${base}/publicar`);
      setLocal(r);
      bumpAdmin();
      toast("Curso publicado. Ya aparece en Academia.");
    } catch (e) {
      /* 409 { error, pendientes }: muestra la lista que manda el servidor (puede tener más que la copia local). */
      const pendientes = e instanceof ApiError && e.status === 409 ? errorField(e, "pendientes", isStringList) : undefined;
      if (pendientes?.length) showIssues(pendientes);
      else failToast(e, "No se pudo publicar el curso.");
      res.refetch();
    } finally {
      setBusy(false);
    }
  };

  const body = datos ? (
    <BasicsForm api={api} onSaved={setLocal} />
  ) : exam ? (
    showPrev ? (
      <StudentPreview c={c} exam />
    ) : (
      <ExamEditor key="examen" api={api} />
    )
  ) : !lesson ? (
    <Notice>{t("Este módulo no tiene lecciones. Agrega una desde el temario.")}</Notice>
  ) : showPrev ? (
    <StudentPreview c={c} mi={mi} li={li} />
  ) : (
    <LessonEditor key={`${mi}-${li}-${gen}`} api={api} mi={mi} li={li} />
  );

  return (
    <>
      <div className="main-head ce-head">
        <div>
          <Link className="ce-back" to="/admin/academia/cursos">
            <Icon name="arrow-left" /> {t("Cursos")}
          </Link>
          <h1>{c.titulo}</h1>
          <p>
            <StateTag cls={CST_CLS[c.estado]}>{t(CSTATES[c.estado])}</StateTag> <span>{t(c.tipo)}</span> · <span>{c.instructor}</span>
          </p>
        </div>
        <div className="ce-actions">
          {datos ? null : (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPrev((p) => !p)} aria-pressed={prev}>
              <Icon name={prev ? "pencil" : "eye"} /> {t(prev ? "Volver a editar" : "Vista del alumno")}
            </button>
          )}
          <button type="button" className="btn btn-primary btn-sm" onClick={publish} disabled={busy}>
            <Icon name="circle-check" /> {t(c.estado === "publicado" ? "Revisar y guardar" : "Publicar curso")}
          </button>
        </div>
      </div>
      <nav className="atabs ce-tabs" aria-label={t("Editor de curso")}>
        <Link className={datos ? "on" : ""} to={ceHref(id, "datos")} aria-current={datos ? "page" : undefined}>
          <Icon name="file-text" />
          <span>{t("Datos del curso")}</span>
        </Link>
        <Link className={datos ? "" : "on"} to={ceHref(id, 0, 0)} aria-current={datos ? undefined : "page"}>
          <Icon name="layers" />
          <span>{t("Temario")}</span>
        </Link>
      </nav>
      {d.pendientes.length && !datos ? (
        <p className="ce-hint" style={{ margin: "-8px 0 14px" }}>
          <AIcon name="check-check" /> {d.pendientes.length} {t("pendientes antes de publicar")} ·{" "}
          <button type="button" className="mini" onClick={() => showIssues(d.pendientes)}>
            {t("Ver pendientes")}
          </button>
        </p>
      ) : null}
      {datos ? (
        <section className="ce-main">{body}</section>
      ) : (
        <div className="ce-grid">
          <Outline api={api} mi={exam ? "examen" : mi} li={li} datos={datos} />
          <section className="ce-main">{body}</section>
        </div>
      )}
    </>
  );
}
