/* /webinar/:slug (webinarLanding() del demo): landing del webinar, registro, sala en vivo simulada, asistencia con
   puntos y constancia, y .ics. Estado del médico desde la API (GET/POST /api/me/webinars/:slug...). */
import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { youtubeId, type MyWebinarStatus, type WebinarSummary } from "@kiron/shared";
import { ApiStatus, Countdown, Icon } from "../../components";
import { useI18n, useT } from "../../i18n";
import { ApiError, apiPost, useApi } from "../../lib/api";
import { downloadText } from "../../lib/download";
import { useNow } from "../../lib/time";
import { useStore } from "../../state/createStore";
import { getSession, hasRole, useSession } from "../../state/session";
import { toast } from "../../state/toasts";
import { requireSession } from "../auth";
import { downloadCertificate } from "../academia/print";
import { refreshMe } from "../panel/useMe";
import { NotFound } from "../sitio/NotFound";
import { registerWebinar, useWebinarStatus, webinarRegStore, webinarViewStore, type WebinarView } from "./actions";
import { summaryIcs } from "./status";

const VIEWS: Array<[WebinarView, string]> = [
  ["antes", "Antes del evento"],
  ["vivo", "En vivo"],
  ["concluido", "Concluido"],
];

const SAMPLE_QS: Array<[string, string]> = [
  ["MVZ Paola R.", "¿La grabación queda disponible?"],
  ["Dr. Andrés S.", "¿Desde cuándo se descarga la constancia?"],
];

function LiveQuestions() {
  const t = useT();
  const [qs, setQs] = useState<Array<[string, string]>>([]);
  const [v, setV] = useState("");
  const ask = (e: FormEvent) => {
    e.preventDefault();
    const q = v.trim();
    if (!q) return;
    setQs((x) => [...x, [t("Tú"), q]]);
    setV("");
    toast("Pregunta enviada al moderador");
  };
  return (
    <aside className="lr-side">
      <b>{t("Preguntas al ponente")}</b>
      <div className="lr-q" aria-live="polite">
        {SAMPLE_QS.map(([who, q]) => (
          <div key={q}>
            <small>{who}</small>
            {t(q)}
          </div>
        ))}
        {qs.map(([who, q], i) => (
          <div key={i}>
            <small>{who}</small>
            {q}
          </div>
        ))}
      </div>
      <form className="lr-in" onSubmit={ask}>
        <input name="q" value={v} onChange={(e) => setV(e.target.value)} placeholder={t("Escribe tu pregunta")} aria-label={t("Tu pregunta")} required maxLength={300} />
        <button className="btn btn-primary btn-sm" type="submit" aria-label={t("Enviar pregunta")}>
          <Icon name="send" />
        </button>
      </form>
    </aside>
  );
}

export function WebinarPage() {
  const t = useT();
  const { lang } = useI18n();
  const { slug = "proximo" } = useParams();
  const { role } = useSession();
  /* GET /api/webinars/proximo es una excepción explícita del contrato (packages/shared/src/api.ts): responde NextWebinar,
     no WebinarSummary. Por eso el resumen se toma siempre del listado público, que incluye "proximo" y los publicados. */
  const list = useApi<WebinarSummary[]>("/api/webinars");
  const me = useWebinarStatus(slug);
  const localReg = !!useStore(webinarRegStore)[slug];
  const forced = useStore(webinarViewStore)[slug];
  const now = useNow(30_000);
  const [busy, setBusy] = useState(false);

  const found = list.data?.find((x) => x.slug === slug);
  if (list.data && !found) return <NotFound />;
  if (!found)
    return (
      <div className="wrap" style={{ padding: "60px 32px" }}>
        <ApiStatus loading={list.loading} error={list.error} onRetry={list.refetch} />
      </div>
    );
  const d = found;
  const titulo = lang === "en" && d.tituloEn ? d.tituloEn : d.titulo;
  const subtitulo = lang === "en" && d.subtituloEn ? d.subtituloEn : d.subtitulo;
  const t0 = Date.parse(d.inicio);
  const real: WebinarView = now < t0 ? "antes" : now < t0 + d.duracion * 60_000 ? "vivo" : "concluido";
  const vista = forced ?? real;
  const st: MyWebinarStatus | undefined = me.data;
  const reg = localReg || !!st?.registrado;
  const att = !!st?.asistio;
  const logged = hasRole(role, "mvz");

  const setView = (v: WebinarView) => webinarViewStore.set((s) => ({ ...s, [slug]: v }));
  const register = () => {
    if (!hasRole(getSession().role, "mvz")) toast("Inicia sesión para registrarte al webinar");
    requireSession("mvz", async () => {
      setBusy(true);
      const ok = await registerWebinar(slug);
      setBusy(false);
      if (ok) {
        toast("Registro confirmado. Te recordamos por correo 24 horas y 1 hora antes.");
        me.refetch();
      }
    });
  };
  const attend = async () => {
    setBusy(true);
    try {
      const r = await apiPost<MyWebinarStatus>(`/api/me/webinars/${encodeURIComponent(slug)}/asistencia`);
      toast(r.puntos ? `Asistencia registrada · +${r.puntos} puntos Club MVZ` : "Tu asistencia ya estaba registrada");
      refreshMe();
      me.refetch();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "No pudimos registrar tu asistencia");
    } finally {
      setBusy(false);
    }
  };
  const ics = () => {
    downloadText(`webinar-kiron-${slug}.ics`, summaryIcs(d), "text/calendar");
    toast("Evento descargado. Ábrelo para agregarlo a tu calendario.");
  };

  const yt = d.modo === "youtube" ? youtubeId(st?.youtube ?? undefined) : null;
  const player = yt ? (
    <iframe
      src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&mute=1&rel=0`}
      title={t("Transmisión del webinar")}
      allow="autoplay; encrypted-media; picture-in-picture"
      allowFullScreen
      style={{ width: "100%", height: "100%", border: 0, display: "block" }}
    />
  ) : (
    <>
      <div className="kstage">
        <span className="kplate">
          <img src="/img/kiron-logo.png" alt="Kirón" />
        </span>
        <span className="vlabel">{t("En vivo")}</span>
      </div>
      <span className="lr-tag">{t("Reproductor del sitio · la señal llega desde Zoom por Cloudflare Stream")}</span>
    </>
  );

  let body;
  if (!logged || role === "admin")
    body =
      role === "admin" ? (
        <div className="panel wl-box">
          <Icon name="shield-check" />
          <div>
            <h3>{t("Vista del equipo Kirón")}</h3>
            <p className="sub">{t("El registro, la sala en vivo y la asistencia son para médicos. Inicia sesión como médico para probarlos.")}</p>
          </div>
        </div>
      ) : (
        <div className="panel wl-box">
          <Icon name="lock" />
          <div>
            <h3>{t("Transmisión exclusiva para médicos veterinarios")}</h3>
            <p className="sub">{t("Inicia sesión o crea tu cuenta y regístrate al webinar para ver la transmisión aquí, sin instalar Zoom.")}</p>
            <button className="btn btn-primary" type="button" onClick={register}>
              <Icon name="calendar" /> {t("Registrarme al webinar")}
            </button>
          </div>
        </div>
      );
  else if (!st && me.loading)
    body = <ApiStatus loading error={null} />;
  else if (!reg && vista !== "concluido")
    body = (
      <div className="panel wl-box">
        <Icon name="calendar" />
        <div>
          <h3>{t("Regístrate para ver la transmisión")}</h3>
          <p className="sub">{t("Con tu registro, el día del evento esta página muestra el reproductor y tu asistencia se cuenta sola.")}</p>
          <button className="btn btn-primary" type="button" onClick={register} disabled={busy}>
            <Icon name="calendar" /> {t("Registrarme")}
          </button>
        </div>
      </div>
    );
  else if (!reg)
    body = (
      <div className="panel wl-box">
        <Icon name="info" />
        <div>
          <h3>{t("Este webinar ya concluyó")}</h3>
          <p className="sub">{t("La grabación está disponible para quienes se registraron. Revisa los próximos webinars en Academia.")}</p>
          <Link className="btn btn-ghost" to="/academia?tab=webinars">
            {t("Ver webinars")}
          </Link>
        </div>
      </div>
    );
  else if (vista === "antes")
    body = (
      <div className="wl-wait">
        <div>
          <span className="eyebrow light">{t("Ya estás registrado")}</span>
          <h3>{t("La transmisión empieza en")}</h3>
          <Countdown target={t0} />
          <p>{t("El reproductor aparece en esta página a la hora del evento. Te avisamos por correo 24 horas y 1 hora antes.")}</p>
          <div className="hc-ctas">
            <button className="btn btn-accent" type="button" onClick={ics}>
              <Icon name="calendar" /> {t("Agregar a mi calendario")}
            </button>
          </div>
        </div>
      </div>
    );
  else if (vista === "vivo")
    body = (
      <div className="live-room wl-room" data-lenis-prevent="">
        <div className="lr-top">
          <span className="lr-live">
            <i /> {t("EN VIVO")}
          </span>
          <b>{titulo}</b>
          <span className="lr-sp">
            {d.grado} {d.ponente}
          </span>
        </div>
        <div className="lr-main">
          <div className="lr-stage">
            {player}
            <span className="lr-count">
              <Icon name="users" /> {t("342 conectados")}
            </span>
          </div>
          <LiveQuestions />
        </div>
        <div className="lr-foot" role="status">
          <Icon name="circle-check" />{" "}
          {att ? (
            <span>{t("Tu asistencia quedó registrada · +50 puntos Club MVZ")}</span>
          ) : (
            <>
              <span>{t("Tu asistencia se mide cada minuto mientras esta página está abierta.")}</span>
              <button className="btn btn-accent btn-sm" type="button" style={{ marginLeft: "auto" }} onClick={() => void attend()} disabled={busy}>
                {t(`Simular ${d.umbral} minutos vistos`)}
              </button>
            </>
          )}
        </div>
      </div>
    );
  else
    body = (
      <div className="two" style={{ marginTop: 0 }}>
        <div className="player" style={{ minHeight: 260 }}>
          <span className="ptitle">{t("Grabación · ejemplo")}</span>
          <button className="playbtn" type="button" aria-label={t("Reproducir grabación")} onClick={() => toast("En el sitio real se reproduce la grabación que guarda Cloudflare Stream")}>
            <Icon name="play" />
          </button>
        </div>
        <div className="panel">
          <h3>{t(att ? "Asististe a este webinar" : "Grabación disponible")}</h3>
          <p className="sub">
            {t(att ? "Tu constancia ya está en tu panel, con folio y QR." : "No alcanzaste los minutos en vivo para la constancia; puedes ver la grabación cuando quieras.")}
          </p>
          {att && st?.constancia ? (
            <button className="btn btn-primary btn-sm" type="button" onClick={() => void downloadCertificate(st.constancia!.folio, t, lang)}>
              <Icon name="award" /> {t("Descargar constancia")}
            </button>
          ) : null}
        </div>
      </div>
    );

  return (
    <>
      <div className="wl-demo" role="group" aria-label={t("Vista del demo")}>
        <span>{t("Vista del demo")}</span>
        {VIEWS.map(([v, label]) => (
          <button key={v} type="button" className={vista === v ? "on" : undefined} aria-pressed={vista === v} onClick={() => setView(v)}>
            {t(label)}
          </button>
        ))}
      </div>
      <section className="wl-hero">
        <div className="wrap wl-grid">
          <div>
            {d.flyer ? (
              <img className="wl-flyer" src={d.flyer} alt={t("Flyer del webinar")} />
            ) : (
              <div className="wl-flyer wl-noflyer" aria-hidden="true">
                <Icon name="video" />
              </div>
            )}
          </div>
          <div>
            <span className="badge badge-new">{t("Webinar en vivo · gratuito")}</span>
            <h1 className="h-lg" style={{ marginTop: 16 }}>
              {titulo}
            </h1>
            {subtitulo ? <p className="lead">{subtitulo}</p> : null}
            <p className="wl-meta">
              <Icon name="calendar" />{" "}
              <span>
                {d.fecha} · {d.hora} {t("Hrs (centro de México)")} · {d.duracion} min
              </span>
            </p>
            <p className="wl-meta">
              <Icon name="user" />{" "}
              <span>
                {d.grado} {d.ponente}
              </span>
            </p>
            <p className="wl-meta">
              <Icon name="award" /> <span>{t(`Constancia de asistencia y +50 puntos Club MVZ al ver al menos ${d.umbral} minutos en vivo`)}</span>
            </p>
          </div>
        </div>
      </section>
      <section className="sec">
        <div className="wrap">{body}</div>
      </section>
    </>
  );
}
