/* Enlaces y menús fijos del sitio (LINKS, AC_TABS y VT_TABS del demo). */

export const LINKS = {
  fb: "https://www.facebook.com/kiron.laboratoriosoficial",
  ig: "https://www.instagram.com/laboratorioskironmexico/",
  yt: "https://www.youtube.com/channel/UCfU6J7bw_hjd8xcke5NGZlQ",
  li: "https://www.linkedin.com/company/68292601/",
  wa: "https://wa.me/525543705139?text=" + encodeURIComponent("Hola, me pongo en contacto desde la página de Kirón"),
  tel: "tel:+525551127743",
  telLabel: "55 5112 7743",
  mailDist: "esantiago@kironmexico.com",
} as const;

/* Pestañas de la academia: [tab, etiqueta en español]. */
export const AC_TABS = [
  ["cursos", "Cursos"],
  ["diplomados", "Diplomados"],
  ["webinars", "Webinars"],
] as const;

/* Pestañas de la videoteca: [tab, etiqueta, ruta]. */
export const VT_TABS = [
  ["productos", "Productos", "/videoteca"],
  ["tutoriales", "Tutoriales", "/videoteca?tab=tutoriales"],
  ["recetas", "Recetas cuantificadas", "/recetas-cuantificadas"],
] as const;

/* Folio de ejemplo para "Verificar constancia". */
export const SAMPLE_FOLIO = "KI-2026-001234";
