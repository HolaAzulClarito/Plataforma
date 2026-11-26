/* Pestaña Exámenes: reglas del examen final de cada curso (APP.qcfgOpen/qcfgSave), solicitudes de intento adicional
   (APP.recovery), lo que ve el alumno y banco de preguntas (APP.qNew/qAdd). Un solo examen final por curso. */
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import type {
  AcademySettings,
  AttemptRequestRow,
  BankList,
  BankQuestion,
  BankQuestionCreateRequest,
  EditorQuestionType,
  ExamConfig,
  ExamConfigRow,
} from "@kiron/shared";
import { Icon } from "../../../components/Icon";
import { ApiStatus, Notice } from "../../../components/ui";
import { useT } from "../../../i18n";
import { apiPost, apiPut } from "../../../lib/api";
import { closeModal, openModal } from "../../../state/modal";
import { CALC, LAYOUT, ORDEN, RETRO, StateTag, useAction, useAdminApi } from "../common";

export const QTYPES: Record<EditorQuestionType, string> = {
  om: "Opción múltiple",
  vf: "Verdadero o falso",
  rm: "Respuesta múltiple",
  rel: "Relacionar columnas",
  ab: "Respuesta abierta",
};
const TEMAS = ["Oftalmología", "Otitis", "Dermatoendocrinología", "Inmunología", "Cardiología"];

const clamp = (v: string, a: number, b: number) => Math.max(a, Math.min(b, Math.round(Number(v) || 0)));

/* Formulario de reglas del examen final (qcfgOpen del demo). */
function ExamConfigForm({ slug, titulo }: { slug: string; titulo: string }) {
  const cfg = useAdminApi<ExamConfig>(`/admin/cursos/${slug}/examen`);
  const gs = useAdminApi<AcademySettings>("/admin/academia/ajustes");
  if (!cfg.data)
    return (
      <div className="modal-b">
        <ApiStatus loading={cfg.loading} error={cfg.error} onRetry={cfg.refetch} />
      </div>
    );
  return <ExamConfigFields slug={slug} titulo={titulo} initial={cfg.data} ocultar={!!gs.data?.ocultar} />;
}

function ExamConfigFields({ slug, titulo, initial, ocultar }: { slug: string; titulo: string; initial: ExamConfig; ocultar: boolean }) {
  const t = useT();
  const [q, setQ] = useState<Record<keyof ExamConfig, string>>(() => Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, String(v)])) as Record<keyof ExamConfig, string>);
  const { busy, run } = useAction();
  const set = (k: keyof ExamConfig) => (e: { target: { value: string } }) => setQ((p) => ({ ...p, [k]: e.target.value }));
  const num = (id: string, k: keyof ExamConfig, label: string, min: number, max: number, hint = "") => (
    <div className="form-row">
      <label className="l" htmlFor={id}>
        {t(label)}
      </label>
      <input className="input" type="number" id={id} min={min} max={max} value={q[k]} onChange={set(k)} aria-describedby={hint ? id + "h" : undefined} />
      {hint ? (
        <small className="ce-hint" id={id + "h"}>
          {t(hint)}
        </small>
      ) : null}
    </div>
  );
  const sel = (id: string, k: keyof ExamConfig, label: string, map: Record<string, string>, dis = "") => (
    <div className="form-row">
      <label className="l" htmlFor={id}>
        {t(label)}
      </label>
      <select className="input" id={id} value={q[k]} onChange={set(k)}>
        {Object.entries(map).map(([v, txt]) => (
          <option key={v} value={v} disabled={dis === v}>
            {t(txt)}
          </option>
        ))}
      </select>
    </div>
  );
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body: ExamConfig = {
      intentos: clamp(q.intentos, 0, 20),
      aprobatoria: clamp(q.aprobatoria, 1, 100),
      tiempo: clamp(q.tiempo, 0, 300),
      maxPreg: clamp(q.maxPreg, 0, 200),
      layout: q.layout as ExamConfig["layout"],
      orden: q.orden as ExamConfig["orden"],
      calculo: q.calculo as ExamConfig["calculo"],
      retro: (ocultar && q.retro === "revelar" ? "defecto" : q.retro) as ExamConfig["retro"],
      lcAbierta: clamp(q.lcAbierta, 100, 10000),
      desbloqueo: q.desbloqueo,
    };
    if (await run(() => apiPut<ExamConfig>(`/admin/cursos/${slug}/examen`, body), "Reglas del examen guardadas. Aplican desde el siguiente intento.")) closeModal();
  };
  return (
    <form className="modal-b" onSubmit={submit}>
      <p style={{ color: "var(--muted)", marginBottom: 14 }}>{titulo}</p>
      <div className="grid2">
        {num("qA", "intentos", "Intentos permitidos", 0, 20, "0 = sin límite")}
        {num("qP", "aprobatoria", "Calificación aprobatoria (%)", 1, 100)}
      </div>
      <div className="grid2">
        {num("qT", "tiempo", "Tiempo límite (minutos)", 0, 300, "0 = sin límite")}
        {num("qM", "maxPreg", "Preguntas a responder", 0, 200, "0 = todas")}
      </div>
      <div className="grid2">
        {sel("qL", "layout", "Presentación", LAYOUT)}
        {sel("qO", "orden", "Orden de preguntas", ORDEN)}
      </div>
      <div className="grid2">
        {sel("qC", "calculo", "Nota final", CALC)}
        {sel("qR", "retro", "Retroalimentación", RETRO, ocultar ? "revelar" : "")}
      </div>
      <div className="grid2">
        {num("qB", "lcAbierta", "Caracteres · respuesta abierta", 100, 10000)}
        <div className="form-row">
          <label className="l" htmlFor="qU">
            {t("Se abre el (opcional)")}
          </label>
          <input className="input" type="date" id="qU" value={q.desbloqueo} onChange={set("desbloqueo")} />
        </div>
      </div>
      <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
        {t("Guardar reglas del examen")}
      </button>
    </form>
  );
}

export const openExamConfig = (slug: string, titulo: string) => openModal({ title: "Examen final · reglas", content: <ExamConfigForm slug={slug} titulo={titulo} />, size: "sm" });

function BankForm() {
  const t = useT();
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState<EditorQuestionType>("om");
  const [tema, setTema] = useState(TEMAS[0]!);
  const { busy, run } = useAction();
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body: BankQuestionCreateRequest = { texto: texto.trim(), tipo, tema };
    if (!body.texto) return;
    if (await run(() => apiPost<BankQuestion>("/admin/academia/banco", body), "Pregunta agregada al banco")) closeModal();
  };
  return (
    <form className="modal-b" onSubmit={submit}>
      <div className="form-row">
        <label className="l" htmlFor="qt">
          {t("Pregunta")}
        </label>
        <textarea className="input" id="qt" rows={3} required maxLength={600} value={texto} onChange={(e) => setTexto(e.target.value)} />
      </div>
      <div className="grid2">
        <div className="form-row">
          <label className="l" htmlFor="qy">
            {t("Tipo")}
          </label>
          <select className="input" id="qy" value={tipo} onChange={(e) => setTipo(e.target.value as EditorQuestionType)}>
            {Object.entries(QTYPES).map(([k, v]) => (
              <option key={k} value={k}>
                {t(v)}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label className="l" htmlFor="qm">
            {t("Tema")}
          </label>
          <select className="input" id="qm" value={tema} onChange={(e) => setTema(e.target.value)}>
            {TEMAS.map((x) => (
              <option key={x} value={x}>
                {t(x)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 16 }}>{t("Las respuestas abiertas y cortas las califica el equipo desde el libro de calificaciones.")}</p>
      <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
        <Icon name="plus" /> {t("Agregar al banco")}
      </button>
    </form>
  );
}

function RequestRow({ r }: { r: AttemptRequestRow }) {
  const t = useT();
  const { busy, run } = useAction();
  const resolve = (ok: boolean) =>
    run(
      () => apiPost<AttemptRequestRow>(`/admin/academia/solicitudes/${r.id}`, { accion: ok ? "autorizar" : "rechazar" }),
      ok ? "Intento adicional autorizado. Se avisó al alumno por correo." : "Solicitud rechazada. Se avisó al alumno por correo.",
    );
  return (
    <div className="list-row">
      <span className="lr-ico">
        <Icon name="rotate-ccw" />
      </span>
      <div>
        <b>{r.u}</b>
        <small>
          {r.titulo} · {r.f}
        </small>
      </div>
      <span className="end">
        {r.estado === "pendiente" ? (
          <>
            <button type="button" className="mini" disabled={busy} onClick={() => resolve(false)} aria-label={`${t("Rechazar")} · ${r.u}`}>
              {t("Rechazar")}
            </button>{" "}
            <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => resolve(true)} aria-label={`${t("Autorizar")} · ${r.u}`}>
              {t("Autorizar")}
            </button>
          </>
        ) : (
          <StateTag cls={r.estado === "autorizado" ? "st-ok" : "st-draft"}>{t(r.estado === "autorizado" ? "Autorizado" : "Rechazado")}</StateTag>
        )}
      </span>
    </div>
  );
}

export function ExamenesTab() {
  const t = useT();
  const rows = useAdminApi<ExamConfigRow[]>("/admin/academia/examenes");
  const reqs = useAdminApi<AttemptRequestRow[]>("/admin/academia/solicitudes");
  const gs = useAdminApi<AcademySettings>("/admin/academia/ajustes");
  const bank = useAdminApi<BankList>("/admin/academia/banco");
  return (
    <>
      <Notice style={{ marginBottom: 18 }}>
        {t(
          "Cada curso tiene un solo examen, al final. Cada examen define sus reglas: intentos, calificación aprobatoria y tiempo límite; no hay una regla global de intentos. La constancia se emite solo con todas las lecciones terminadas y el examen aprobado. El tiempo límite se valida en el servidor.",
        )}
      </Notice>
      <ApiStatus loading={rows.loading && !rows.data} error={rows.error} onRetry={rows.refetch} />
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">{t("Curso")}</th>
              <th scope="col">{t("Intentos")}</th>
              <th scope="col">{t("Aprobatoria")}</th>
              <th scope="col">{t("Tiempo límite")}</th>
              <th scope="col">{t("Presentación")}</th>
              <th scope="col">{t("Nota final")}</th>
              <th scope="col">
                <span className="sr">{t("Acciones")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.data?.map(({ slug, titulo, config: q }) => (
              <tr key={slug}>
                <td>
                  <b style={{ color: "var(--web-navy)" }}>{titulo}</b>
                </td>
                <td>{q.intentos || t("Sin límite")}</td>
                <td className="nowrap">{q.aprobatoria} %</td>
                <td className="nowrap">{q.tiempo ? `${q.tiempo} min` : t("Sin límite")}</td>
                <td>{t(LAYOUT[q.layout])}</td>
                <td>{t(CALC[q.calculo])}</td>
                <td className="nowrap">
                  <button type="button" className="mini" onClick={() => openExamConfig(slug, titulo)} aria-label={`${t("Configurar")} · ${titulo}`}>
                    <Icon name="settings" /> {t("Configurar")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="two" style={{ marginTop: 24 }}>
        <div className="panel">
          <h3>{t("Recuperación de intentos")}</h3>
          <p className="sub">{t("Alumnos que agotaron sus intentos y piden uno más")}</p>
          <ApiStatus loading={reqs.loading && !reqs.data} error={reqs.error} onRetry={reqs.refetch} />
          {reqs.data?.length ? reqs.data.map((r) => <RequestRow key={r.id} r={r} />) : reqs.data ? <p className="sub">{t("Sin solicitudes.")}</p> : null}
        </div>
        <div className="panel">
          <h3>{t("Lo que ve el alumno")}</h3>
          <p className="sub">{t("Ajuste global de la academia")}</p>
          <div className="list-row">
            <span className="lr-ico">
              <Icon name="eye" />
            </span>
            <div>
              <b>{t(gs.data?.ocultar ? "Solo su calificación final" : "Su calificación y el detalle de respuestas")}</b>
              <small>{t("Se cambia en Ajustes")}</small>
            </div>
            <span className="end">
              <Link className="mini" to="/admin/academia/ajustes">
                <Icon name="settings" /> {t("Ajustes")}
              </Link>
            </span>
          </div>
        </div>
      </div>
      <div className="main-head" style={{ marginTop: 28 }}>
        <div>
          <h2 style={{ fontSize: 22 }}>{t("Banco de preguntas")}</h2>
          <p>{t("Se reutilizan entre exámenes · preguntas de ejemplo")}</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => openModal({ title: "Nueva pregunta", content: <BankForm />, size: "sm" })}>
          <Icon name="plus" /> {t("Nueva pregunta")}
        </button>
      </div>
      <ApiStatus loading={bank.loading && !bank.data} error={bank.error} onRetry={bank.refetch} />
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">{t("Pregunta")}</th>
              <th scope="col">{t("Tipo")}</th>
              <th scope="col">{t("Tema")}</th>
              <th scope="col">{t("Usada en")}</th>
            </tr>
          </thead>
          <tbody>
            {bank.data?.map((q) => (
              <tr key={q.id}>
                <td>{q.texto}</td>
                <td>
                  <span className="badge badge-soft">{t(QTYPES[q.tipo])}</span>
                </td>
                <td>{t(q.tema)}</td>
                <td>{q.usos === 1 ? t("1 examen") : `${q.usos} ${t("exámenes")}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
