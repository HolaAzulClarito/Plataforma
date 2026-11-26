/* Feature: academia. Rutas: /academia (?tab=cursos|diplomados|webinars&sec=), /academia/curso/:slug, /verificar/:folio.
   Fuente legacy: academia(), curso(), cursoLanding(), verificar() y APP.enroll, APP.lesson..., APP.exam, APP.grade y APP.certificate en legacy/assets/js/app.js.
   Las páginas se cargan con React.lazy desde app/routes.tsx (importan Academia.tsx, Curso.tsx y Verificar.tsx directo). */
export { AcademiaPage, CourseCard, useMyEnrollments } from "./Academia";
export { CursoPage } from "./Curso";
export { VerificarPage } from "./Verificar";
export { openExam } from "./Exam";
export { downloadCertificate, printDoc } from "./print";
