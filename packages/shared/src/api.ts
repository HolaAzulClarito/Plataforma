/* Contrato HTTP entre apps/web y apps/api.
   Convenciones:
   - Prefijo /api. Respuestas JSON sin sobre ({ data }): el cuerpo ES el tipo indicado.
   - Errores: { error: string } con 400 (validación), 401 (sin rol), 403 (rol insuficiente), 404, 409, 500.
   - Rol de demo en el encabezado DEMO_ROLE_HEADER: "mvz" | "admin". No es seguridad real (ADR-003).
   - El médico de demo es siempre DEMO_USER.
   Cada módulo agrega aquí su sección; no se cambian las firmas existentes sin avisar al frontend. */

import type {
  AcademySettings,
  AttemptRequest,
  AttemptRequestState,
  Automation,
  BankQuestion,
  CedulaVerification,
  CertTemplate,
  CertVar,
  CertVarKey,
  Certificate,
  CertificateKind,
  ClubReward,
  Course,
  CourseKind,
  CourseModule,
  CourseState,
  Distributor,
  EditorCourse,
  EditorQuestion,
  EditorQuestionType,
  Enrollment,
  EnrollmentState,
  ExamConfig,
  ExamLayout,
  GradeCalc,
  Group,
  Lang,
  NextWebinar,
  Product,
  QuestionType,
  RepPerson,
  RepZone,
  Role,
  SitePage,
  Student,
  Video,
  WebinarMode,
  WebinarSummary,
} from "./types";
import type { DateRange } from "./format";

export const DEMO_ROLE_HEADER = "X-Demo-Role";
export const DEMO_USER = { name: "Dra. Laura Méndez", email: "laura.mendez@clinica.mx", initials: "LM" } as const;
export const DEMO_ADMIN = { name: "Equipo Kirón", email: "admin@kiron-demo.mx", initials: "KI" } as const;

export interface ApiError {
  error: string;
}

/* ---------- Catálogo y red comercial (público) ----------
   GET /api/categorias                 -> string[]
   GET /api/productos                  -> Product[]   (todos; el filtrado y orden se hacen en el cliente, como en el demo)
   GET /api/productos/:slug            -> ProductDetail | 404
   GET /api/representantes             -> RepsResponse
   GET /api/distribuidores             -> Distributor[]   (de ejemplo)
   GET /api/paises                     -> CountriesResponse
   GET /api/videos                     -> Video[]
   GET /api/webinars/proximo           -> NextWebinar
   GET /api/cursos                     -> Course[]   (solo los visibles al público; admin ve todos con ?todos=1)
*/
export interface ProductDetail {
  product: Product;
  /* Relacionados declarados o, si no hay, hasta 4 de la misma categoría. */
  related: Product[];
}

export interface RepsResponse {
  zonas: RepZone[];
  nacionales: RepPerson[];
}

export interface CountriesResponse {
  activos: string[];
  proximamente: string[];
}

export type CatalogResponses = {
  categorias: string[];
  productos: Product[];
  producto: ProductDetail;
  representantes: RepsResponse;
  distribuidores: Distributor[];
  paises: CountriesResponse;
  videos: Video[];
  webinarProximo: NextWebinar;
  cursos: Course[];
};

/* Filtro de fechas de los listados del administrador: "" | "7" | "30" | "anio". */
export type { DateRange };

/* ---------- Sesión de demo y reinicio ----------
   GET  /api/sesion         (mvz | admin) -> MeResponse   (401 sin rol). Las rutas del médico viven bajo /api/me/*.
   POST /api/demo/reset     (público; 404 en producción) -> { ok: true }   Restaura todos los datos semilla.
*/
export interface MeResponse {
  rol: Role;
  usuario: { name: string; email: string; initials: string };
  /* Solo para el rol mvz. */
  puntos: number | null;
}

/* ---------- Cursos (público) ----------
   GET /api/cursos/:slug    -> CourseDetail | 404 (los cursos no visibles solo los ve admin)
   Los cursos publicados desde el editor también aparecen en GET /api/cursos.
*/
export interface LessonInfo {
  i: number;
  /* Número de módulo (1..n). */
  modulo: number;
  titulo: string;
  duracion: string;
  /* Fecha ISO si la lección sigue bloqueada (desbloqueo por fecha); "" si está abierta. */
  bloqueadaHasta: string;
}

export interface CourseDetail {
  course: Course;
  estado: CourseState;
  tipo: CourseKind;
  origen: "catalogo" | "editor";
  modulos: CourseModule[];
  /* null si el ajuste "resumen" está apagado o si el ajuste "login" exige sesión y no la hay. */
  temario: LessonInfo[] | null;
  instructor: string;
  descripcion: string;
  examen: { preguntas: number; aprobatoria: number; intentos: number; tiempo: number; desbloqueo: string };
  /* true si el curso tiene una plantilla de constancia publicada. */
  constancia: boolean;
}

/* ---------- Inscripciones ----------
   GET   /api/me/inscripciones                 (mvz)   -> Enrollment[]
   POST  /api/me/inscripciones                 (mvz)   MyEnrollmentRequest -> 201 Enrollment
         Curso gratuito: queda "approved". Curso con precio: queda "pending" (no hay cobro; el equipo aprueba).
         409 si ya hay una inscripción aprobada o pendiente. 404 si el curso no existe o no es visible.
   GET   /api/admin/inscripciones?curso=&estado=&q=&rango=   (admin) -> AdminEnrollmentList
   POST  /api/admin/inscripciones              (admin) AdminEnrollRequest -> 201 { inscritas: Enrollment[] }  (quedan aprobadas)
   PATCH /api/admin/inscripciones/:id          (admin) EnrollmentStateRequest -> Enrollment
   POST  /api/admin/inscripciones/lote         (admin) EnrollmentBulkRequest -> { actualizadas: number }
   Cancelar quita el acceso al contenido; las constancias emitidas se conservan.
*/
export interface MyEnrollmentRequest {
  curso: string;
}

export interface AdminEnrollment extends Enrollment {
  correo: string;
  titulo: string;
}

export interface AdminEnrollmentList {
  items: AdminEnrollment[];
  conteo: Record<EnrollmentState, number>;
}

export interface AdminEnrollRequest {
  curso: string;
  /* Correos de alumnos registrados. */
  correos: string[];
}

export interface EnrollmentStateRequest {
  estado: EnrollmentState;
}

export interface EnrollmentBulkRequest {
  ids: number[];
  estado: EnrollmentState;
}

/* ---------- Progreso de lecciones ----------
   GET  /api/me/cursos                           (mvz) -> MyCoursesResponse
   GET  /api/me/cursos/:slug/progreso            (mvz) -> CourseProgress   (403 sin inscripción aprobada)
   POST /api/me/cursos/:slug/lecciones/:i/avance (mvz) LessonProgressRequest -> LessonProgressResult
        El reproductor reporta el porcentaje visto; la lección se completa sola al llegar a 100 (+puntos de la regla "leccion").
        No existe ninguna forma de marcarla a mano. 409 si la lección sigue bloqueada por fecha.
*/
export interface LessonProgressRequest {
  /* Porcentaje visto del video, 0-100. */
  pct: number;
}

export interface LessonState extends LessonInfo {
  hecha: boolean;
  /* Porcentaje máximo reportado por el reproductor. */
  visto: number;
}

export interface CourseProgress {
  slug: string;
  lecciones: LessonState[];
  modulos: CourseModule[];
  hechas: number;
  total: number;
  /* Índice de la siguiente lección pendiente y abierta; -1 si terminó todas. */
  siguiente: number;
  /* Avance del curso incluyendo el examen final. */
  pct: number;
  examen: ExamStatus;
  constancia: CertificateSummary | null;
}

export interface LessonProgressResult {
  completada: boolean;
  /* true solo la primera vez que se completa. */
  nueva: boolean;
  puntos: number;
  progreso: CourseProgress;
}

export type ExamState = "aprobado" | "sin_intentos" | "disponible" | "en_curso" | "programado" | "bloqueado";

export interface MyCourse {
  course: Course;
  hechas: number;
  total: number;
  pct: number;
  intentosUsados: number;
  /* null = sin límite. */
  intentosMax: number | null;
  notaFinal: number | null;
  examen: ExamState;
  /* Folio de la constancia, si ya se emitió. */
  constancia: string | null;
}

export interface MyCoursesResponse {
  cursos: MyCourse[];
  /* Inscripciones pendientes del médico. */
  solicitudes: Enrollment[];
}

/* ---------- Examen final ----------
   GET  /api/me/cursos/:slug/examen              (mvz) -> ExamStatus  (nunca incluye respuestas correctas)
   POST /api/me/cursos/:slug/examen/iniciar      (mvz) -> ExamSession
        Cuenta como intento desde que se inicia. Si ya hay una sesión abierta y vigente, devuelve la misma (mismas preguntas y
        mismo vencimiento). 409 si faltan lecciones, si el examen está programado, si ya se aprobó o si no quedan intentos.
   POST /api/me/cursos/:slug/examen/intentos     (mvz) ExamSubmitRequest -> ExamResult
        El servidor califica con gradeAnswers. Las preguntas sin responder cuentan como incorrectas.
        Tiempo límite: se aceptan envíos hasta EXAM_GRACE_SECONDS después del vencimiento; después responde 409 y el
        intento queda como no aprobado con calificación 0.0. El detalle de respuestas solo viene si el ajuste global
        "ocultar" está apagado.
   POST /api/me/cursos/:slug/examen/solicitudes  (mvz) -> 201 AttemptRequest  (solo con intentos agotados y sin aprobar)
*/
export const EXAM_GRACE_SECONDS = 15;

export interface ExamStatus {
  estado: ExamState;
  /* Explicación lista para mostrar. */
  motivo: string;
  config: ExamConfig;
  preguntas: number;
  intentosUsados: number;
  intentosMax: number | null;
  intentosRestantes: number | null;
  notaFinal: number | null;
  aprobado: boolean;
  /* Fecha ISO de apertura si el examen está programado. */
  abreEl: string;
  solicitud: AttemptRequestState | null;
  sesion: ExamSession | null;
}

export interface PublicQuestion {
  /* Índice de la pregunta dentro del examen; es la clave para responder. */
  i: number;
  t: QuestionType;
  q: string;
  o: string[];
}

export interface ExamSession {
  id: string;
  intento: number;
  intentosMax: number | null;
  layout: ExamLayout;
  preguntas: PublicQuestion[];
  /* ISO 8601. */
  iniciadaEn: string;
  /* ISO 8601; null = sin tiempo límite. */
  venceEn: string | null;
}

export interface ExamSubmitRequest {
  sesion: string;
  respuestas: { i: number; v: number[] }[];
}

export interface AttemptView {
  n: number;
  nota: number;
  ok: boolean;
  /* Segundos usados. */
  t: number;
  f: string;
}

export interface AnswerDetail {
  i: number;
  q: string;
  elegidas: string[];
  correctas: string[];
  ok: boolean;
}

export interface ExamResult {
  intento: AttemptView;
  aprobatoria: number;
  notaFinal: number;
  calculo: GradeCalc;
  intentosRestantes: number | null;
  /* Constancia emitida en este envío (lecciones completas + examen aprobado). */
  constancia: CertificateSummary | null;
  puntos: number;
  detalle: AnswerDetail[] | null;
}

/* ---------- Constancias ----------
   GET /api/me/constancias            (mvz)     -> CertificateSummary[]
   GET /api/me/constancias/:folio     (mvz)     -> CertificateDocument | 404
   GET /api/constancias/:folio        (público) -> CertificateVerification | 404; 400 si el folio no tiene formato KI-AAAA-NNNNNN
*/
export const FOLIO_RE = /^KI-\d{4}-\d{6}$/;

export type CertificateSummary = Omit<Certificate, "u" | "plantilla">;

export interface CertificateDocument {
  constancia: CertificateSummary;
  plantilla: CertTemplate | null;
  /* Imagen base de la plantilla (data URL) o null para el diseño por defecto. */
  imagen: string | null;
  datos: { nombre: string; curso: string; fecha: string; folio: string };
}

export interface CertificateVerification {
  folio: string;
  titulo: string;
  tipo: CertificateKind;
  fecha: string;
  /* Nombre abreviado del titular, p. ej. "L. Méndez". */
  titular: string;
}

/* ---------- Webinars ----------
   GET  /api/webinars                        (público) -> WebinarSummary[]   (publicados; incluye "proximo")
   GET  /api/webinars/:slug                  (público) -> WebinarSummary | 404
   GET  /api/me/webinars/:slug               (mvz)     -> MyWebinarStatus
   POST /api/me/webinars/:slug/registro      (mvz)     -> MyWebinarStatus   (idempotente)
   POST /api/me/webinars/:slug/asistencia    (mvz)     -> MyWebinarStatus   (+puntos de la regla "webinar" y constancia la primera vez)
   GET  /api/admin/webinars                  (admin)   -> AdminWebinarList
   POST /api/admin/webinars                  (admin)   WebinarCreateRequest -> 201 AdminWebinar
   GET  /api/admin/webinars/:slug/asistentes (admin)   -> string[]
*/
export interface MyWebinarStatus {
  slug: string;
  registrado: boolean;
  asistio: boolean;
  /* Enlace de YouTube (modo respaldo), solo para médicos con sesión. */
  youtube: string | null;
  /* Puntos sumados en esta llamada. */
  puntos: number;
  constancia: CertificateSummary | null;
}

export interface WebinarCreateRequest {
  titulo: string;
  tituloEn: string;
  subtitulo?: string;
  subtituloEn?: string;
  grado: string;
  ponente: string;
  /* AAAA-MM-DD */
  fecha: string;
  /* HH:MM, centro de México. */
  hora: string;
  duracion: 60 | 90 | 120;
  umbral: number;
  slug: string;
  modo: WebinarMode;
  youtube?: string;
  publicado: boolean;
  /* Data URL JPG, PNG o WebP de hasta 2 MB. */
  flyer?: string | null;
}

export interface AdminWebinar extends WebinarSummary {
  /* Datos para el ponente (Zoom -> transmisión personalizada). Solo los ve el equipo. */
  servidor: string;
  clave: string;
  youtube: string;
  landing: string;
}

export interface WebinarHistoryRow {
  slug: string | null;
  titulo: string;
  fecha: string;
  estado: "Próximo" | "Concluido";
  registrados: number;
  asistentes: number | null;
}

export interface AdminWebinarList {
  nuevos: AdminWebinar[];
  historial: WebinarHistoryRow[];
}

/* ---------- Club MVZ ----------
   GET    /api/club/reglas                 (público) -> ClubRule[]
   GET    /api/club/premios                (público) -> ClubReward[]
   GET    /api/me/puntos                   (mvz)     -> PointsBalance
   POST   /api/me/canjes                   (mvz)     RedeemRequest -> 201 RedeemResult   (409 sin puntos suficientes o ya canjeado)
   PUT    /api/admin/club/reglas/:id       (admin)   RuleUpdateRequest -> ClubRule
   POST   /api/admin/club/premios          (admin)   RewardCreateRequest -> 201 ClubReward
   DELETE /api/admin/club/premios/:id      (admin)   -> 204
*/
export interface PointsMovement {
  f: string;
  concepto: string;
  puntos: number;
}

export interface PointsBalance {
  saldo: number;
  canjeados: string[];
  movimientos: PointsMovement[];
}

export interface RedeemRequest {
  premio: string;
}

export interface RedeemResult {
  saldo: number;
  premio: ClubReward;
  /* Inscripción creada si el premio es un curso. */
  inscripcion: Enrollment | null;
}

export interface RuleUpdateRequest {
  puntos: number;
}

export interface RewardCreateRequest {
  nombre: string;
  puntos: number;
}

/* ---------- Médicos ----------
   GET  /api/admin/medicos/verificaciones               (admin) -> CedulaVerification[]
   POST /api/admin/medicos/verificaciones/:id/aprobar   (admin) -> CedulaVerification   (+puntos de la regla "cedula"; 409 si ya)
*/
export type CedulaList = CedulaVerification[];

/* ---------- Páginas ----------
   GET   /api/admin/paginas               (admin) -> SitePage[]
   POST  /api/admin/paginas               (admin) PageCreateRequest -> 201 SitePage (borrador)
   PATCH /api/admin/paginas/:id           (admin) PageUpdateRequest -> SitePage
   POST  /api/admin/paginas/:id/publicar  (admin) -> SitePage
*/
export type PageList = SitePage[];

export interface PageCreateRequest {
  titulo: string;
  url: string;
  bloques?: string[];
}

export interface PageUpdateRequest {
  titulo?: string;
  url?: string;
  bloques?: string[];
  seo?: { titulo: string; descripcion: string; idioma: Lang };
}

/* ---------- Administración de cursos ----------
   GET   /api/admin/cursos?estado=&cat=&q=&rango=  (admin) -> AdminCourseList  (catálogo + editor)
   PATCH /api/admin/cursos/:slug                    (admin) CourseStateRequest -> AdminCourseRow
   POST  /api/admin/cursos/lote                     (admin) CourseBulkRequest -> { actualizados, omitidos }
         Los cursos del editor con pendientes no se publican (cuentan en "omitidos").
   GET   /api/admin/cursos/:slug/vista              (admin) -> CourseDetail con temario (403 si el ajuste adminSinInsc está apagado)
   GET   /api/admin/cursos/:slug/examen             (admin) -> ExamConfig
   PUT   /api/admin/cursos/:slug/examen             (admin) ExamConfig -> ExamConfig   (aplica desde el siguiente intento)
*/
export type CourseStateFilter = CourseState | "todos";

export interface AdminCourseRow {
  /* "s:<slug>" catálogo, "n:<id>" editor. */
  key: string;
  slug: string;
  titulo: string;
  autor: string;
  cat: string;
  temas: number;
  lecciones: number;
  regular: number;
  oferta: number;
  fecha: string;
  estado: CourseState;
  /* Fecha ISO de publicación programada. */
  fechaProg: string;
  nuevo: boolean;
}

export interface AdminCourseList {
  items: AdminCourseRow[];
  conteo: Record<CourseStateFilter, number>;
}

export interface CourseStateRequest {
  estado: CourseState;
  /* AAAA-MM-DD, obligatoria y futura si estado = "programado". */
  fecha?: string;
}

export interface CourseBulkRequest {
  claves: string[];
  estado: CourseState;
}

/* ---------- Academia (admin) ----------
   GET   /api/admin/academia/ajustes                         -> AcademySettings
   PATCH /api/admin/academia/ajustes                         SettingsUpdateRequest -> AcademySettings
   GET   /api/admin/academia/examenes                        -> ExamConfigRow[]
   GET   /api/admin/academia/solicitudes                     -> AttemptRequestRow[]
   POST  /api/admin/academia/solicitudes/:id                 { accion: "autorizar" | "rechazar" } -> AttemptRequestRow
   GET   /api/admin/academia/intentos?curso=&q=&rango=       -> AttemptRow[]
   GET   /api/admin/academia/intentos/:id                    -> AttemptDetail  (detalle con respuestas: solo administración)
   GET   /api/admin/academia/calificaciones?curso=           -> GradebookRow[]
   GET   /api/admin/academia/calificaciones/historial?alumno=&curso= -> HistoryEvent[]
   GET   /api/admin/academia/alumnos?curso=&rango=&orden=&q= -> StudentRow[]
   POST  /api/admin/academia/alumnos/importar                ImportRequest -> ImportResult
   GET   /api/admin/academia/grupos                          -> Group[]
   POST  /api/admin/academia/grupos                          { nombre } -> 201 Group
   GET   /api/admin/academia/grupos/:id                      -> GroupDetail
   PATCH /api/admin/academia/grupos/:id                      GroupUpdateRequest -> Group
   GET   /api/admin/academia/banco                           -> BankQuestion[]
   POST  /api/admin/academia/banco                           BankQuestionCreateRequest -> 201 BankQuestion
   GET   /api/admin/academia/automatizaciones                -> Automation[]
   PATCH /api/admin/academia/automatizaciones/:id            AutomationUpdateRequest -> Automation
   GET   /api/admin/academia/reportes                        -> AcademyReport
   GET   /api/admin/academia/reportes/:tipo                  -> text/csv con BOM (tipo: ReportKind)
   GET   /api/admin/tablero                                  -> Dashboard (cifras de ejemplo)
*/
export type SettingsUpdateRequest = Partial<AcademySettings>;

export interface ExamConfigRow {
  slug: string;
  titulo: string;
  config: ExamConfig;
}

export interface AttemptRequestRow extends AttemptRequest {
  titulo: string;
}

export interface AttemptRow {
  id: number;
  u: string;
  s: string;
  titulo: string;
  n: number;
  f: string;
  nota: number;
  ok: boolean;
  t: number;
  /* true si el intento se registró en la nueva academia y tiene respuestas guardadas. */
  conDetalle: boolean;
}

export interface AttemptDetail extends AttemptRow {
  respuestas: AnswerDetail[];
}

export type GradebookState = "Aprobado" | "Inactivo" | "Sin intentos" | "En curso";

export interface GradebookRow {
  u: string;
  correo: string;
  s: string;
  titulo: string;
  avance: number;
  nota: number | null;
  intentosUsados: number;
  intentosMax: number | null;
  ultimoAcceso: string;
  estado: GradebookState;
}

export interface HistoryEvent {
  icono: string;
  texto: string;
}

export interface StudentRow extends Student {
  cursos: number;
}

export type StudentOrder = "recientes" | "nombre" | "cursos";

export interface ImportRequest {
  grupo?: number;
  alumnos: { nombre: string; correo: string }[];
}

export interface ImportResult {
  agregados: number;
  repetidos: number;
}

export interface GroupDetail extends Group {
  alumnos: { u: string; s: string; titulo: string; avance: number }[];
}

export interface GroupUpdateRequest {
  curso: string;
  /* AAAA-MM-DD */
  vence: string;
}

export interface BankQuestionCreateRequest {
  texto: string;
  tipo: EditorQuestionType;
  tema: string;
}

export type BankList = BankQuestion[];

export interface AutomationUpdateRequest {
  activa?: boolean;
  correo?: boolean;
  panel?: boolean;
}

export type AutomationList = Automation[];

export interface CourseReportRow {
  slug: string;
  titulo: string;
  inscritas: number;
  terminaron: number;
  tasa: number;
  promedio: number | null;
  constancias: number;
}

export interface AcademyReport {
  kpis: {
    tasaFinalizacion: number;
    calificacionPromedio: number | null;
    activos: number;
    inactivos: number;
    constancias: number;
  };
  /* Inscripciones registradas por mes del año en curso. mes = "01".."12". */
  inscripcionesPorMes: { mes: string; total: number }[];
  promedioPorExamen: { slug: string; titulo: string; intentos: number; promedio: number }[];
  porCurso: CourseReportRow[];
}

export type ReportKind = "alumno" | "curso" | "instructor" | "avance" | "inactividad";

export interface Dashboard {
  ejemplo: true;
  kpis: { nombre: string; valor: string; tendencia: string }[];
  asistentesPorMes: { mes: string; asistentes: number }[];
  cedulasPendientes: number;
  inscripcionesPendientes: number;
}

/* ---------- Plantillas de constancia (admin) ----------
   GET    /api/admin/academia/plantillas              -> CertTemplateSummary[]
   POST   /api/admin/academia/plantillas              { nombre? } -> 201 CertTemplateSummary (borrador)
   GET    /api/admin/academia/plantillas/:id          -> CertTemplateDetail
   PATCH  /api/admin/academia/plantillas/:id          CertTemplateUpdateRequest -> CertTemplateSummary
          Asociar un curso lo quita de las demás plantillas: cada curso usa una sola plantilla.
   PUT    /api/admin/academia/plantillas/:id/imagen   { imagen } (data URL JPG o PNG, hasta 3 MB) -> CertTemplateSummary
   DELETE /api/admin/academia/plantillas/:id/imagen   -> CertTemplateSummary
   Las constancias ya emitidas no cambian: los cambios aplican a las nuevas.
*/
export interface CertTemplateSummary extends CertTemplate {
  tieneImagen: boolean;
}

export interface CertTemplateDetail extends CertTemplate {
  imagen: string | null;
}

export interface CertTemplateUpdateRequest {
  nombre?: string;
  estado?: CertTemplate["estado"];
  cursos?: string[];
  vars?: Partial<Record<CertVarKey, Partial<CertVar>>>;
}

/* ---------- Editor de cursos nuevos (admin) ----------
   GET    /api/admin/editor/cursos                                   -> EditorCourse[]
   POST   /api/admin/editor/cursos                                   EditorCourseCreateRequest -> 201 EditorCourseDetail (borrador)
   GET    /api/admin/editor/cursos/:id                               -> EditorCourseDetail
   PATCH  /api/admin/editor/cursos/:id                               EditorCourseUpdateRequest -> EditorCourseDetail
          Si se pide "publicado" o "programado" y hay pendientes, se guardan los datos y el curso queda en borrador.
   POST   /api/admin/editor/cursos/:id/publicar                      -> EditorCourseDetail | 409 { error, pendientes }
   POST   /api/admin/editor/cursos/:id/modulos                       { nombre? } -> 201 EditorCourseDetail
   PATCH  /api/admin/editor/cursos/:id/modulos/:mi                   { nombre } -> EditorCourseDetail
   POST   /api/admin/editor/cursos/:id/modulos/:mi/lecciones         { titulo? } -> 201 EditorCourseDetail
   PATCH  /api/admin/editor/cursos/:id/modulos/:mi/lecciones/:li     EditorLessonUpdateRequest -> EditorCourseDetail
   DELETE /api/admin/editor/cursos/:id/modulos/:mi/lecciones/:li     -> EditorCourseDetail
   POST   /api/admin/editor/cursos/:id/modulos/:mi/lecciones/:li/mover       { dir: -1 | 1 } -> EditorCourseDetail
   POST   /api/admin/editor/cursos/:id/modulos/:mi/lecciones/:li/adjuntos    { nombre, tam } -> 201 EditorCourseDetail
   DELETE /api/admin/editor/cursos/:id/modulos/:mi/lecciones/:li/adjuntos/:k -> EditorCourseDetail
   PATCH  /api/admin/editor/cursos/:id/examen                        EditorExamUpdateRequest -> EditorCourseDetail
   POST   /api/admin/editor/cursos/:id/examen/preguntas              { tipo } -> 201 EditorCourseDetail
   PUT    /api/admin/editor/cursos/:id/examen/preguntas/:qi          EditorQuestion -> EditorCourseDetail
   DELETE /api/admin/editor/cursos/:id/examen/preguntas/:qi          -> EditorCourseDetail
   POST   /api/admin/editor/cursos/:id/examen/banco                  { ids } -> EditorCourseDetail
   POST   /api/admin/editor/cursos/:id/examen/importar               ExamExport -> EditorCourseDetail
   GET    /api/admin/editor/cursos/:id/examen/exportar               -> ExamExport
*/
export interface EditorCourseDetail {
  curso: EditorCourse;
  pendientes: string[];
}

export interface EditorCourseCreateRequest {
  titulo: string;
  tituloEn: string;
  tipo: CourseKind;
  categoria: string;
  instructor: string;
  nivel: string;
  precioRegular: number;
  precio: number;
  modulos: { nombre: string; lecciones: number }[];
  /* Data URL JPG, PNG o WebP de hasta 2 MB. */
  portada?: string | null;
}

export interface EditorCourseUpdateRequest {
  titulo?: string;
  tituloEn?: string;
  descripcion?: string;
  tipo?: CourseKind;
  categoria?: string;
  nivel?: string;
  instructor?: string;
  precioRegular?: number;
  precio?: number;
  estado?: CourseState;
  fechaProg?: string;
  portada?: string | null;
}

export interface EditorLessonUpdateRequest {
  titulo?: string;
  /* URL de embed de Bunny o "librería/ID". */
  video?: string;
  dur?: string;
  desbloqueo?: string;
}

export type EditorExamUpdateRequest = Partial<ExamConfig> & { titulo?: string };

export interface ExamExport {
  formato: "kiron-examen";
  version: 1;
  titulo: string;
  ajustes: ExamConfig;
  preguntas: EditorQuestion[];
}
