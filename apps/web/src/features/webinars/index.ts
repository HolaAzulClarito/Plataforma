/* Feature: webinars. La landing /webinar/:slug (sala en vivo, registro, asistencia) la porta el agente de webinars.
   Lo que ya existe y usa el sitio público:
   - <NextWebinar webinar={...} />: bloque del próximo webinar (inicio y academia).
   - webinarReg(w), downloadWebinarIcs(w), enterLive(slug): acciones (STUBS documentados en actions.tsx).
   - webinarIsPast / webinarStart / webinarTimeZones / webinarIcs: reglas de fecha puras (status.ts). */
export { WebinarPage } from "./WebinarPage";
export { NextWebinar, WebinarDate, RECORDINGS_HREF } from "./NextWebinar";
export { webinarReg, downloadWebinarIcs, enterLive, useWebinarRegistered, webinarRegStore } from "./actions";
export { webinarIsPast, webinarStart, webinarTimeZones, webinarIcs, DEFAULT_STARTS_AT, WEBINAR_MINUTES } from "./status";
