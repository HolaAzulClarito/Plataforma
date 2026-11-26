/* Todos los textos fijos del administrador tienen traducción al inglés (pantallas y modales principales). */
import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AdminWebinarList, AutomationList, CertTemplateDetail, GradebookRow, Group, StudentRow, AttemptRow, AcademyReport, ExamConfigRow, PageList } from "@kiron/shared";
import { EXAM_DEFAULTS } from "@kiron/shared";
import { clearMissing, getMissing } from "../../i18n";
import { session } from "../../state/session";
import { renderApp } from "../../test/utils";
import { COURSE_LIST, DASHBOARD, editorServer, enrollments, mockAdmin, requests, rewards, RULES, SETTINGS, verifs } from "./testing";

const settle = () => act(() => new Promise((r) => setTimeout(r, 60)));

const VARS = { nombre: { x: 50, y: 41, size: 40, on: true }, curso: { x: 50, y: 58, size: 19, on: true }, fecha: { x: 22, y: 84, size: 13, on: true }, folio: { x: 50, y: 84, size: 13, on: true }, qr: { x: 85, y: 81, size: 84, on: true } };
const TPL: CertTemplateDetail = { id: "c1", nombre: "Plantilla general", estado: "published", cursos: ["oftalmologia"], vars: VARS, imagen: null };

const srv = editorServer();
srv.routes["/api/admin/editor/cursos"]!("POST", {
  titulo: "Curso",
  tituloEn: "Course",
  tipo: "Curso",
  categoria: "Odontología",
  instructor: "MVZ",
  nivel: "Básico",
  precioRegular: 0,
  precio: 0,
  modulos: [{ nombre: "M1", lecciones: 1 }],
});
srv.routes["/api/admin/editor/cursos/abc123/examen/preguntas"]!("POST", { tipo: "om" });

const API = {
  "/api/admin/tablero": DASHBOARD,
  "/api/admin/cursos": COURSE_LIST,
  "/api/admin/medicos/verificaciones": verifs(),
  "/api/admin/webinars": {
    nuevos: [],
    historial: [
      { slug: "proximo", titulo: "Webinar", fecha: "15/12/2026", estado: "Próximo", registrados: 418, asistentes: null },
      { slug: "ejemplo-2026-11-12", titulo: "Webinar anterior · ejemplo 1", fecha: "12/11/2026", estado: "Concluido", registrados: 512, asistentes: 342 },
    ],
  } satisfies AdminWebinarList,
  "/api/club/reglas": RULES,
  "/api/club/premios": rewards(),
  "/api/admin/paginas": [{ id: 1, titulo: "Inicio", url: "/", estado: "Publicada", edicion: "30/10/2026", bloques: ["Héroe"], seo: { titulo: "Inicio · Kirón", descripcion: "Laboratorio veterinario mexicano", idioma: "es" } }] satisfies PageList,
  "/api/admin/inscripciones": enrollments(),
  "/api/admin/academia/alumnos": [{ nombre: "MVZ Paola Ruiz", correo: "paola.ruiz@correo-ejemplo.mx", registro: "02/02/2025", cursos: 2 }] satisfies StudentRow[],
  "/api/admin/academia/grupos": [{ id: 1, nombre: "Equipo clínico Bajío", total: 4, curso: "oftalmologia", vence: "31/01/2027", avance: 40, miembros: [] }] satisfies Group[],
  "/api/admin/academia/calificaciones": [
    { u: "MVZ Paola Ruiz", correo: "p@x.mx", s: "oftalmologia", titulo: "Bloque 1", avance: 100, nota: 9.5, intentosUsados: 1, intentosMax: 2, ultimoAcceso: "10/11/2026", estado: "Aprobado" },
    { u: "MVZ Jorge", correo: "j@x.mx", s: "oftalmologia", titulo: "Bloque 1", avance: 10, nota: null, intentosUsados: 0, intentosMax: null, ultimoAcceso: "10/10/2026", estado: "Inactivo" },
  ] satisfies GradebookRow[],
  "/api/admin/academia/intentos": [{ id: 1, u: "MVZ Paola Ruiz", s: "oftalmologia", titulo: "Bloque 1", n: 1, f: "10/11/2026", nota: 9.5, ok: true, t: 1610, conDetalle: false }] satisfies AttemptRow[],
  "/api/admin/academia/examenes": [{ slug: "oftalmologia", titulo: "Bloque 1", config: EXAM_DEFAULTS }] satisfies ExamConfigRow[],
  "/api/admin/academia/solicitudes": requests(),
  "/api/admin/academia/ajustes": SETTINGS,
  "/api/admin/academia/banco": [{ id: 1, texto: "¿Pregunta?", tipo: "om", tema: "Oftalmología", usos: 2 }],
  "/api/admin/academia/plantillas": [{ ...TPL, tieneImagen: false }],
  "/api/admin/academia/plantillas/c1": TPL,
  "/api/admin/academia/automatizaciones": [
    { id: 1, nombre: "Recordatorio de avance", disparador: "Si el alumno lleva 7 días sin entrar a un curso", mensaje: "Hola {nombre}, vas en {avance} de {curso}. Retoma donde te quedaste: {enlace}", activa: true, correo: true, panel: false },
  ] satisfies AutomationList,
  "/api/admin/academia/reportes": {
    kpis: { tasaFinalizacion: 40, calificacionPromedio: 9.1, activos: 6, inactivos: 2, constancias: 3 },
    inscripcionesPorMes: [{ mes: "10", total: 3 }],
    promedioPorExamen: [{ slug: "oftalmologia", titulo: "Bloque 1", intentos: 2, promedio: 9 }],
    porCurso: [{ slug: "oftalmologia", titulo: "Bloque 1", inscritas: 3, terminaron: 1, tasa: 33, promedio: 9.5, constancias: 1 }],
  } satisfies AcademyReport,
  ...srv.routes,
};

const ROUTES = [
  "/admin",
  "/admin/medicos",
  "/admin/webinars",
  "/admin/club",
  "/admin/paginas",
  "/admin/academia/cursos",
  "/admin/academia/inscripciones",
  "/admin/academia/alumnos",
  "/admin/academia/calificaciones",
  "/admin/academia/intentos",
  "/admin/academia/examenes",
  "/admin/academia/constancias",
  "/admin/academia/automatizaciones",
  "/admin/academia/reportes",
  "/admin/academia/ajustes",
  "/admin/academia/editor/abc123/0/0",
  "/admin/academia/editor/abc123/examen/0",
  "/admin/academia/editor/abc123/datos/0",
];

describe("textos del administrador en inglés", () => {
  it.each(ROUTES)("%s no deja textos sin traducir", async (path) => {
    mockAdmin(API);
    session.login("admin");
    session.setLang("en");
    clearMissing();
    renderApp(path);
    await screen.findByRole("heading", { level: 1 });
    await settle();
    await settle();
    expect(getMissing()).toEqual([]);
  });

  it("modales principales sin textos sin traducir", async () => {
    mockAdmin(API);
    session.login("admin");
    session.setLang("en");
    clearMissing();
    renderApp("/admin/academia/cursos");
    fireEvent.click(await screen.findByRole("button", { name: "New course" }));
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    renderApp("/admin/webinars");
    fireEvent.click((await screen.findAllByRole("button", { name: "New webinar" }))[0]!);
    await settle();
    expect(getMissing()).toEqual([]);
  });
});
