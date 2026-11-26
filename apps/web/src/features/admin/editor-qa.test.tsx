/* Hallazgos 5 y 7 del dictamen de QA: pendientes del 409 al publicar y borrar módulo desde el editor. */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { editorIssues, type EditorCourseCreateRequest } from "@kiron/shared";
import { renderApp } from "../../test/utils";
import { COURSE_LIST, DASHBOARD, editorServer, mockAdmin, sent, SETTINGS, verifs } from "./testing";

const BASE = {
  "/api/admin/tablero": DASHBOARD,
  "/api/admin/cursos": COURSE_LIST,
  "/api/admin/medicos/verificaciones": verifs(),
  "/api/admin/academia/ajustes": SETTINGS,
};

const NEW: EditorCourseCreateRequest = {
  titulo: "Curso",
  tituloEn: "Course",
  tipo: "Curso",
  categoria: "Odontología",
  instructor: "MVZ",
  nivel: "Básico",
  precioRegular: 0,
  precio: 0,
  modulos: [
    { nombre: "M1", lecciones: 1 },
    { nombre: "M2", lecciones: 1 },
  ],
};

describe("editor: 409 al publicar", () => {
  it("muestra los pendientes que manda el servidor en el cuerpo del 409", async () => {
    const srv = editorServer();
    mockAdmin({ ...BASE, ...srv.routes });
    srv.routes["/api/admin/editor/cursos"]!("POST", NEW);
    /* Curso completo en la copia local: sin pendientes, así que el editor sí llama a publicar. */
    const c = srv.get()!;
    for (const m of c.modulos) for (const l of m.lecciones) Object.assign(l, { video: { lib: "1", vid: "x" }, dur: "10:00" });
    c.examen.preguntas.push({ tipo: "om", texto: "P", puntos: 1, requerida: true, mezclar: false, explicacion: "", opciones: ["A", "B"], correctas: [0], pares: [], modelo: "" });
    expect(editorIssues(c)).toEqual([]);
    const pendiente = "El examen final no tiene preguntas que se califiquen solas";
    const inner = globalThis.fetch;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
        String(input).endsWith("/abc123/publicar")
          ? new Response(JSON.stringify({ error: "El curso tiene pendientes antes de publicarse", pendientes: [pendiente] }), { status: 409, headers: { "Content-Type": "application/json" } })
          : inner(input, init),
      ),
    );
    renderApp("/admin/academia/editor/abc123/0/0");
    fireEvent.click(await screen.findByRole("button", { name: "Publicar curso" }));
    const dialog = await screen.findByRole("dialog", { name: "Antes de publicar" });
    expect(within(dialog).getByText(pendiente)).toBeInTheDocument();
  });
});

describe("editor: borrar módulo", () => {
  it("pide confirmación y llama a DELETE /modulos/:mi", async () => {
    const srv = editorServer();
    srv.routes["/api/admin/editor/cursos/abc123/modulos/1"] = (m) => {
      if (m === "DELETE") srv.get()!.modulos.splice(1, 1);
      return { curso: srv.get(), pendientes: editorIssues(srv.get()!) };
    };
    const calls = mockAdmin({ ...BASE, ...srv.routes });
    srv.routes["/api/admin/editor/cursos"]!("POST", NEW);
    renderApp("/admin/academia/editor/abc123/0/0");
    fireEvent.click(await screen.findByRole("button", { name: "Borrar módulo 2" }));
    const dialog = await screen.findByRole("dialog", { name: "Borrar módulo" });
    expect(within(dialog).getByText(/No se puede deshacer/)).toBeInTheDocument();
    /* Cancelar no borra. */
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(sent(calls, "DELETE", "/api/admin/editor/cursos/abc123/modulos/1")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Borrar módulo 2" }));
    fireEvent.click(within(await screen.findByRole("dialog", { name: "Borrar módulo" })).getByRole("button", { name: /Borrar módulo/ }));
    await waitFor(() => expect(sent(calls, "DELETE", "/api/admin/editor/cursos/abc123/modulos/1")).toHaveLength(1));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Borrar módulo 2" })).toBeNull());
    /* Con un solo módulo el botón queda deshabilitado. */
    expect(screen.getByRole("button", { name: "Borrar módulo 1" })).toBeDisabled();
  });
});

describe("webinars: asistentes del historial de ejemplo (hallazgos 6 y 9)", () => {
  it("muestra 'Ver asistentes' en las filas de ejemplo y exporta un CSV con fórmulas neutralizadas", async () => {
    const blobs: Blob[] = [];
    vi.stubGlobal("URL", Object.assign(Object.create(URL), { createObjectURL: (b: Blob) => (blobs.push(b), "blob:x"), revokeObjectURL: () => {} }));
    HTMLAnchorElement.prototype.click = () => {};
    mockAdmin({
      ...BASE,
      "/api/admin/webinars": {
        nuevos: [],
        historial: [
          { slug: "proximo", titulo: "Webinar", fecha: "15/12/2026", estado: "Próximo", registrados: 418, asistentes: null },
          { slug: "ejemplo-2026-11-12", titulo: "Webinar anterior · ejemplo 1", fecha: "12/11/2026", estado: "Concluido", registrados: 512, asistentes: 342 },
        ],
      },
      "/api/admin/webinars/ejemplo-2026-11-12/asistentes": ["=HYPERLINK(\"http://x\")", "MVZ Paola Ruiz"],
    });
    renderApp("/admin/webinars");
    const row = (await screen.findByText("Webinar anterior · ejemplo 1")).closest("tr")!;
    fireEvent.click(within(row).getByRole("button", { name: /Ver asistentes/ }));
    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("MVZ Paola Ruiz")).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /Exportar lista/ }));
    expect(blobs).toHaveLength(1);
    /* Blob.text() quita el BOM al decodificar: se revisa aparte en los bytes. */
    expect([...new Uint8Array(await blobs[0]!.arrayBuffer()).slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(await blobs[0]!.text()).toBe(`"Nombre"\n"'=HYPERLINK(""http://x"")"\n"MVZ Paola Ruiz"\n`);
  });
});

describe("constancias: guardado pendiente al desmontar (hallazgo 13)", () => {
  it("al salir antes de que venza el retraso, envía la posición pendiente en vez de perderla", async () => {
    const VARS = { nombre: { x: 50, y: 41, size: 40, on: true }, curso: { x: 50, y: 58, size: 19, on: true }, fecha: { x: 22, y: 84, size: 13, on: true }, folio: { x: 50, y: 84, size: 13, on: true }, qr: { x: 85, y: 81, size: 84, on: true } };
    const TPL = { id: "c1", nombre: "Plantilla general", estado: "published", cursos: ["oftalmologia"], vars: VARS, imagen: null };
    const calls = mockAdmin({
      ...BASE,
      "/api/admin/academia/plantillas": [{ ...TPL, tieneImagen: false }],
      "/api/admin/academia/plantillas/c1": TPL,
    });
    const { unmount } = renderApp("/admin/academia/constancias");
    const el = await screen.findByRole("button", { name: /^Mover Nombre del alumno/ });
    fireEvent.keyDown(el, { key: "ArrowRight" });
    expect(sent(calls, "PATCH", "/api/admin/academia/plantillas/c1")).toHaveLength(0);
    unmount();
    expect(sent(calls, "PATCH", "/api/admin/academia/plantillas/c1")).toEqual([{ vars: { nombre: { x: 50.5, y: 41, size: 40, on: true } } }]);
  });
});

describe("ajustes no aplicados por el servidor", () => {
  it("expira queda deshabilitado y marcado como Próximamente; pct también se marca", async () => {
    mockAdmin(BASE);
    renderApp("/admin/academia/ajustes");
    const sw = await screen.findByRole("switch", { name: "Expiración de la inscripción" });
    expect(sw).toBeDisabled();
    expect(sw).toHaveAttribute("aria-checked", "false");
    expect(screen.getAllByText("Próximamente").length).toBe(2);
    expect(screen.getByText("Porcentaje configurable: Próximamente. Hoy siempre es 100 %.")).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Modo enfoque" })).not.toBeDisabled();
  });
});
