/* Preguntas frecuentes del asistente (BOT y BOTQ del demo), bilingües.
   Corrección ADR-005: no hay examen por módulo; cada curso cierra con un solo examen final. */
import { normalize, type Lang } from "@kiron/shared";

export interface FaqEntry {
  keys: readonly string[];
  es: string;
  en: string;
}

export const FAQ: readonly FaqEntry[] = [
  {
    keys: ["intento", "examen", "reprob", "attempt", "exam", "fail", "retake"],
    es: "Cada curso cierra con un examen final. El examen tiene un número de intentos y un tiempo límite que define la academia. Si agotas tus intentos, desde el mismo examen puedes pedir uno adicional; lo autoriza la administración y te avisamos por correo.",
    en: "Each course ends with a final exam. The exam has a set number of attempts and a time limit defined by the academy. If you use them all, you can request an extra attempt from the exam itself; the admin team approves it and we let you know by email.",
  },
  {
    keys: ["inscrib", "registr", "enroll", "sign up", "join"],
    es: "Para inscribirte a un curso entra a Academia, elige el curso y toca Inscribirme. Los cursos gratuitos se activan al momento; en los que tienen costo, el equipo de Academia te contacta para confirmar tu inscripción.",
    en: "To enroll, go to Academy, pick a course and tap Enroll. Free courses unlock right away; for paid courses the Academy team contacts you to confirm your enrollment.",
  },
  {
    keys: ["constancia", "certific", "qr", "folio"],
    es: "Sí. Al aprobar el examen final se emite tu constancia con folio y código QR. Cualquiera puede verificarla en la página Verificar constancia.",
    en: "Yes. When you pass the final exam you get a certificate with a number and a QR code. Anyone can check it on the Verify certificate page.",
  },
  {
    keys: ["webinar", "zoom", "en vivo", "live", "entrar"],
    es: "Regístrate al webinar con tu cuenta. El día de la transmisión aparece el botón Entrar en tu panel y lo ves dentro del sitio, sin instalar Zoom. Tu asistencia se registra sola.",
    en: "Register for the webinar with your account. On the day, a Join button shows up in your dashboard and you watch it right on the site, no Zoom install needed. Your attendance is logged automatically.",
  },
  {
    keys: ["punto", "club", "canje", "point", "reward", "redeem"],
    es: "Sumas puntos al verificar tu cédula, asistir a webinars, completar lecciones y terminar cursos. Los canjeas en Club MVZ por cursos y promociones.",
    en: "You earn points by verifying your license, attending webinars, completing lessons and finishing courses. Redeem them in the Vet Club for courses and promotions.",
  },
  {
    keys: ["cédula", "cedula", "license", "verific"],
    es: "Al crear tu cuenta te pedimos tu cédula profesional. El equipo de Kirón la valida en la consulta pública de la SEP y te suma 200 puntos.",
    en: "When you create your account we ask for your professional license. The Kirón team checks it against the public SEP registry and adds 200 points.",
  },
  {
    keys: ["precio", "costo", "pago", "price", "cost", "pay"],
    es: "Los precios están en cada curso. El sitio no cobra en línea: el equipo de Academia te contacta para confirmar tu inscripción.",
    en: "Prices are shown on each course. The site doesn't take online payments: the Academy team contacts you to confirm your enrollment.",
  },
];

export const FAQ_SUGGESTIONS: Record<Lang, readonly string[]> = {
  es: ["¿Cómo me inscribo a un curso?", "¿Los cursos tienen constancia?", "¿Cómo entro al webinar?", "¿Cómo gano puntos?", "¿Qué pasa si repruebo el examen?"],
  en: ["How do I enroll in a course?", "Do courses include a certificate?", "How do I join the webinar?", "How do I earn points?", "What if I fail the exam?"],
};

export const FAQ_GREETING: Record<Lang, string> = {
  es: "Hola, soy el asistente de la Academia. ¿En qué te ayudo?",
  en: "Hi, I'm the Academy assistant. How can I help you?",
};

const FALLBACK: Record<Lang, string> = {
  es: "Aún no tengo esa respuesta. Deja tu pregunta y el equipo de Academia te responde por correo.",
  en: "I don't have that answer yet. Leave your question and the Academy team will reply by email.",
};

/* Primera respuesta cuya palabra clave aparece en la pregunta (sin acentos ni mayúsculas). */
export function answer(question: string, lang: Lang): string {
  const n = normalize(question);
  const hit = FAQ.find((r) => r.keys.some((k) => n.includes(normalize(k))));
  return hit ? hit[lang] : FALLBACK[lang];
}
