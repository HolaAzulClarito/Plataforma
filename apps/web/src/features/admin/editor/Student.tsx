/* Vista del alumno dentro del editor (ceStudent del demo): cómo se ve la lección o el examen final. */
import { isoToMx, type EditorCourse } from "@kiron/shared";
import { Icon } from "../../../components/Icon";
import { useT } from "../../../i18n";
import { toast } from "../../../state/toasts";
import { LAYOUT } from "../common";
import { ceTam } from "./Lesson";

export function StudentPreview({ c, mi = 0, li = 0, exam }: { c: EditorCourse; mi?: number; li?: number; exam?: boolean }) {
  const t = useT();
  if (exam) {
    const l = c.examen;
    const q0 = l.preguntas[0];
    const n = l.maxPreg && l.maxPreg < l.preguntas.length ? l.maxPreg : l.preguntas.length;
    return (
      <div className="cs-wrap">
        <p className="cs-crumb">{t("Cierre del curso")}</p>
        <h2>{l.titulo}</h2>
        <div className="panel cs-exam">
          <span className="badge badge-dark">
            <Icon name="clipboard-list" /> {t("Examen final")}
          </span>
          <h3>
            {n} {t("preguntas")} · {t("mínimo")} {l.aprobatoria} % ·{" "}
            {l.intentos ? (l.intentos === 1 ? t("1 intento") : `${l.intentos} ${t("intentos")}`) : t("intentos sin límite")} ·{" "}
            {l.tiempo ? `${l.tiempo} min` : t("sin tiempo límite")}
          </h3>
          <p className="sub">
            {t(LAYOUT[l.layout])} · {t("Se abre al terminar todas las lecciones y, al aprobarlo, se emite tu constancia.")}
          </p>
          {q0 ? (
            <fieldset className="cs-q">
              <legend>
                <b>1. {q0.texto || t("Pregunta sin texto")}</b>
              </legend>
              {q0.tipo === "om" || q0.tipo === "rm" ? (
                q0.opciones.map((o, k) => (
                  <label key={k}>
                    <input type={q0.tipo === "rm" ? "checkbox" : "radio"} name="csq" /> <span>{o || "—"}</span>
                  </label>
                ))
              ) : q0.tipo === "vf" ? (
                ["Verdadero", "Falso"].map((o) => (
                  <label key={o}>
                    <input type="radio" name="csq" /> {t(o)}
                  </label>
                ))
              ) : (
                <input className="input" aria-label={t("Tu respuesta")} maxLength={l.lcAbierta} />
              )}
            </fieldset>
          ) : null}
          <button type="button" className="btn btn-primary" onClick={() => toast("En la plataforma el examen corre con tiempo validado en el servidor")}>
            <Icon name="play" /> {t("Empezar examen")}
          </button>
        </div>
      </div>
    );
  }
  const m = c.modulos[mi];
  const l = m?.lecciones[li];
  if (!m || !l) return null;
  return (
    <div className="cs-wrap">
      <p className="cs-crumb">{m.nombre}</p>
      <h2>{l.titulo}</h2>
      <p className="sub">
        {l.dur ? `${l.dur} · ` : ""}
        {t("Se completa sola al terminar el video")}
        {l.desbloqueo ? ` · ${t("disponible a partir del")} ${isoToMx(l.desbloqueo)}` : ""}
      </p>
      <div className="cs-video">
        {l.video.lib ? (
          <>
            <div className="kstage">
              <span className="kplate">
                <img src="/img/kiron-logo.png" alt="Kirón" />
              </span>
              <span className="vlabel">Bunny Stream</span>
            </div>
            <span className="lr-tag">
              {t("Librería")} {l.video.lib} · {t("reproductor con token firmado")}
            </span>
          </>
        ) : (
          <div className="cs-empty">
            <Icon name="video" />
            <span>{t("Falta pegar el video de Bunny")}</span>
          </div>
        )}
      </div>
      {l.adjuntos.length ? (
        <div className="panel" style={{ marginTop: 16 }}>
          <h3>{t("Archivos de la lección")}</h3>
          {l.adjuntos.map((a) => (
            <div className="cs-docbar cs-dl" key={a.key}>
              <Icon name="download" />
              <div>
                <b>{a.nombre}</b>
                <small>{ceTam(a.tam)}</small>
              </div>
              <span className="grow" />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => toast("Descarga con enlace firmado de corta duración")}>
                <Icon name="download" /> {t("Descargar")}
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="cs-foot">
        <span className="auto-note">
          <Icon name="circle-play" /> {t("La lección se marca sola al terminar el video")}
        </span>
      </div>
    </div>
  );
}
