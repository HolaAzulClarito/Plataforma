/* Textos nuevos de la versión React (no existían en el demo v2.4.1) y correcciones acordadas.
   Las llaves de aquí ganan sobre en.ts. Agrega aquí cada texto fijo nuevo en español con su traducción. */
export const I18N_EXTRA: Readonly<Record<string, string>> = {
  // Iguales en ambos idiomas (se declaran para que el test de faltantes no los marque)
  "Webinars": "Webinars",
  "Laboratorios Kirón México": "Laboratorios Kirón México",
  "© 2026 Laboratorios Kirón México": "© 2026 Laboratorios Kirón México",
  "WhatsApp": "WhatsApp",
  "MVZ": "DVM",
  "PMVZ": "PMVZ",
  "EMVZ": "EMVZ",

  // Demo bar y encabezado (antes vivían en la tabla T de app.js con HTML)
  "Prototipo navegable · Azul Clarito.": "Clickable prototype · Azul Clarito.",
  "Productos, cursos, webinar y representantes vienen de kironmexico.com; médicos, alumnos y puntos son de ejemplo.":
    "Products, courses, webinar and sales reps come from kironmexico.com; vets, students and points are sample data.",
  "Cuidando la salud de": "Caring for the health of",
  "tu mejor amigo": "your best friend",
  "Productos veterinarios innovadores y educación continua para el médico veterinario, en un solo lugar.":
    "Innovative veterinary products and continuing education for veterinarians, all in one place.",
  "Busca por producto o clasificación": "Search by product or category",
  "Diplomados y Cursos": "Diplomas and courses",
  "Versión en español": "Versión en español",
  "Versión en inglés": "English version",
  "Menú principal": "Main menu",
  "Cerrar menú": "Close menu",

  // Webinar concluido (corrección 3)
  "Webinar concluido": "Webinar ended",
  "Webinar concluido · ver grabaciones": "Webinar ended · see recordings",
  "Este webinar ya se transmitió. Las grabaciones están disponibles para médicos registrados.":
    "This webinar has already aired. Recordings are available to registered vets.",
  "Ver grabaciones": "See recordings",
  "En vivo": "Live",

  // Mock del panel en el inicio (corrección 2: sin cifras fijas)
  "Tu saldo": "Your balance",
  "Tu avance": "Your progress",
  "Con folio y QR": "With number and QR",
  "Cursos en curso": "Courses in progress",

  // Precios (corrección 1)
  "IVA por confirmar": "VAT to be confirmed",
  "IVA incluido": "VAT included",
  "+ IVA": "+ VAT",

  // Estados de carga y error de la API
  "Cargando…": "Loading…",
  "No pudimos cargar esta información.": "We couldn't load this information.",
  "Reintentar": "Retry",
  "En migración": "Being migrated",
  "Esta sección se está migrando a la nueva plataforma. Mientras tanto, puedes volver al inicio.":
    "This section is being migrated to the new platform. In the meantime, you can go back home.",
  "Ir al inicio": "Go home",

  // Asistente (corrección del texto de exámenes; el resto de respuestas ya es bilingüe en el código)
  "Asistente de la Academia": "Academy assistant",
  "¿Dudas?": "Questions?",
  "Tu pregunta": "Your question",
  "Escribe tu pregunta": "Type your question",

  // Sitio público: piezas que en el demo iban unidas a datos
  "Buenas tardes": "Good afternoon",
  "Cuenta regresiva": "Countdown",
  "para": "for",
  "en": "in",
  "y": "and",
  "lecciones": "lessons",
  "limpia los filtros": "clear the filters",
  "Limpiar búsqueda": "Clear search",
  "No encontramos productos con ese criterio. Prueba con otro nombre o": "We couldn't find products matching that. Try another name or",
  "México, Centroamérica, Sudamérica, Medio Oriente y África occidental.": "Mexico, Central America, South America, the Middle East and West Africa.",
  "Kirón": "Kirón",
  "Guatemala": "Guatemala",
  "Honduras": "Honduras",
  "Nicaragua": "Nicaragua",
  "Costa Rica": "Costa Rica",
  "Supervisor": "Supervisor",
  "Videos": "Videos",
  "min": "min",
  "ENERO": "JANUARY", "FEBRERO": "FEBRUARY", "MARZO": "MARCH", "ABRIL": "APRIL", "MAYO": "MAY", "JUNIO": "JUNE",
  "JULIO": "JULY", "AGOSTO": "AUGUST", "SEPTIEMBRE": "SEPTEMBER", "OCTUBRE": "OCTOBER", "NOVIEMBRE": "NOVEMBER", "DICIEMBRE": "DECEMBER",
  "Lunes": "Monday", "Miércoles": "Wednesday", "Jueves": "Thursday", "Viernes": "Friday", "Sábado": "Saturday", "Domingo": "Sunday",
};

/* Reglas nuevas con expresión regular (se prueban antes que las del demo). */
export const I18N_EXTRA_RX: ReadonlyArray<readonly [string, string]> = [
  ["^Presencia en (\\d+) países$", "Presence in $1 countries"],
  ["^(\\d+) de (\\d+)$", "$1 of $2"],
];
