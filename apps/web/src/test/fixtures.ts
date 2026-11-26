/* Datos de prueba con la forma del contrato (CatalogResponses). Nombres y cifras de ejemplo. */
import type { CatalogResponses, Course, NextWebinar, Product } from "@kiron/shared";

export const PRODUCTS: Product[] = [
  { name: "KirOftal Gotas", slug: "kiroftal", cat: "Oftálmicos", img: "/img/p1.png", featured: true, isNew: true, active: "Ciclosporina", reg: "Q-0000-001", species: ["Perros", "Gatos"], pres: "Frasco 10 ml", desc: "Descripción de ejemplo." },
  { name: "Vibix Oftálmico", slug: "vibix", cat: "Oftálmicos", img: "/img/p2.png" },
  { name: "Kir-Anthel Max", slug: "kir-anthel", cat: "Endoparasiticidas", img: "/img/p3.png", featured: true, indications: ["Nematodos"] },
  { name: "SpiroCard Duo 10", slug: "spirocard-duo-10", cat: "Cardiológicos", img: "/img/p4-300x300.png", isNew: true },
  { name: "Antiséptico Kirón", slug: "antiseptico", cat: "Antisépticos", img: "/img/p5.png" },
];

export const CATEGORIES = ["Antisépticos", "Cardiológicos", "Endoparasiticidas", "Oftálmicos"];

export const COURSES: Course[] = [
  { slug: "oftalmologia", title: "Bloque 1 · Oftalmología y otitis", cat: "Diplomado Integral", lessons: 32, rating: 4.9, reviews: 131, price: 2999, was: 4999, tone: "a" },
  { slug: "odontologia", title: "Temas selectos de odontología", cat: "Odontología", lessons: 17, rating: 4.8, reviews: 132, price: 0, tone: "c" },
];

export const webinarAt = (startsAt: string): NextWebinar => ({
  date: startsAt.slice(0, 10),
  startsAt,
  dow: "Martes",
  day: startsAt.slice(8, 10),
  month: "DICIEMBRE",
  year: startsAt.slice(0, 4),
  time: "20:00 Hrs",
  title: "¿Antojo, hábito o problema?",
  sub: "El misterio detrás de la coprofagia",
  deg: "MVZ",
  speaker: "Ponente de ejemplo",
  img: "",
});

export const FUTURE_WEBINAR = webinarAt("2099-12-15T20:00:00-06:00");
export const PAST_WEBINAR = webinarAt("2020-12-15T20:00:00-06:00");

export const CATALOG: Record<string, unknown> = {
  "/api/productos": PRODUCTS,
  "/api/categorias": CATEGORIES,
  "/api/cursos": COURSES,
  "/api/webinars/proximo": FUTURE_WEBINAR,
  "/api/paises": { activos: ["México", "Guatemala", "Panamá"], proximamente: ["Ecuador", "Perú"] } satisfies CatalogResponses["paises"],
  "/api/representantes": {
    zonas: [{ zone: "Centro", states: "Nuevo León, Baja California, Baja California Sur y Chihuahua", people: [["Persona Ejemplo", "Promotor", "pejemplo", "55 0000 0000"]] }],
    nacionales: [["Contacto Ejemplo", "Asesor Técnico", "cejemplo", "55 1111 1111"]],
  } satisfies CatalogResponses["representantes"],
  "/api/videos": [["Laboratorios Kirón · Institucional", "7cYE999nfe8", "Institucional"], ["KirOftal", "YrtcAmcas80"]] satisfies CatalogResponses["videos"],
  "/api/productos/kiroftal": { product: PRODUCTS[0]!, related: [PRODUCTS[1]!] } satisfies CatalogResponses["producto"],
};
