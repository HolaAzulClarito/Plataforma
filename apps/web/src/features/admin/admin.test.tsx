import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getSession, session } from "../../state/session";
import { renderApp } from "../../test/utils";
import { COURSE_LIST, DASHBOARD, editorServer, enrollments, mockAdmin, requests, rewards, RULES, sent, SETTINGS, verifs } from "./testing";

const where = () => screen.getByTestId("location").textContent;
const toastText = () => document.querySelector(".toast .msg")?.textContent ?? "";

const BASE = {
  "/api/admin/tablero": DASHBOARD,
  "/api/admin/cursos": COURSE_LIST,
  "/api/admin/medicos/verificaciones": verifs(),
};

describe("acceso al administrador", () => {
  it("un médico que entra a /admin cambia a la sesión simulada de administrador (como el demo)", async () => {
    mockAdmin(BASE);
    session.login("mvz");
    renderApp("/admin");
    await waitFor(() => expect(getSession().role).toBe("admin"));
    expect(await screen.findByRole("heading", { level: 1, name: "Tablero" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Administrador" })).toBeInTheDocument();
    /* Contador de cédulas pendientes en la barra lateral. */
    expect(await screen.findByLabelText("1 pendientes")).toBeInTheDocument();
  });

  it("Salir cierra la sesión y vuelve al inicio", async () => {
    mockAdmin(BASE);
    renderApp("/admin/club");
    fireEvent.click(await screen.findByRole("button", { name: "Salir" }));
    await waitFor(() => expect(where()).toBe("/"));
    expect(getSession().role).toBeNull();
  });
});

describe("médicos", () => {
  it("aprobar una cédula la envía a la API y la marca como verificada", async () => {
    let list = verifs();
    const calls = mockAdmin({
      ...BASE,
      "/api/admin/medicos/verificaciones": () => list,
      "/api/admin/medicos/verificaciones/1/aprobar": (m: string) => {
        if (m === "POST") list = list.map((v) => (v.id === 1 ? { ...v, verificado: true } : v));
        return list[0];
      },
    });
    renderApp("/admin/medicos");
    fireEvent.click(await screen.findByRole("button", { name: "Aprobar · Dr. Andrés Salinas" }));
    await waitFor(() => expect(sent(calls, "POST", "/api/admin/medicos/verificaciones/1/aprobar")).toHaveLength(1));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Aprobar · Dr. Andrés Salinas" })).toBeNull());
    expect(screen.getAllByText("Verificado")).toHaveLength(2);
    expect(toastText()).toContain("Dr. Andrés Salinas · verificado");
  });
});

describe("inscripciones", () => {
  it("aprueba una pendiente y cancela una aprobada", async () => {
    let data = enrollments();
    const patch = (id: number) => (m: string, b: unknown) => {
      if (m === "PATCH") data = { ...data, items: data.items.map((e) => (e.id === id ? { ...e, st: (b as { estado: typeof e.st }).estado } : e)) };
      return data.items.find((e) => e.id === id);
    };
    const calls = mockAdmin({
      ...BASE,
      "/api/admin/inscripciones": () => data,
      "/api/admin/inscripciones/7": patch(7),
      "/api/admin/inscripciones/8": patch(8),
    });
    renderApp("/admin/academia/inscripciones");
    fireEvent.click(await screen.findByRole("button", { name: "Aprobar · Dr. Andrés Salinas · Bloque 1 · Oftalmología y otitis" }));
    await waitFor(() => expect(sent(calls, "PATCH", "/api/admin/inscripciones/7")).toEqual([{ estado: "approved" }]));
    await waitFor(() => expect(toastText()).toBe("Inscripción aprobada. El alumno ya ve el curso en su panel."));

    fireEvent.click(screen.getByRole("button", { name: "Cancelar · MVZ Paola Ruiz · Temas selectos de odontología" }));
    await waitFor(() => expect(sent(calls, "PATCH", "/api/admin/inscripciones/8")).toEqual([{ estado: "cancelled" }]));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Cancelar · MVZ Paola Ruiz · Temas selectos de odontología" })).toBeNull());
    expect(toastText()).toBe("Inscripción cancelada. El alumno pierde el acceso; sus constancias se conservan.");
  });

  it("las acciones en lote envían los ids seleccionados", async () => {
    const calls = mockAdmin({ ...BASE, "/api/admin/inscripciones": enrollments(), "/api/admin/inscripciones/lote": { actualizadas: 2 } });
    renderApp("/admin/academia/inscripciones");
    fireEvent.click(await screen.findByRole("checkbox", { name: /Seleccionar los 2 resultados/ }));
    expect(screen.getByText("2 seleccionadas")).toBeInTheDocument();
    const bar = document.getElementById("bulkE")!;
    fireEvent.click(within(bar).getByRole("button", { name: "Aprobar" }));
    await waitFor(() => expect(sent(calls, "POST", "/api/admin/inscripciones/lote")).toEqual([{ ids: [7, 8], estado: "approved" }]));
  });
});

describe("exámenes", () => {
  it("autoriza un intento adicional", async () => {
    let reqs = requests();
    const calls = mockAdmin({
      ...BASE,
      "/api/admin/academia/examenes": [],
      "/api/admin/academia/ajustes": SETTINGS,
      "/api/admin/academia/banco": [],
      "/api/admin/academia/solicitudes": () => reqs,
      "/api/admin/academia/solicitudes/3": (m: string) => {
        if (m === "POST") reqs = reqs.map((r) => ({ ...r, estado: "autorizado" }));
        return reqs[0];
      },
    });
    renderApp("/admin/academia/examenes");
    fireEvent.click(await screen.findByRole("button", { name: "Autorizar · Dr. Andrés Salinas" }));
    await waitFor(() => expect(sent(calls, "POST", "/api/admin/academia/solicitudes/3")).toEqual([{ accion: "autorizar" }]));
    expect(await screen.findByText("Autorizado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rechazar · Dr. Andrés Salinas" })).toBeNull();
  });
});

describe("ajustes globales", () => {
  it("guardar un ajuste lo envía a la API y actualiza el switch", async () => {
    let gs = { ...SETTINGS };
    const calls = mockAdmin({
      ...BASE,
      "/api/admin/academia/ajustes": (m: string, b: unknown) => {
        if (m === "PATCH") gs = { ...gs, ...(b as object) };
        return gs;
      },
    });
    renderApp("/admin/academia/ajustes");
    const sw = await screen.findByRole("switch", { name: "Modo enfoque" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    fireEvent.click(sw);
    await waitFor(() => expect(sent(calls, "PATCH", "/api/admin/academia/ajustes")).toEqual([{ enfoque: true }]));
    await waitFor(() => expect(screen.getByRole("switch", { name: "Modo enfoque" })).toHaveAttribute("aria-checked", "true"));
    expect(toastText()).toBe("Ajuste guardado para todos los cursos");
  });
});

describe("Club MVZ", () => {
  it("agrega y quita un premio", async () => {
    let list = rewards();
    const calls = mockAdmin({
      ...BASE,
      "/api/club/reglas": RULES,
      "/api/club/premios": () => list,
      "/api/admin/club/premios": (_m: string, b: unknown) => {
        const r = { id: "diplomado-felino", icono: "gift", ...(b as { nombre: string; puntos: number }) };
        list = [...list, r];
        return r;
      },
      "/api/admin/club/premios/kit-clinico": () => {
        list = list.filter((r) => r.id !== "kit-clinico");
        return null;
      },
    });
    renderApp("/admin/club");
    fireEvent.change(await screen.findByLabelText("Premio"), { target: { value: "Diplomado Medicina Interna Felina" } });
    fireEvent.change(screen.getByLabelText("Puntos necesarios"), { target: { value: "2500" } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar premio" }));
    await waitFor(() => expect(sent(calls, "POST", "/api/admin/club/premios")).toEqual([{ nombre: "Diplomado Medicina Interna Felina", puntos: 2500 }]));
    expect(await screen.findByText("Diplomado Medicina Interna Felina")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Quitar · Kit clínico de muestras" }));
    await waitFor(() => expect(calls.some((c) => c.init?.method === "DELETE" && c.url === "/api/admin/club/premios/kit-clinico")).toBe(true));
    await waitFor(() => expect(screen.queryByText("Kit clínico de muestras")).toBeNull());
  });

  it("cambiar los puntos de una regla la guarda al salir del campo", async () => {
    const calls = mockAdmin({ ...BASE, "/api/club/reglas": RULES, "/api/club/premios": rewards(), "/api/admin/club/reglas/leccion": { ...RULES[1], puntos: 30 } });
    renderApp("/admin/club");
    const input = await screen.findByLabelText("Puntos por Lección completada");
    fireEvent.change(input, { target: { value: "30" } });
    fireEvent.blur(input);
    await waitFor(() => expect(sent(calls, "PUT", "/api/admin/club/reglas/leccion")).toEqual([{ puntos: 30 }]));
  });
});

describe("editor de cursos", () => {
  it("crea un curso con una lección y una pregunta y lo publica", async () => {
    const srv = editorServer();
    const calls = mockAdmin({ ...BASE, "/api/admin/academia/ajustes": SETTINGS, ...srv.routes });
    renderApp("/admin/academia/cursos");

    /* 1. Nuevo curso: un módulo con una lección. */
    fireEvent.click(await screen.findByRole("button", { name: "Nuevo curso" }));
    const dialog = await screen.findByRole("dialog", { name: "Nuevo curso" });
    fireEvent.change(within(dialog).getByLabelText("Título en español"), { target: { value: "Curso de prueba" } });
    fireEvent.change(within(dialog).getByLabelText("Título en inglés"), { target: { value: "Test course" } });
    fireEvent.change(within(dialog).getByLabelText("Autor o ponente (solo se muestra)"), { target: { value: "MVZ Ejemplo" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Quitar módulo 2" }));
    fireEvent.change(within(dialog).getByLabelText("Módulo 1"), { target: { value: "Introducción" } });
    fireEvent.change(within(dialog).getByLabelText("Lecciones"), { target: { value: "1" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Crear curso y abrir el editor" }));
    await waitFor(() => expect(where()).toBe("/admin/academia/editor/abc123/0/0"));
    const created = sent(calls, "POST", "/api/admin/editor/cursos")[0] as { modulos: unknown; precio: number };
    expect(created.modulos).toEqual([{ nombre: "Introducción", lecciones: 1 }]);
    expect(created.precio).toBe(0);

    /* 2. Lección: video de Bunny y duración. */
    const video = await screen.findByLabelText("Código de inserción, URL del reproductor o «librería/ID»");
    fireEvent.change(video, { target: { value: "123456/0a1b2c3d-1111-2222-3333-444455556666" } });
    fireEvent.blur(video);
    expect(await screen.findByText("123456")).toBeInTheDocument();
    const dur = screen.getByLabelText("Duración del video (min:seg)");
    fireEvent.change(dur, { target: { value: "12:40" } });
    fireEvent.blur(dur);
    await waitFor(() => expect(srv.get()!.modulos[0]!.lecciones[0]!.dur).toBe("12:40"));

    /* 3. Examen final: una pregunta de verdadero o falso con texto. */
    fireEvent.click(screen.getByRole("link", { name: /Examen final/ }));
    await waitFor(() => expect(where()).toBe("/admin/academia/editor/abc123/examen/0"));
    fireEvent.click(await screen.findByRole("button", { name: "Verdadero o falso" }));
    const q = await screen.findByLabelText("Pregunta 1");
    fireEvent.change(q, { target: { value: "La ciclosporina es un inmunomodulador." } });
    fireEvent.blur(q);
    await waitFor(() => expect(srv.get()!.examen.preguntas[0]!.texto).toBe("La ciclosporina es un inmunomodulador."));
    expect(srv.get()!.examen.preguntas[0]!.correctas).toEqual([0]);

    /* 4. Publicar: sin pendientes, se publica. */
    await waitFor(() => expect(screen.queryByRole("button", { name: "Ver pendientes" })).toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Publicar curso" }));
    await waitFor(() => expect(sent(calls, "POST", "/api/admin/editor/cursos/abc123/publicar")).toHaveLength(1));
    expect(await screen.findByRole("button", { name: "Revisar y guardar" })).toBeInTheDocument();
    expect(toastText()).toBe("Curso publicado. Ya aparece en Academia.");
  });

  it("con pendientes no llama a publicar y muestra la lista", async () => {
    const srv = editorServer();
    mockAdmin({ ...BASE, "/api/admin/academia/ajustes": SETTINGS, ...srv.routes });
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
    renderApp("/admin/academia/editor/abc123/0/0");
    fireEvent.click(await screen.findByRole("button", { name: "Publicar curso" }));
    const dialog = await screen.findByRole("dialog", { name: "Antes de publicar" });
    expect(within(dialog).getByText("Módulo 1 · Lección 1: falta el video de Bunny")).toBeInTheDocument();
    expect(within(dialog).getByText("Cierre · Examen final: sin preguntas")).toBeInTheDocument();
  });
});
