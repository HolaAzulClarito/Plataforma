/* Feature: academia. Rutas: /academia (?tab=cursos|diplomados|webinars&sec=), /academia/curso/:slug, /verificar/:folio.
   Fuente legacy: academia(), curso(), cursoLanding(), verificar() en legacy/assets/js/app.js.
   Para el bloque del próximo webinar usa <NextWebinar> de features/webinars. */
export { AcademiaPage, CursoPage, VerificarPage } from "./AcademiaPages";
