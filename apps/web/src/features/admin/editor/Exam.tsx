/* Examen final del curso en el editor (ceExam y APP.ceQ*, ceExport, ceImport, ceBank, ceBankAdd). Es el único examen
   del curso: se abre al terminar todas las lecciones y la constancia se emite solo si se aprueba. */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { slugify, type BankList, type EditorCourseDetail, type EditorExamUpdateRequest, type EditorQuestion, type EditorQuestionType, type ExamExport } from "@kiron/shared";
import { Icon, type IconName } from "../../../components/Icon";
import { ApiStatus } from "../../../components/ui";
import { useT } from "../../../i18n";
import { apiGet, apiPost, apiPut, apiDelete, apiPatch } from "../../../lib/api";
import { downloadText } from "../../../lib/download";
import { closeModal, openModal } from "../../../state/modal";
import { toast } from "../../../state/toasts";
import { CALC, failToast, LAYOUT, ORDEN, RETRO, useAdminApi } from "../common";
import { QTYPES } from "../academia/Examenes";
import { AIcon, type AdminIconName } from "../icons";
import type { EditorApi } from "./Editor";

const QICON: Record<EditorQuestionType, AdminIconName> = { om: "list-checks", vf: "check", rm: "check-check", rel: "layers", ab: "pencil" };

function Num({ label, value, min, max, suf, hint, onSave }: { label: string; value: number; min: number; max: number; suf?: string; hint?: string; onSave: (v: number) => void }) {
  const t = useT();
  const [v, setV] = useState(String(value));
  const commit = () => {
    const n = Math.max(min, Math.min(max, Math.round(Number(v) || 0)));
    setV(String(n));
    if (n !== value) onSave(n);
  };
  return (
    <label>
      {t(label)}{" "}
      <input className="input" type="number" min={min} max={max} value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && commit()} />
      {suf ? ` ${t(suf)}` : ""}
      {hint ? <small> {t(hint)}</small> : null}
    </label>
  );
}

function Sel<K extends string>({ label, value, map, disabled, onSave }: { label: string; value: K; map: Record<K, string>; disabled?: K; onSave: (v: K) => void }) {
  const t = useT();
  return (
    <label>
      {t(label)}{" "}
      <select className="input" value={value} onChange={(e) => onSave(e.target.value as K)}>
        {(Object.entries(map) as Array<[K, string]>).map(([k, txt]) => (
          <option key={k} value={k} disabled={disabled === k}>
            {t(txt)}
          </option>
        ))}
      </select>
    </label>
  );
}

/* Una pregunta: edición local y guardado (PUT) al salir de cada campo o al marcar opciones. */
function QuestionEditor({ api, i, initial }: { api: EditorApi; i: number; initial: EditorQuestion }) {
  const t = useT();
  const [q, setQ] = useState(initial);
  const lc = api.c.examen.lcAbierta;
  const put = (next: EditorQuestion) => api.mut(() => apiPut<EditorCourseDetail>(`${api.base}/examen/preguntas/${i}`, next));
  const commit = (patch: Partial<EditorQuestion> = {}) => {
    const next = { ...q, ...patch };
    setQ(next);
    void put(next);
  };
  const local = (patch: Partial<EditorQuestion>) => setQ((p) => ({ ...p, ...patch }));
  const blur = () => void put(q);
  const n = i + 1;

  let body;
  if (q.tipo === "om" || q.tipo === "rm") {
    const multi = q.tipo === "rm";
    body = (
      <div className="ce-opts">
        <p className="ce-hint">{t(multi ? "Marca todas las correctas." : "Marca la correcta.")}</p>
        {q.opciones.map((o, k) => (
          <div className="ce-opt" key={k}>
            <input
              type={multi ? "checkbox" : "radio"}
              name={`q${i}o`}
              aria-label={`${t("Correcta: opción")} ${k + 1}`}
              checked={q.correctas.includes(k)}
              onChange={(e) => commit({ correctas: multi ? (e.target.checked ? [...new Set([...q.correctas, k])].sort() : q.correctas.filter((x) => x !== k)) : [k] })}
            />
            <input
              className="input"
              maxLength={200}
              value={o}
              placeholder={`${t("Opción")} ${k + 1}`}
              aria-label={`${t("Pregunta")} ${n} · ${t("Opción")} ${k + 1}`}
              onChange={(e) => local({ opciones: q.opciones.map((x, j) => (j === k ? e.target.value : x)) })}
              onBlur={blur}
            />
          </div>
        ))}
        {q.opciones.length < 8 ? (
          <button type="button" className="mini" onClick={() => commit({ opciones: [...q.opciones, ""] })}>
            <Icon name="plus" /> {t("Opción")}
          </button>
        ) : null}
      </div>
    );
  } else if (q.tipo === "vf") {
    body = (
      <div className="ce-opts" role="radiogroup" aria-label={`${t("Respuesta correcta")} · ${t("Pregunta")} ${n}`}>
        {["Verdadero", "Falso"].map((o, k) => (
          <label className="ce-opt" key={o}>
            <input type="radio" name={`q${i}vf`} checked={q.correctas[0] === k} onChange={() => commit({ correctas: [k] })} /> {t(o)}
          </label>
        ))}
      </div>
    );
  } else if (q.tipo === "rel") {
    body = (
      <div className="ce-opts">
        {q.pares.map((p, k) => (
          <div className="ce-pair" key={k}>
            <input
              className="input"
              maxLength={160}
              value={p[0]}
              placeholder={`${t("Concepto")} ${k + 1}`}
              aria-label={`${t("Concepto")} ${k + 1}`}
              onChange={(e) => local({ pares: q.pares.map((x, j): [string, string] => (j === k ? [e.target.value, x[1]] : x)) })}
              onBlur={blur}
            />
            <span aria-hidden="true">
              <Icon name="arrow-right" />
            </span>
            <input
              className="input"
              maxLength={160}
              value={p[1]}
              placeholder={`${t("Pareja")} ${k + 1}`}
              aria-label={`${t("Pareja")} ${k + 1}`}
              onChange={(e) => local({ pares: q.pares.map((x, j): [string, string] => (j === k ? [x[0], e.target.value] : x)) })}
              onBlur={blur}
            />
          </div>
        ))}
        {q.pares.length < 8 ? (
          <button type="button" className="mini" onClick={() => commit({ pares: [...q.pares, ["", ""]] })}>
            <Icon name="plus" /> {t("Pareja")}
          </button>
        ) : null}
        <p className="ce-hint">{t("Al alumno se le muestran las parejas en desorden.")}</p>
      </div>
    );
  } else {
    body = (
      <>
        <p className="ce-hint">
          {t("La califica el equipo desde el libro de calificaciones.")} {t("Máximo")} {lc} {t("caracteres.")}
        </p>
        <div className="form-row">
          <label className="l" htmlFor={`q${i}m`}>
            {t("Respuesta modelo o criterio (solo la ve el equipo)")}
          </label>
          <textarea className="input" id={`q${i}m`} rows={2} maxLength={2000} value={q.modelo} onChange={(e) => local({ modelo: e.target.value })} onBlur={blur} />
        </div>
      </>
    );
  }

  return (
    <div className="ce-block">
      <div className="ce-bh">
        <span className="ce-qn">{n}</span>
        <b>{t(QTYPES[q.tipo])}</b>
        <span className="grow" />
        <label className="ce-pts">
          {t("Puntos")}{" "}
          <input className="input" type="number" min={1} max={10} value={q.puntos} onChange={(e) => local({ puntos: Math.max(1, Math.min(10, Number(e.target.value) || 1)) })} onBlur={blur} />
        </label>
        <button
          type="button"
          className="icon-btn"
          aria-label={`${t("Eliminar pregunta")} ${n}`}
          onClick={() => api.mut(() => apiDelete<EditorCourseDetail>(`${api.base}/examen/preguntas/${i}`), "Pregunta eliminada", true)}
        >
          <AIcon name="trash" />
        </button>
      </div>
      <div className="ce-bb">
        <div className="form-row">
          <label className="l" htmlFor={`q${i}t`}>
            {t("Pregunta")} {n}
          </label>
          <textarea className="input" id={`q${i}t`} rows={2} maxLength={600} value={q.texto} onChange={(e) => local({ texto: e.target.value })} onBlur={blur} />
        </div>
        {body}
        <div className="ce-qopts">
          <label className="ce-chk">
            <input type="checkbox" checked={q.requerida} onChange={(e) => commit({ requerida: e.target.checked })} /> {t("Respuesta obligatoria")}
          </label>
          {q.tipo === "om" || q.tipo === "rm" || q.tipo === "rel" ? (
            <label className="ce-chk">
              <input type="checkbox" checked={q.mezclar} onChange={(e) => commit({ mezclar: e.target.checked })} /> {t("Mezclar opciones")}
            </label>
          ) : null}
        </div>
        <div className="form-row">
          <label className="l" htmlFor={`q${i}x`}>
            {t("Explicación (solo la ve el equipo)")}
          </label>
          <input className="input" id={`q${i}x`} maxLength={400} value={q.explicacion} onChange={(e) => local({ explicacion: e.target.value })} onBlur={blur} />
        </div>
      </div>
    </div>
  );
}

function BankPicker({ api }: { api: EditorApi }) {
  const t = useT();
  const { data, loading, error, refetch } = useAdminApi<BankList>("/admin/academia/banco");
  const [sel, setSel] = useState<Set<number>>(new Set());
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!sel.size) {
      toast("Elige al menos una pregunta");
      return;
    }
    const n = sel.size;
    const r = await api.mut(
      () => apiPost<EditorCourseDetail>(`${api.base}/examen/banco`, { ids: [...sel] }),
      n === 1 ? "1 pregunta agregada desde el banco" : `${n} preguntas agregadas desde el banco`,
      true,
    );
    if (r) closeModal();
  };
  return (
    <form className="modal-b" onSubmit={submit}>
      <ApiStatus loading={loading && !data} error={error} onRetry={refetch} />
      {data?.map((q) => (
        <label className="list-row" style={{ cursor: "pointer" }} key={q.id}>
          <input
            type="checkbox"
            name="bq"
            checked={sel.has(q.id)}
            onChange={(e) =>
              setSel((s) => {
                const n = new Set(s);
                if (e.target.checked) n.add(q.id);
                else n.delete(q.id);
                return n;
              })
            }
          />
          <div>
            <b>{q.texto}</b>
            <small>
              {t(QTYPES[q.tipo])} · {t(q.tema)}
            </small>
          </div>
        </label>
      ))}
      <button className="btn btn-primary btn-block" style={{ marginTop: 14 }} type="submit">
        <Icon name="plus" /> {t("Agregar seleccionadas")}
      </button>
    </form>
  );
}

export function ExamEditor({ api }: { api: EditorApi }) {
  const t = useT();
  const { c, base, mut, gen } = api;
  const ex = c.examen;
  const [titulo, setTitulo] = useState(ex.titulo);
  const lastCount = useRef(ex.preguntas.length);
  const [focusLast, setFocusLast] = useState(false);
  const save = (body: EditorExamUpdateRequest) => mut(() => apiPatch<EditorCourseDetail>(`${base}/examen`, body));

  /* Tras agregar una pregunta, lleva el foco a su texto (ceScrollLast del demo). */
  useEffect(() => {
    if (!focusLast || ex.preguntas.length <= lastCount.current) return;
    lastCount.current = ex.preguntas.length;
    setFocusLast(false);
    const blocks = document.querySelectorAll<HTMLElement>(".ce-main .ce-block");
    const el = blocks[blocks.length - 1];
    el?.scrollIntoView?.({ block: "center" });
    el?.querySelector<HTMLElement>("textarea")?.focus({ preventScroll: true });
  }, [focusLast, ex.preguntas.length, gen]);

  const add = (tipo: EditorQuestionType) => {
    lastCount.current = ex.preguntas.length;
    setFocusLast(true);
    void mut(() => apiPost<EditorCourseDetail>(`${base}/examen/preguntas`, { tipo }), undefined, true);
  };
  const exportExam = async () => {
    try {
      const d = await apiGet<ExamExport>(`${base}/examen/exportar`);
      downloadText(`examen-${slugify(ex.titulo) || "kiron"}.json`, JSON.stringify(d, null, 2), "application/json");
      toast("Examen exportado");
    } catch (e) {
      failToast(e, "No se pudo exportar el examen.");
    }
  };
  const importExam = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 2 * 1048576) {
      toast("El archivo pesa más de 2 MB");
      return;
    }
    let d: unknown;
    try {
      d = JSON.parse(await f.text());
    } catch {
      toast("El archivo no es un examen válido");
      return;
    }
    const x = d as Partial<ExamExport> | null;
    if (!x || x.formato !== "kiron-examen" || x.version !== 1 || !Array.isArray(x.preguntas) || x.preguntas.length > 200) {
      toast("El archivo no es un examen exportado desde la academia");
      return;
    }
    const n = x.preguntas.length;
    await mut(() => apiPost<EditorCourseDetail>(`${base}/examen/importar`, x), n === 1 ? "1 pregunta importada" : `${n} preguntas importadas`, true);
  };

  return (
    <>
      <div className="panel ce-lhead">
        <div className="ce-lt">
          <label className="sr" htmlFor="ceT">
            {t("Título del examen")}
          </label>
          <input
            className="ce-title"
            id="ceT"
            value={titulo}
            maxLength={120}
            onChange={(e) => setTitulo(e.target.value)}
            onBlur={() => {
              const v = titulo.trim();
              if (v && v !== ex.titulo) void save({ titulo: v });
              else setTitulo(ex.titulo);
            }}
          />
          <div className="ce-lmove">
            <button type="button" className="icon-btn" aria-label={t("Exportar examen")} title={t("Exportar examen")} onClick={exportExam}>
              <Icon name="download" />
            </button>
            <label className="icon-btn" title={t("Importar preguntas")}>
              <Icon name="upload" />
              <span className="sr">{t("Importar preguntas")}</span>
              <input
                type="file"
                accept="application/json,.json"
                className="sr"
                onChange={(e) => {
                  const input = e.currentTarget;
                  void importExam(input.files?.[0]).then(() => {
                    input.value = "";
                  });
                }}
              />
            </label>
          </div>
        </div>
        <p className="ce-hint" style={{ marginTop: 6 }}>
          {t("Es el único examen del curso. Se abre cuando el alumno termina todas las lecciones; la constancia se emite solo si lo aprueba. El tiempo límite se valida en el servidor.")}
        </p>
        <div className="ce-lmeta">
          <Num label="Calificación aprobatoria" value={ex.aprobatoria} min={1} max={100} suf="%" onSave={(v) => save({ aprobatoria: v })} />
          <Num label="Intentos permitidos" value={ex.intentos} min={0} max={20} hint="0 = sin límite" onSave={(v) => save({ intentos: v })} />
          <Num label="Tiempo límite" value={ex.tiempo} min={0} max={300} suf="min" hint="0 = sin límite" onSave={(v) => save({ tiempo: v })} />
          <Num label="Preguntas a responder" value={ex.maxPreg} min={0} max={200} hint="0 = todas" onSave={(v) => save({ maxPreg: v })} />
          <label>
            {t("Se abre el")} <input className="input" type="date" defaultValue={ex.desbloqueo} onChange={(e) => void save({ desbloqueo: e.target.value })} />
          </label>
          <Sel label="Presentación" value={ex.layout} map={LAYOUT} onSave={(v) => save({ layout: v })} />
          <Sel label="Orden de preguntas" value={ex.orden} map={ORDEN} onSave={(v) => save({ orden: v })} />
          <Num label="Caracteres · respuesta abierta" value={ex.lcAbierta} min={100} max={10000} onSave={(v) => save({ lcAbierta: v })} />
          <Sel label="Retroalimentación" value={ex.retro} map={RETRO} disabled={api.ocultar ? "revelar" : undefined} onSave={(v) => save({ retro: v })} />
          <Sel label="Nota final" value={ex.calculo} map={CALC} onSave={(v) => save({ calculo: v })} />
        </div>
        {api.ocultar ? (
          <p className="ce-hint">
            <Icon name="eye" /> {t("Ajuste global activo: el alumno solo ve su calificación final, sin detalle de respuestas.")}
          </p>
        ) : null}
      </div>
      {ex.preguntas.map((q, i) => (
        <QuestionEditor key={`${gen}-${i}`} api={api} i={i} initial={q} />
      ))}
      <div className="ce-pal">
        <p>{t(ex.preguntas.length ? "Agregar otra pregunta" : "Agrega las preguntas del examen.")}</p>
        <div className="ce-pgrid ce-pgrid-q">
          {(Object.entries(QTYPES) as Array<[EditorQuestionType, string]>).map(([k, v]) => (
            <button type="button" key={k} onClick={() => add(k)} disabled={api.busy || ex.preguntas.length >= 200}>
              <AIcon name={QICON[k]} />
              <b>{t(v)}</b>
            </button>
          ))}
          <button type="button" onClick={() => openModal({ title: "Traer preguntas del banco", content: <BankPicker api={api} /> })}>
            <Icon name={"book-open" satisfies IconName} />
            <b>{t("Traer del banco")}</b>
          </button>
        </div>
      </div>
    </>
  );
}
