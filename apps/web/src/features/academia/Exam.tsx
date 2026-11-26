/* Examen final del curso (APP.exam, APP.exStep, APP.grade, APP.examResult y APP.recoveryReq del demo).
   Un solo examen por curso, al final. El navegador nunca califica: inicia el intento en la API, envía las respuestas y
   muestra lo que la API devuelve. El intento cuenta desde que se inicia. */
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  GRADE_CALC_LABEL,
  isoToMx,
  type AttemptRequest,
  type ExamResult,
  type ExamSession,
  type ExamStatus,
  type QuestionType,
} from "@kiron/shared";
import { Icon } from "../../components";
import { useT } from "../../i18n";
import { ApiError, apiPost } from "../../lib/api";
import { closeModal, openModal } from "../../state/modal";
import { toast } from "../../state/toasts";
import { refreshMe } from "../panel/useMe";

const QTYPE: Record<QuestionType, string> = { om: "Opción múltiple", vf: "Verdadero o falso", rm: "Respuesta múltiple" };

const attTxt = (n: number, max: number | null) => (max === null ? `Intento ${n}` : `Intento ${n} de ${max}`);
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/* Abre el flujo del examen según el estado que reporta la API. `onChange` se llama al cerrar el modal para recargar
   el avance del curso. */
export function openExam(slug: string, st: ExamStatus, onChange: () => void): void {
  if (st.estado === "aprobado") return toast("Ya aprobaste este examen");
  if (st.estado === "bloqueado") return toast("Termina todas las lecciones para presentar el examen final");
  if (st.estado === "programado") return toast(`Este examen se abre el ${isoToMx(st.abreEl)}`);
  if (st.estado === "sin_intentos") {
    openModal({ title: "Examen final", content: <NoAttempts slug={slug} st={st} onDone={onChange} />, onClose: onChange });
    return;
  }
  openModal({ title: "Examen final", content: <ExamFlow slug={slug} st={st} />, onClose: onChange });
}

/* Intentos agotados: explica y permite pedir un intento adicional a la administración. */
export function NoAttempts({ slug, st, onDone }: { slug: string; st: ExamStatus; onDone: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const pending = st.solicitud === "pendiente";
  const request = async () => {
    setBusy(true);
    try {
      await apiPost<AttemptRequest>(`/api/me/cursos/${slug}/examen/solicitudes`);
      closeModal();
      toast("Solicitud enviada. La administración autoriza el intento adicional.");
      onDone();
    } catch (e) {
      setBusy(false);
      toast(e instanceof ApiError ? e.message : "No pudimos enviar la solicitud");
    }
  };
  return (
    <div className="modal-b">
      <div className="big-ok lockd">
        <Icon name="lock" />
      </div>
      <h3 style={{ textAlign: "center", margin: "8px 0" }}>{t("Agotaste tus intentos")}</h3>
      <p style={{ textAlign: "center", color: "var(--muted)" }}>
        {t(`Usaste ${st.intentosUsados} de ${st.intentosMax ?? st.intentosUsados} intentos.`)}{" "}
        {t(
          "Terminaste las lecciones, pero sin aprobar el examen no se emite la constancia. Para presentar otra vez, la administración tiene que autorizar un intento adicional.",
        )}
      </p>
      {pending ? (
        <div className="notice" style={{ marginTop: 16 }} role="status">
          <Icon name="clock" />
          <span>{t("Solicitud enviada. Te avisamos por correo cuando la autoricen.")}</span>
        </div>
      ) : (
        <>
          {st.solicitud === "rechazado" ? (
            <div className="notice warn" style={{ marginTop: 16 }}>
              <Icon name="info" />
              <span>{t("Tu solicitud anterior fue rechazada. Puedes enviar otra.")}</span>
            </div>
          ) : null}
          <button className="btn btn-accent btn-block" type="button" style={{ marginTop: 18 }} onClick={request} disabled={busy}>
            <Icon name="rotate-ccw" /> {t("Solicitar intento adicional")}
          </button>
        </>
      )}
    </div>
  );
}

type Phase = { k: "intro" } | { k: "exam"; s: ExamSession } | { k: "result"; r: ExamResult; s: ExamSession } | { k: "expired"; msg: string };

/* Contenido del modal del examen: inicio, preguntas y resultado. */
export function ExamFlow({ slug, st }: { slug: string; st: ExamStatus }) {
  const [phase, setPhase] = useState<Phase>(st.estado === "en_curso" && st.sesion ? { k: "exam", s: st.sesion } : { k: "intro" });
  if (phase.k === "intro") return <ExamIntro slug={slug} st={st} onStart={(s) => setPhase({ k: "exam", s })} />;
  if (phase.k === "exam")
    return (
      <ExamForm
        slug={slug}
        session={phase.s}
        aprobatoria={st.config.aprobatoria}
        onResult={(r) => setPhase({ k: "result", r, s: phase.s })}
        onExpired={(msg) => setPhase({ k: "expired", msg })}
      />
    );
  if (phase.k === "expired") return <ExamExpired msg={phase.msg} />;
  return <ExamResultView r={phase.r} max={phase.s.intentosMax} />;
}

function ExamIntro({ slug, st, onStart }: { slug: string; st: ExamStatus; onStart: (s: ExamSession) => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const { config } = st;
  const start = async () => {
    setBusy(true);
    try {
      onStart(await apiPost<ExamSession>(`/api/me/cursos/${slug}/examen/iniciar`));
    } catch (e) {
      setBusy(false);
      toast(e instanceof ApiError ? e.message : "No pudimos iniciar el examen");
    }
  };
  return (
    <div className="modal-b">
      <div className="exam-bar">
        <span>
          <Icon name="rotate-ccw" /> {t(attTxt(st.intentosUsados + 1, st.intentosMax))}
        </span>
        {config.tiempo ? (
          <span>
            <Icon name="timer" /> {t(`${config.tiempo} minutos`)}
          </span>
        ) : null}
        <span>{t(`Mínimo ${config.aprobatoria} %`)}</span>
      </div>
      <p style={{ margin: "6px 0 14px" }}>{t(`${st.preguntas} preguntas · ${config.layout === "una" ? "una por pantalla" : "todas en una página"}`)}</p>
      <div className="notice" style={{ marginBottom: 16 }}>
        <Icon name="info" />
        <span>
          {t("El intento cuenta desde que lo inicias.")}{" "}
          {config.tiempo ? t("Si se acaba el tiempo, tus respuestas se envían solas.") : null}{" "}
          {t("La constancia se emite al terminar todas las lecciones y aprobar el examen final.")}
        </span>
      </div>
      <button className="btn btn-accent btn-block" type="button" onClick={start} disabled={busy}>
        <Icon name="list-checks" /> {t("Iniciar examen")}
      </button>
    </div>
  );
}

/* Temporizador visible y anuncio para lectores de pantalla solo en momentos clave (5 min, 1 min, 30 s, 10 s). */
const ANNOUNCE_AT = [300, 60, 30, 10];

function useTimeLeft(venceEn: string | null, onTimeout: () => void): number | null {
  const end = venceEn ? Date.parse(venceEn) : null;
  const [left, setLeft] = useState<number | null>(() => (end === null ? null : Math.max(0, Math.ceil((end - Date.now()) / 1000))));
  const fired = useRef(false);
  const cb = useRef(onTimeout);
  useEffect(() => {
    cb.current = onTimeout;
  });
  useEffect(() => {
    if (end === null) return;
    const tick = () => {
      const s = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(s);
      if (s <= 0 && !fired.current) {
        fired.current = true;
        cb.current();
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [end]);
  return left;
}

function ExamForm({
  slug,
  session,
  aprobatoria,
  onResult,
  onExpired,
}: {
  slug: string;
  session: ExamSession;
  aprobatoria: number;
  onResult: (r: ExamResult) => void;
  onExpired: (msg: string) => void;
}) {
  const t = useT();
  const uid = useId();
  const qs = session.preguntas;
  const one = session.layout === "una" && qs.length > 1;
  const [answers, setAnswers] = useState<Record<number, number[]>>({});
  const [pos, setPos] = useState(0);
  const [busy, setBusy] = useState(false);
  const [announce, setAnnounce] = useState("");
  const sending = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);

  const send = useCallback(
    async (auto: boolean) => {
      if (sending.current) return;
      sending.current = true;
      setBusy(true);
      if (auto) setAnnounce(t("Se acabó el tiempo. Enviamos tus respuestas."));
      try {
        const r = await apiPost<ExamResult>(`/api/me/cursos/${slug}/examen/intentos`, {
          sesion: session.id,
          respuestas: qs.map((q) => ({ i: q.i, v: answers[q.i] ?? [] })),
        });
        refreshMe();
        onResult(r);
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) onExpired(e.message);
        else {
          sending.current = false;
          setBusy(false);
          toast(e instanceof ApiError ? e.message : "No pudimos enviar tus respuestas");
        }
      }
    },
    [answers, onExpired, onResult, qs, session.id, slug, t],
  );

  const left = useTimeLeft(session.venceEn, () => void send(true));

  useEffect(() => {
    if (left !== null && ANNOUNCE_AT.includes(left)) setAnnounce(t(left >= 60 ? `Quedan ${left / 60} minutos` : `Quedan ${left} segundos`));
  }, [left, t]);

  /* En modo una por pantalla, el foco va a la pregunta que se muestra. */
  useEffect(() => {
    if (!one) return;
    formRef.current?.querySelector<HTMLElement>(`fieldset[data-pos="${pos}"] input`)?.focus();
  }, [one, pos]);

  const pick = (i: number, j: number, multi: boolean, on: boolean) =>
    setAnswers((a) => {
      const cur = a[i] ?? [];
      return { ...a, [i]: multi ? (on ? [...new Set([...cur, j])].sort() : cur.filter((x) => x !== j)) : [j] };
    });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(false);
  };
  const answered = qs.filter((q) => (answers[q.i] ?? []).length).length;
  const last = pos === qs.length - 1;

  return (
    <form ref={formRef} className={`modal-b ${one ? "ex-one" : ""}`} noValidate onSubmit={onSubmit} aria-busy={busy}>
      <div className="exam-bar">
        <span>
          <Icon name="rotate-ccw" /> {t(attTxt(session.intento, session.intentosMax))}
        </span>
        {left !== null ? (
          <span>
            <Icon name="timer" /> <b aria-label={t("Tiempo restante")}>{mmss(left)}</b>
          </span>
        ) : null}
        <span>{t(`Mínimo ${aprobatoria} %`)}</span>
      </div>
      <p className="sr" aria-live="polite" aria-atomic="true">
        {announce}
      </p>
      {qs.map((q, k) => {
        const multi = q.t === "rm";
        const chosen = answers[q.i] ?? [];
        return (
          <fieldset key={q.i} className={`q ${one && k !== pos ? "hid" : ""}`} data-q={q.i} data-pos={k}>
            <legend>
              {k + 1}. {q.q}
            </legend>
            <span className="qtype">{t(QTYPE[q.t])}</span>
            {q.o.map((o, j) => (
              <label className="opt" key={j}>
                <input
                  type={multi ? "checkbox" : "radio"}
                  name={`${uid}-q${q.i}`}
                  value={j}
                  checked={chosen.includes(j)}
                  onChange={(e) => pick(q.i, j, multi, e.currentTarget.checked)}
                />{" "}
                {o}
              </label>
            ))}
          </fieldset>
        );
      })}
      {one ? (
        <div className="ex-nav">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPos((p) => Math.max(0, p - 1))} disabled={pos === 0}>
            <Icon name="arrow-left" /> {t("Anterior")}
          </button>
          <span aria-live="polite">
            {pos + 1} / {qs.length}
          </span>
          {!last ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setPos((p) => Math.min(qs.length - 1, p + 1))}>
              {t("Siguiente")} <Icon name="arrow-right" />
            </button>
          ) : (
            <span />
          )}
        </div>
      ) : null}
      {!one || last ? (
        <button className="btn btn-accent btn-block" type="submit" disabled={busy}>
          {t("Enviar respuestas")}
        </button>
      ) : null}
      <p className="ce-hint" style={{ justifyContent: "center", marginTop: 10 }}>
        {t(`${answered} de ${qs.length} respondidas`)} · {t("Al terminar verás tu calificación final.")}
      </p>
    </form>
  );
}

function ExamExpired({ msg }: { msg: string }) {
  const t = useT();
  return (
    <div className="modal-b" role="alert">
      <div className="res-big bad">
        <small>{t("Tu calificación")}</small>
        <b>0.0</b>
        <span className="state st-rev">{t("No aprobado")}</span>
      </div>
      <div className="notice warn" style={{ marginTop: 14 }}>
        <Icon name="lock" />
        <span>{t(msg)}</span>
      </div>
      <button className="btn btn-primary btn-block" type="button" style={{ marginTop: 14 }} onClick={closeModal}>
        {t("Entendido")}
      </button>
    </div>
  );
}

/* Resultado tal como lo devuelve la API. Se anuncia con role=status y el foco pasa al resultado. */
export function ExamResultView({ r, max }: { r: ExamResult; max: number | null }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  const a = r.intento;
  const left = r.intentosRestantes;
  return (
    <div className="modal-b">
      <div ref={ref} tabIndex={-1} role="status" aria-live="polite" className={`res-big ${a.ok ? "ok" : "bad"}`}>
        <small>{t("Tu calificación")}</small>
        <b>{a.nota.toFixed(1)}</b>
        <span className={`state ${a.ok ? "st-ok" : "st-rev"}`}>{t(a.ok ? "Aprobado" : "No aprobado")}</span>
      </div>
      <div className="rows rows-light">
        <div>
          <span>{t("Calificación mínima")}</span>
          <b>
            {(r.aprobatoria / 10).toFixed(1)} ({r.aprobatoria} %)
          </b>
        </div>
        <div>
          <span>{t("Intento")}</span>
          <b>{max === null ? a.n : t(`${a.n} de ${max}`)}</b>
        </div>
        <div>
          <span>
            {t("Calificación final")} · {t(GRADE_CALC_LABEL[r.calculo])}
          </span>
          <b>{r.notaFinal.toFixed(1)}</b>
        </div>
        {a.ok ? null : (
          <div>
            <span>{t("Intentos restantes")}</span>
            <b>{left === null ? t("Sin límite") : left}</b>
          </div>
        )}
      </div>
      {r.detalle ? (
        <div className="q-res">
          {r.detalle.map((d, n) => (
            <div key={d.i} className={d.ok ? "ok" : "bad"}>
              <Icon name={d.ok ? "circle-check" : "x"} />
              <div>
                <b>
                  {n + 1}. {d.q}
                </b>
                <small>
                  {t("Correcta:")} {d.correctas.join(" · ")}
                </small>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {r.constancia ? (
        <div className="notice" style={{ marginTop: 14 }}>
          <Icon name="award" />
          <span>
            {t("Terminaste el curso. Tu constancia ya está en tu panel")}
            {r.puntos ? ` · ${t(`+${r.puntos} puntos`)}` : ""}.
          </span>
        </div>
      ) : !a.ok ? (
        <div className="notice warn" style={{ marginTop: 14 }}>
          <Icon name="lock" />
          <span>
            {t(
              left !== null && left <= 0
                ? "Agotaste tus intentos. Sin aprobar el examen no se emite la constancia; puedes pedir un intento adicional desde el examen."
                : "Sin aprobar el examen no se emite la constancia. Puedes volver a presentarlo.",
            )}
          </span>
        </div>
      ) : null}
      {r.detalle ? null : (
        <p className="ce-hint" style={{ justifyContent: "center", marginTop: 12 }}>
          {t("Solo se muestra tu calificación final.")}
        </p>
      )}
      <button className="btn btn-primary btn-block" type="button" style={{ marginTop: 14 }} onClick={closeModal}>
        {t("Entendido")}
      </button>
    </div>
  );
}
