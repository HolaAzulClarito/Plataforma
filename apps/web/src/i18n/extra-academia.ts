/* Textos nuevos de academia, panel del médico y webinars (versión React con API). Ganan sobre en.ts y extra.ts.
   Diccionario exacto y reglas con expresión regular (texto en español -> inglés). */
/* Motivos de "sin_intentos" por la regla de nota final (ADR-006); los arma la API con la etiqueta de la regla. */
function gradeRuleReasons(): Record<string, string> {
  const rules: [string, string][] = [
    ["Calificación más alta", "Highest grade"],
    ["Promedio de los intentos", "Average of attempts"],
    ["Primer intento", "First attempt"],
    ["Último intento", "Last attempt"],
  ];
  return Object.fromEntries(
    rules.flatMap(([es, en]) => [
      [`Con la regla "${es}", tu calificación final ya no puede llegar a la aprobatoria.`, `With the "${en}" rule, your final grade can no longer reach the passing grade.`],
      [
        `Con la regla "${es}", los intentos que te quedan no alcanzan la aprobatoria. La administración puede autorizar un intento adicional.`,
        `With the "${en}" rule, your remaining attempts can't reach the passing grade. The admin team can approve an extra attempt.`,
      ],
    ]),
  );
}

export const I18N_EXTRA_ACADEMIA: Readonly<Record<string, string>> = {
  // Academia y landing del curso
  "Secciones de la academia": "Academy sections",
  "Inscripción confirmada": "Enrollment confirmed",
  "Inscribirme de nuevo": "Enroll again",
  "El temario completo se muestra al iniciar sesión o al inscribirte.": "The full syllabus is shown when you sign in or enroll.",
  "Todavía no hay calificaciones": "No ratings yet",
  "Este curso no está disponible": "This course is not available",
  "No pudimos inscribirte": "We couldn't enroll you",

  // Vista del curso y examen final
  "completada": "completed",
  "Avance del video": "Video progress",
  "Continuar examen final": "Continue final exam",
  "Terminaste las lecciones, pero sin aprobar el examen no se emite la constancia. Para presentar otra vez, la administración tiene que autorizar un intento adicional.":
    "You finished the lessons, but no certificate is issued without passing the exam. To take it again, the admin team has to approve an extra attempt.",
  "Tu solicitud anterior fue rechazada. Puedes enviar otra.": "Your previous request was declined. You can send another one.",
  "El intento cuenta desde que lo inicias.": "The attempt counts from the moment you start it.",
  "Si se acaba el tiempo, tus respuestas se envían solas.": "If time runs out, your answers are submitted automatically.",
  "La constancia se emite al terminar todas las lecciones y aprobar el examen final.": "The certificate is issued when you finish all lessons and pass the final exam.",
  "Iniciar examen": "Start exam",
  "Se acabó el tiempo. Enviamos tus respuestas.": "Time is up. We submitted your answers.",
  "Tiempo restante": "Time left",
  "Correcta:": "Correct:",
  "No pudimos guardar tu avance": "We couldn't save your progress",
  "No pudimos enviar la solicitud": "We couldn't send the request",
  "No pudimos iniciar el examen": "We couldn't start the exam",
  "No pudimos enviar tus respuestas": "We couldn't submit your answers",
  "No pudimos abrir la constancia": "We couldn't open the certificate",
  "Tu calificación final ya quedó definida": "Your final grade is already settled",
  "Sin aprobar el examen final no se emite la constancia.": "No certificate is issued without passing the final exam.",
  "El examen final todavía no tiene preguntas": "The final exam has no questions yet",
  "Vista de administrador: el examen final se revisa desde el editor del curso": "Admin view: the final exam is reviewed from the course editor",
  ...gradeRuleReasons(),

  // Verificación
  "Verificando…": "Verifying…",
  "emitida el": "issued on",
  "a nombre de": "to",
  "No pudimos verificar el folio en este momento.": "We couldn't verify the number right now.",

  // Panel del médico
  "Club": "Club",
  "(México)": "(Mexico)",
  "Ver la página del webinar": "See the webinar page",
  "No tienes cursos en curso.": "You have no courses in progress.",
  "Explora la academia": "Explore the academy",
  "Enviada el": "Sent on",
  "Todavía no tienes cursos.": "You don't have any courses yet.",
  "Ves la calificación final del examen de cada curso. La constancia se emite solo con todas las lecciones terminadas y el examen final aprobado.":
    "You see the final exam grade for each course. The certificate is issued only when all lessons are finished and the final exam is passed.",
  "Todavía no tienes constancias.": "You don't have any certificates yet.",
  "Todavía no está disponible: no se suben archivos ni se suman puntos en esta versión.": "Not available yet: no files are uploaded and no points are added in this version.",
  "No pudimos hacer el canje": "We couldn't complete the redemption",

  // Webinars
  "Vista del equipo Kirón": "Kirón team view",
  "El registro, la sala en vivo y la asistencia son para médicos. Inicia sesión como médico para probarlos.":
    "Registration, the live room and attendance are for vets. Sign in as a vet to try them.",
  "Hrs (centro de México)": "Hrs (central Mexico time)",
  "No pudimos registrar tu asistencia": "We couldn't log your attendance",
  "No pudimos registrarte al webinar": "We couldn't register you for the webinar",
};

export const I18N_EXTRA_ACADEMIA_RX: ReadonlyArray<readonly [string, string]> = [
  ["^Usaste (\\d+) de (\\d+) intentos\\.$", "You used $1 of $2 attempts."],
  ["^(\\d+) minutos$", "$1 minutes"],
  ["^Quedan (\\d+) minutos$", "$1 minutes left"],
  ["^Quedan (\\d+) segundos$", "$1 seconds left"],
  ["^(\\d+) de (\\d+) respondidas$", "$1 of $2 answered"],
  ["^(\\d+) lecciones en video y un examen final de (\\d+) preguntas \\(mínimo (\\d+) %\\)\\.$", "$1 video lessons and a final exam with $2 questions (minimum $3%)."],
  ["^Te quedarán ([\\d,]+)\\.$", "You'll have $1 left."],
  ["^Simular (\\d+) minutos vistos$", "Simulate $1 minutes watched"],
  ["^Constancia de asistencia y \\+(\\d+) puntos Club MVZ al ver al menos (\\d+) minutos en vivo$", "Attendance certificate and +$1 Vet Club points when you watch at least $2 minutes live"],
];
