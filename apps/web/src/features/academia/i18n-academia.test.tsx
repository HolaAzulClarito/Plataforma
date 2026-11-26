import { act, fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ExamResult, MyWebinarStatus, WebinarSummary } from "@kiron/shared";
import { clearMissing, getMissing } from "../../i18n";
import { session } from "../../state/session";
import { renderApp } from "../../test/utils";
import { detailOf, enrollment, examStatus, FREE, mockApi, PAID, progressOf } from "./testing";

const settle = () => act(() => new Promise((r) => setTimeout(r, 80)));

const W: WebinarSummary = {
  slug: "proximo",
  titulo: "Webinar",
  subtitulo: "",
  tituloEn: "",
  subtituloEn: "",
  grado: "MVZ",
  ponente: "Ponente",
  inicio: "2099-12-15T20:00:00-06:00",
  fecha: "15/12/2099",
  hora: "20:00",
  duracion: 90,
  umbral: 45,
  flyer: null,
  modo: "cloudflare",
  publicado: true,
};
const WS: MyWebinarStatus = { slug: "proximo", registrado: true, asistio: true, youtube: null, puntos: 0, constancia: null };

const RESULT: ExamResult = {
  intento: { n: 1, nota: 5, ok: false, t: 30, f: "26/11/2026" },
  aprobatoria: 80,
  notaFinal: 5,
  calculo: "mas_alta",
  intentosRestantes: 0,
  constancia: null,
  puntos: 0,
  detalle: [{ i: 0, q: "P", elegidas: ["B"], correctas: ["A"], ok: false }],
};

const API = {
  "/api/sesion": { rol: "mvz", usuario: { name: "Dra. Laura Méndez", email: "x@y.mx", initials: "LM" }, puntos: 1240 },
  "/api/cursos/odontologia": detailOf(FREE),
  "/api/cursos/oftalmologia": detailOf(PAID, 14),
  "/api/me/inscripciones": [enrollment("odontologia", "approved")],
  "/api/me/cursos/odontologia/progreso": progressOf("odontologia", [0, 1], 2, examStatus({ estado: "disponible", config: { ...examStatus().config, tiempo: 10 } })),
  "/api/me/cursos/odontologia/examen/iniciar": {
    id: "s",
    intento: 1,
    intentosMax: 3,
    layout: "una",
    preguntas: [
      { i: 0, t: "om", q: "P", o: ["A", "B"] },
      { i: 1, t: "vf", q: "Q", o: ["V", "F"] },
    ],
    iniciadaEn: "2026-11-26T12:00:00Z",
    venceEn: "2099-01-01T00:00:00Z",
  },
  "/api/me/cursos/odontologia/examen/intentos": RESULT,
  "/api/constancias/KI-2026-001234": { folio: "KI-2026-001234", titulo: "T", tipo: "diplomado", fecha: "12/09/2026", titular: "L. Méndez" },
  "/api/me/cursos": {
    cursos: [{ course: FREE, hechas: 1, total: 2, pct: 33, intentosUsados: 1, intentosMax: null, notaFinal: 6, examen: "disponible", constancia: null }],
    solicitudes: [enrollment("oftalmologia", "pending")],
  },
  "/api/me/constancias": [
    { folio: "KI-2026-001234", tipo: "diplomado", ref: "x", titulo: "T", fecha: "12/09/2026", origen: "migrada" },
    { folio: "KI-2026-001388", tipo: "webinar", ref: "y", titulo: "W", fecha: "15/10/2026", origen: "webinar" },
  ],
  "/api/me/puntos": { saldo: 1240, canjeados: [], movimientos: [] },
  "/api/club/reglas": [
    { id: "cedula", nombre: "Verificar tu cédula", puntos: 200, frecuencia: "Una sola vez" },
    { id: "webinar", nombre: "Asistir a un webinar en vivo", puntos: 50, frecuencia: "Al entrar desde el sitio" },
    { id: "curso", nombre: "Terminar un curso", puntos: 300, frecuencia: "Al aprobar el examen final" },
    { id: "leccion", nombre: "Completar una lección", puntos: 20, frecuencia: "Por lección" },
  ],
  "/api/club/premios": [
    { id: "webinar-vip", nombre: "Lugar", puntos: 500, icono: "video" },
    { id: "promo", nombre: "Promo", puntos: 3000, icono: "gift" },
  ],
  "/api/webinars": [W],
  "/api/me/webinars/proximo": WS,
};

const PUBLIC = ["/academia", "/academia?tab=diplomados", "/academia?tab=cursos", "/academia?tab=webinars", "/academia/curso/oftalmologia", "/verificar", "/verificar/KI-2026-001234", "/verificar/KI-2026-000000", "/webinar/proximo", "/academia/curso/no-existe"];
const MVZ = ["/academia/curso/odontologia", "/academia/curso/oftalmologia", "/panel", "/panel/cursos", "/panel/constancias", "/panel/club", "/webinar/proximo"];

describe("academia, panel y webinars en inglés", () => {
  it("todas las páginas tienen traducción para sus textos fijos", async () => {
    const missing = new Set<string>();
    for (const [role, list] of [[null, PUBLIC], ["mvz", MVZ]] as const) {
      for (const path of list) {
        session.reset();
        session.setLang("en");
        if (role) session.login(role);
        clearMissing();
        mockApi(API);
        const { unmount } = renderApp(path);
        await settle();
        await settle();
        getMissing().forEach((m) => missing.add(`${m}  (${path})`));
        unmount();
      }
    }
    expect([...missing]).toEqual([]);
  }, 60_000);

  it("los modales del examen, la inscripción, el canje y las vistas del webinar tienen traducción", async () => {
    session.setLang("en");
    session.login("mvz");
    mockApi(API);
    clearMissing();
    const r1 = renderApp("/academia/curso/odontologia");
    fireEvent.click(await screen.findByRole("button", { name: /Take the final exam|Presentar examen final/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getAllByRole("button").at(-1)!);
    await within(dialog).findAllByRole("radio");
    fireEvent.click(within(dialog).getAllByRole("button").at(-1)!);
    fireEvent.click(within(dialog).getByRole("button", { name: /Submit|Enviar/ }));
    await within(dialog).findByRole("status");
    r1.unmount();

    const r2 = renderApp("/academia/curso/oftalmologia");
    await settle();
    fireEvent.click(screen.getAllByRole("button").find((b) => b.className.includes("btn-accent btn-block"))!);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    r2.unmount();

    const r3 = renderApp("/panel/club");
    await settle();
    fireEvent.click(screen.getAllByRole("button").find((b) => b.className === "btn btn-primary btn-sm")!);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    r3.unmount();

    const r4 = renderApp("/webinar/proximo");
    await settle();
    for (const name of [/Before the event/, /Live/, /Ended/]) {
      fireEvent.click(screen.getByRole("button", { name }));
      await settle();
    }
    r4.unmount();
    expect(getMissing()).toEqual([]);
  }, 30_000);
});
