/* Feature: webinars.
   - /webinar/:slug (WebinarPage.tsx): landing, registro, sala en vivo simulada, asistencia con puntos y .ics.
     Se carga con React.lazy desde app/routes.tsx importando WebinarPage.tsx directo (no se re-exporta aquí para que
     quede en su propio chunk; el inicio sí importa este índice).
   - <NextWebinar webinar={...} />: bloque del próximo webinar (inicio y academia).
   - webinarReg(w), downloadWebinarIcs(w), enterLive(slug), useWebinarRegistered(slug): acciones contra la API.
   - webinarIsPast / webinarStart / webinarTimeZones / webinarIcs / summaryIcs: reglas de fecha puras (status.ts). */
export { NextWebinar, WebinarDate, RECORDINGS_HREF } from "./NextWebinar";
export {
  webinarReg,
  downloadWebinarIcs,
  enterLive,
  registerWebinar,
  useWebinarRegistered,
  useWebinarStatus,
  webinarRegStore,
  webinarViewStore,
  type WebinarView,
} from "./actions";
export { webinarIsPast, webinarStart, webinarTimeZones, webinarIcs, summaryIcs, landingUrl, DEFAULT_STARTS_AT, WEBINAR_MINUTES } from "./status";
