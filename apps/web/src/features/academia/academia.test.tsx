import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CertificateVerification, ExamResult, ExamSession, LessonProgressResult } from "@kiron/shared";
import { session } from "../../state/session";
import { renderApp } from "../../test/utils";
import { detailOf, enrollment, examStatus, FREE, mockApi, PAID, posts, progressOf } from "./testing";

const asMvz = () => act(() => session.login("mvz"));

describe("inscripción a cursos", () => {
  it("curso gratuito: se inscribe con la API y abre la vista del curso", async () => {
    asMvz();
    let enrolled = false;
    const calls = mockApi({
      "/api/cursos/odontologia": detailOf(FREE),
      "/api/me/inscripciones": (m: string) => {
        if (m === "POST") enrolled = true;
        return m === "POST" ? enrollment("odontologia", "approved") : enrolled ? [enrollment("odontologia", "approved")] : [];
      },
      "/api/me/cursos/odontologia/progreso": progressOf("odontologia", []),
    });
    renderApp("/academia/curso/odontologia");
    fireEvent.click(await screen.findByRole("button", { name: "Inscribirme gratis" }));
    await screen.findByRole("button", { name: "Reproducir lección" });
    expect(posts(calls, "/api/me/inscripciones")).toEqual([{ curso: "odontologia" }]);
    expect(screen.getByRole("heading", { level: 1, name: FREE.title })).toBeInTheDocument();
    expect(screen.getByText("Inscripción confirmada")).toBeInTheDocument();
  });

  it("curso con precio: envía la solicitud (sin cobro) y muestra que está en revisión", async () => {
    asMvz();
    let sent = false;
    const calls = mockApi({
      "/api/cursos/oftalmologia": detailOf(PAID),
      "/api/me/inscripciones": (m: string) => {
        if (m === "POST") sent = true;
        return m === "POST" ? enrollment("oftalmologia", "pending") : sent ? [enrollment("oftalmologia", "pending")] : [];
      },
    });
    renderApp("/academia/curso/oftalmologia");
    expect(await screen.findByText("$2,999 MXN")).toBeInTheDocument();
    expect(screen.getAllByText("IVA por confirmar").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Quiero inscribirme/ }));
    const dialog = screen.getByRole("dialog", { name: "Quiero inscribirme" });
    fireEvent.change(within(dialog).getByLabelText("Teléfono"), { target: { value: "5500000000" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /Enviar solicitud/ }));
    expect(await screen.findByText(/Solicitud enviada el 26\/11\/2026/)).toBeInTheDocument();
    expect(posts(calls, "/api/me/inscripciones")).toEqual([{ curso: "oftalmologia" }]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("vista del curso", () => {
  it("el reproductor reporta el avance a la API hasta 100 % y la lección se completa sola", async () => {
    asMvz();
    const before = progressOf("odontologia", []);
    const after = progressOf("odontologia", [0]);
    const calls = mockApi({
      "/api/cursos/odontologia": detailOf(FREE),
      "/api/me/inscripciones": [enrollment("odontologia", "approved")],
      "/api/me/cursos/odontologia/progreso": before,
      "/api/me/cursos/odontologia/lecciones/0/avance": (_m: string, body: unknown) =>
        ({
          completada: (body as { pct: number }).pct >= 100,
          nueva: (body as { pct: number }).pct >= 100,
          puntos: (body as { pct: number }).pct >= 100 ? 20 : 0,
          progreso: (body as { pct: number }).pct >= 100 ? after : before,
        }) satisfies LessonProgressResult,
    });
    renderApp("/academia/curso/odontologia");
    expect(screen.queryByRole("button", { name: /marcar/i })).toBeNull();
    fireEvent.click(await screen.findByRole("button", { name: "Reproducir lección" }));
    await waitFor(() => expect(posts(calls, "/api/me/cursos/odontologia/lecciones/0/avance")).toEqual([{ pct: 50 }, { pct: 100 }]), { timeout: 4000 });
    await waitFor(() => expect(screen.getAllByText("Video al 100 % · lección completada · +20 puntos Club MVZ").length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getByText("1 de 2 lecciones", { exact: false })).toBeInTheDocument());
  });
});

const SESSION: ExamSession = {
  id: "s-1",
  intento: 1,
  intentosMax: 3,
  layout: "una",
  preguntas: [
    { i: 0, t: "om", q: "¿Qué se necesita para la constancia?", o: ["Lecciones y examen", "Un video"] },
    { i: 2, t: "rm", q: "Elige las correctas", o: ["A", "B", "C"] },
  ],
  iniciadaEn: "2026-11-26T12:00:00.000Z",
  venceEn: null,
};

const examRoutes = (result: ExamResult) => {
  const ready = progressOf("odontologia", [0, 1], 2, examStatus({ estado: "disponible" }));
  return {
    "/api/cursos/odontologia": detailOf(FREE),
    "/api/me/inscripciones": [enrollment("odontologia", "approved")],
    "/api/me/cursos/odontologia/progreso": ready,
    "/api/me/cursos/odontologia/examen/iniciar": SESSION,
    "/api/me/cursos/odontologia/examen/intentos": result,
  };
};

async function takeExam() {
  renderApp("/academia/curso/odontologia");
  fireEvent.click(await screen.findByRole("button", { name: /Presentar examen final/ }));
  const dialog = screen.getByRole("dialog", { name: "Examen final" });
  fireEvent.click(within(dialog).getByRole("button", { name: /Iniciar examen/ }));
  /* Una pregunta por pantalla: la segunda aparece con "Siguiente". */
  fireEvent.click(await within(dialog).findByLabelText(/Lecciones y examen/));
  expect(within(dialog).queryByRole("button", { name: /Enviar respuestas/ })).toBeNull();
  fireEvent.click(within(dialog).getByRole("button", { name: /Siguiente/ }));
  fireEvent.click(within(dialog).getByLabelText("A"));
  fireEvent.click(within(dialog).getByLabelText("C"));
  fireEvent.click(within(dialog).getByRole("button", { name: /Enviar respuestas/ }));
  return dialog;
}

describe("examen final", () => {
  it("aprobado: manda las respuestas sin calificar y muestra el resultado y la constancia que devuelve la API", async () => {
    asMvz();
    const calls = mockApi(
      examRoutes({
        intento: { n: 1, nota: 10, ok: true, t: 40, f: "26/11/2026" },
        aprobatoria: 80,
        notaFinal: 10,
        calculo: "mas_alta",
        intentosRestantes: 2,
        constancia: { folio: "KI-2026-000777", tipo: "curso", ref: "odontologia", titulo: FREE.title, fecha: "26/11/2026", origen: "academia" },
        puntos: 300,
        detalle: null,
      }),
    );
    const dialog = await takeExam();
    const status = await within(dialog).findByRole("status");
    expect(status).toHaveTextContent("10.0");
    expect(status).toHaveTextContent("Aprobado");
    expect(within(dialog).getByText(/Tu constancia ya está en tu panel/)).toBeInTheDocument();
    expect(within(dialog).getByText("Solo se muestra tu calificación final.")).toBeInTheDocument();
    expect(posts(calls, "/api/me/cursos/odontologia/examen/intentos")).toEqual([
      { sesion: "s-1", respuestas: [{ i: 0, v: [0] }, { i: 2, v: [0, 2] }] },
    ]);
  });

  it("reprobado: muestra la calificación, los intentos restantes y que no hay constancia", async () => {
    asMvz();
    mockApi(
      examRoutes({
        intento: { n: 1, nota: 5, ok: false, t: 40, f: "26/11/2026" },
        aprobatoria: 80,
        notaFinal: 5,
        calculo: "mas_alta",
        intentosRestantes: 2,
        constancia: null,
        puntos: 0,
        detalle: [{ i: 0, q: "¿Qué se necesita para la constancia?", elegidas: ["Un video"], correctas: ["Lecciones y examen"], ok: false }],
      }),
    );
    const dialog = await takeExam();
    const status = await within(dialog).findByRole("status");
    expect(status).toHaveTextContent("5.0");
    expect(status).toHaveTextContent("No aprobado");
    expect(within(dialog).getByText("Intentos restantes").nextSibling).toHaveTextContent("2");
    expect(within(dialog).getByText("Sin aprobar el examen no se emite la constancia. Puedes volver a presentarlo.")).toBeInTheDocument();
    expect(within(dialog).getByText(/Correcta:/)).toBeInTheDocument();
  });

  it("intentos agotados: explica el bloqueo y envía la solicitud de intento adicional", async () => {
    asMvz();
    const calls = mockApi({
      "/api/cursos/odontologia": detailOf(FREE),
      "/api/me/inscripciones": [enrollment("odontologia", "approved")],
      "/api/me/cursos/odontologia/progreso": progressOf(
        "odontologia",
        [0, 1],
        2,
        examStatus({ estado: "sin_intentos", intentosUsados: 3, intentosRestantes: 0, notaFinal: 6, puedeSolicitar: true }),
      ),
      "/api/me/cursos/odontologia/examen/solicitudes": { id: 4, u: "Dra. Laura Méndez", s: "odontologia", estado: "pendiente", f: "26/11/2026" },
    });
    renderApp("/academia/curso/odontologia");
    fireEvent.click(await screen.findByRole("button", { name: /Presentar examen final/ }));
    const dialog = screen.getByRole("dialog", { name: "Examen final" });
    expect(within(dialog).getByText("Agotaste tus intentos")).toBeInTheDocument();
    expect(within(dialog).getByText(/Usaste 3 de 3 intentos/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: /Solicitar intento adicional/ }));
    await waitFor(() => expect(posts(calls, "/api/me/cursos/odontologia/examen/solicitudes")).toHaveLength(1));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("Solicitud enviada. La administración autoriza el intento adicional.")).toBeInTheDocument();
  });

  it("ADR-006: con 'Primer intento' reprobado explica que la nota ya quedó definida y no ofrece intento adicional", async () => {
    asMvz();
    const motivo = 'Con la regla "Primer intento", tu calificación final ya no puede llegar a la aprobatoria.';
    mockApi({
      "/api/cursos/odontologia": detailOf(FREE),
      "/api/me/inscripciones": [enrollment("odontologia", "approved")],
      "/api/me/cursos/odontologia/progreso": progressOf(
        "odontologia",
        [0, 1],
        2,
        examStatus({ estado: "sin_intentos", intentosUsados: 1, intentosRestantes: 2, notaFinal: 0, puedeSolicitar: false, motivo }),
      ),
    });
    renderApp("/academia/curso/odontologia");
    fireEvent.click(await screen.findByRole("button", { name: /Presentar examen final/ }));
    const dialog = screen.getByRole("dialog", { name: "Examen final" });
    expect(within(dialog).getByText("Tu calificación final ya quedó definida")).toBeInTheDocument();
    expect(within(dialog).getByText(/tu calificación final ya no puede llegar a la aprobatoria/)).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /Solicitar intento adicional/ })).toBeNull();
  });
});

describe("modo enfoque (ajuste global) en la vista del médico", () => {
  it("con enfoque activo oculta encabezado y pie y muestra la barra para salir", async () => {
    asMvz();
    mockApi({
      "/api/cursos/odontologia": { ...detailOf(FREE), ajustes: { enfoque: true } },
      "/api/me/inscripciones": [enrollment("odontologia", "approved")],
      "/api/me/cursos/odontologia/progreso": progressOf("odontologia", []),
    });
    renderApp("/academia/curso/odontologia");
    expect(await screen.findByRole("link", { name: /Salir del curso/ })).toBeInTheDocument();
    expect(screen.getByText("Modo enfoque")).toBeInTheDocument();
    await waitFor(() => expect(document.body).toHaveClass("ac-focus"));
  });

  it("con enfoque apagado no hay barra de enfoque", async () => {
    asMvz();
    mockApi({
      "/api/cursos/odontologia": detailOf(FREE),
      "/api/me/inscripciones": [enrollment("odontologia", "approved")],
      "/api/me/cursos/odontologia/progreso": progressOf("odontologia", []),
    });
    renderApp("/academia/curso/odontologia");
    await screen.findByRole("button", { name: "Reproducir lección" });
    expect(screen.queryByText("Modo enfoque")).toBeNull();
    expect(document.body).not.toHaveClass("ac-focus");
  });
});

describe("verificación pública de constancias", () => {
  const OK: CertificateVerification = { folio: "KI-2026-001234", titulo: "Módulo 1 · Bases de la defensa", tipo: "diplomado", fecha: "12/09/2026", titular: "L. Méndez" };

  it("folio válido: muestra los datos que devuelve la API", async () => {
    mockApi({ "/api/constancias/KI-2026-001234": OK });
    renderApp("/verificar/KI-2026-001234");
    expect(await screen.findByText("Constancia válida")).toBeInTheDocument();
    expect(screen.getByText(/Módulo 1 · Bases de la defensa/)).toHaveTextContent("emitida el 12/09/2026 a nombre de L. Méndez");
  });

  it("folio inválido: avisa que no existe", async () => {
    mockApi({});
    renderApp("/verificar/KI-2026-999999");
    expect(await screen.findByText("No encontramos ese folio")).toBeInTheDocument();
    expect(screen.queryByText("Constancia válida")).toBeNull();
  });

  it("el formulario navega al folio escrito en mayúsculas", async () => {
    mockApi({ "/api/constancias/KI-2026-001234": OK });
    renderApp("/verificar");
    fireEvent.change(await screen.findByLabelText("Folio"), { target: { value: "ki-2026-001234" } });
    fireEvent.click(screen.getByRole("button", { name: "Verificar" }));
    expect(await screen.findByText("Constancia válida")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/verificar/KI-2026-001234");
  });
});

describe("catálogo de la academia", () => {
  it("muestra diplomados con precio e IVA, cursos gratuitos y el estado de inscripción", async () => {
    asMvz();
    mockApi({ "/api/me/inscripciones": [enrollment("odontologia", "approved"), enrollment("oftalmologia", "pending")] });
    renderApp("/academia");
    expect(await screen.findByText(PAID.title)).toBeInTheDocument();
    expect(await screen.findByText("Continuar curso")).toBeInTheDocument();
    expect(screen.getByText("Solicitud en revisión")).toBeInTheDocument();
    expect(screen.getAllByText("IVA por confirmar").length).toBeGreaterThan(0);
    expect(screen.queryByText(/examen por módulo|cada módulo/i)).toBeNull();
  });
});
