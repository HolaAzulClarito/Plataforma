/* Acciones del webinar que usa el sitio público. STUBS documentados para el agente de webinars:
   - El registro hoy vive solo en la sesión del navegador (webinarRegStore). Cuando la API publique
     POST /api/webinars/:slug/registro en packages/shared/src/api.ts, reemplaza el cuerpo de markRegistered por
     apiPost(...) y lee el estado con useApi.
   - enterLive() navega a /webinar/proximo, que hoy es una página "En migración".
   La firma de webinarReg / downloadWebinarIcs / enterLive no debe cambiar: la usan Home y NextWebinar. */
import { isoToMx, type NextWebinar } from "@kiron/shared";
import { Icon } from "../../components/Icon";
import { useT } from "../../i18n";
import { downloadText } from "../../lib/download";
import { createStore, useStore } from "../../state/createStore";
import { openModal } from "../../state/modal";
import { getSession, hasRole, navigate } from "../../state/session";
import { toast } from "../../state/toasts";
import { requireSession } from "../auth";
import { webinarIcs } from "./status";

const REG_KEY = "kiron-web-v25-webinars";

function readReg(): Record<string, boolean> {
  try {
    return JSON.parse(sessionStorage.getItem(REG_KEY) || "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

export const webinarRegStore = createStore<Record<string, boolean>>(readReg());
webinarRegStore.subscribe(() => {
  try {
    sessionStorage.setItem(REG_KEY, JSON.stringify(webinarRegStore.get()));
  } catch {
    /* sin almacenamiento: queda en memoria */
  }
});

/* ¿El médico de demo está registrado al webinar `slug`? ("proximo" = el próximo webinar). */
export const useWebinarRegistered = (slug = "proximo") => !!useStore(webinarRegStore)[slug];

function markRegistered(slug: string): void {
  webinarRegStore.set((s) => ({ ...s, [slug]: true }));
}

/* Descarga el .ics del webinar (APP.ics). */
export function downloadWebinarIcs(w: NextWebinar): void {
  const name = `webinar-kiron-${(isoToMx(w.date) || "proximo").replace(/\//g, "-")}.ics`;
  downloadText(name, webinarIcs(w), "text/calendar");
  toast("Evento descargado. Ábrelo para agregarlo a tu calendario.");
}

function Confirmed({ w }: { w: NextWebinar }) {
  const t = useT();
  return (
    <div className="modal-b" style={{ textAlign: "center" }}>
      <div className="big-ok">
        <Icon name="circle-check" />
      </div>
      <h3 style={{ fontSize: 22, margin: "10px 0 6px" }}>{w.title}</h3>
      <p style={{ color: "var(--muted)" }}>
        {t(`${isoToMx(w.date)} · ${w.time.replace(/\s*Hrs$/, "")} Hrs (México). Ese día aparece el botón Entrar en tu panel. Te recordamos por correo 24 horas y 1 hora antes.`)}
      </p>
      <button className="btn btn-primary" type="button" style={{ marginTop: 20 }} onClick={() => downloadWebinarIcs(w)}>
        <Icon name="calendar" /> {t("Agregar a mi calendario")}
      </button>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 10 }}>{t("Descarga un archivo .ics para Google Calendar, Outlook o Apple.")}</p>
    </div>
  );
}

/* Registro al próximo webinar (APP.webinarReg + APP.webinarDone): pide sesión de médico (con el aviso del demo)
   y confirma con un modal. */
export function webinarReg(w: NextWebinar, slug = "proximo"): void {
  if (!hasRole(getSession().role, "mvz")) toast("Inicia sesión para registrarte al webinar");
  requireSession("mvz", () => {
    markRegistered(slug);
    openModal({ title: "Registro confirmado", size: "sm", content: <Confirmed w={w} /> });
  });
}

/* Entrar a la transmisión (APP.live). STUB: navega a la landing del webinar, que porta el agente de webinars. */
export function enterLive(slug = "proximo"): void {
  requireSession("mvz", () => navigate(`/webinar/${slug}`));
}
