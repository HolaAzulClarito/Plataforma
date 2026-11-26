/* Acciones del webinar que usan el sitio público, la academia y el panel. Registro y estado vienen de la API:
   - GET  /api/me/webinars/:slug           estado del médico (registrado, asistió, constancia).
   - POST /api/me/webinars/:slug/registro  registro (idempotente).
   La firma de webinarReg / downloadWebinarIcs / enterLive / useWebinarRegistered no cambia: la usan Home y NextWebinar. */
import { isoToMx, type MyWebinarStatus, type NextWebinar } from "@kiron/shared";
import { Icon } from "../../components/Icon";
import { useT } from "../../i18n";
import { ApiError, apiPost, useApi } from "../../lib/api";
import { downloadText } from "../../lib/download";
import { createStore, useStore } from "../../state/createStore";
import { openModal } from "../../state/modal";
import { getSession, hasRole, navigate, sessionStore, useSession } from "../../state/session";
import { toast } from "../../state/toasts";
import { requireSession } from "../auth";
import { webinarIcs } from "./status";

/* Registros confirmados por la API en esta sesión: muestran "Entrar" sin esperar a volver a leer el estado. */
export const webinarRegStore = createStore<Record<string, boolean>>({});

export type WebinarView = "antes" | "vivo" | "concluido";
/* Vista forzada del demo por webinar (barra "Vista del demo" de la landing; enterLive la pone en "vivo"). */
export const webinarViewStore = createStore<Record<string, WebinarView>>({});

/* Al cerrar sesión se olvidan los registros locales. */
sessionStore.subscribe(() => {
  if (!getSession().role && Object.keys(webinarRegStore.get()).length) webinarRegStore.set({});
});

/* Estado del médico en el webinar `slug` (solo con rol mvz). */
export function useWebinarStatus(slug = "proximo") {
  const { role } = useSession();
  return useApi<MyWebinarStatus>(role === "mvz" ? `/api/me/webinars/${encodeURIComponent(slug)}` : null);
}

/* ¿El médico de demo está registrado al webinar `slug`? ("proximo" = el próximo webinar). */
export function useWebinarRegistered(slug = "proximo"): boolean {
  const local = !!useStore(webinarRegStore)[slug];
  const st = useWebinarStatus(slug).data;
  return local || !!st?.registrado;
}

/* Registra al médico en la API. Devuelve el estado o null si falló (ya avisó con un toast). */
export async function registerWebinar(slug: string): Promise<MyWebinarStatus | null> {
  try {
    const st = await apiPost<MyWebinarStatus>(`/api/me/webinars/${encodeURIComponent(slug)}/registro`);
    webinarRegStore.set((s) => ({ ...s, [slug]: true }));
    return st;
  } catch (e) {
    toast(e instanceof ApiError ? e.message : "No pudimos registrarte al webinar");
    return null;
  }
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

/* Registro al próximo webinar (APP.webinarReg + APP.webinarDone): pide sesión de médico (con el aviso del demo),
   registra en la API y confirma con un modal. */
export function webinarReg(w: NextWebinar, slug = "proximo"): void {
  if (!hasRole(getSession().role, "mvz")) toast("Inicia sesión para registrarte al webinar");
  requireSession("mvz", () => {
    void registerWebinar(slug).then((st) => {
      if (st) openModal({ title: "Registro confirmado", size: "sm", content: <Confirmed w={w} /> });
    });
  });
}

/* Entrar a la transmisión (APP.live): abre la landing del webinar con la sala en vivo. */
export function enterLive(slug = "proximo"): void {
  requireSession("mvz", () => {
    webinarViewStore.set((s) => ({ ...s, [slug]: "vivo" }));
    navigate(`/webinar/${slug}`);
  });
}
