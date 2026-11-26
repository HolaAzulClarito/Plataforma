import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MyWebinarStatus, WebinarSummary } from "@kiron/shared";
import { session } from "../../state/session";
import { renderApp } from "../../test/utils";
import { mockApi, posts } from "../academia/testing";

const W: WebinarSummary = {
  slug: "proximo",
  titulo: "¿Antojo, hábito o problema?",
  subtitulo: "El misterio detrás de la coprofagia",
  tituloEn: "",
  subtituloEn: "",
  grado: "MVZ",
  ponente: "Ponente de ejemplo",
  inicio: "2099-12-15T20:00:00-06:00",
  fecha: "15/12/2099",
  hora: "20:00",
  duracion: 90,
  umbral: 45,
  flyer: null,
  modo: "cloudflare",
  publicado: true,
};
const st = (over: Partial<MyWebinarStatus> = {}): MyWebinarStatus => ({ slug: "proximo", registrado: false, asistio: false, youtube: null, puntos: 0, constancia: null, ...over });

describe("landing del webinar", () => {
  it("registro con la API: el médico pasa a 'Ya estás registrado'", async () => {
    act(() => session.login("mvz"));
    let reg = false;
    const calls = mockApi({
      "/api/webinars": [W],
      "/api/me/webinars/proximo": () => st({ registrado: reg }),
      "/api/me/webinars/proximo/registro": () => {
        reg = true;
        return st({ registrado: true });
      },
    });
    renderApp("/webinar/proximo");
    fireEvent.click(await screen.findByRole("button", { name: /^Registrarme$/ }));
    expect(await screen.findByText("Ya estás registrado")).toBeInTheDocument();
    expect(posts(calls, "/api/me/webinars/proximo/registro")).toHaveLength(1);
    expect(screen.getByText("Registro confirmado. Te recordamos por correo 24 horas y 1 hora antes.")).toBeInTheDocument();
  });

  it("sala en vivo: la asistencia se registra en la API y suma los puntos que devuelve", async () => {
    act(() => session.login("mvz"));
    let att = false;
    const calls = mockApi({
      "/api/webinars": [W],
      "/api/me/webinars/proximo": () => st({ registrado: true, asistio: att }),
      "/api/me/webinars/proximo/asistencia": () => {
        att = true;
        return st({ registrado: true, asistio: true, puntos: 50 });
      },
    });
    renderApp("/webinar/proximo");
    fireEvent.click(await screen.findByRole("button", { name: "En vivo" }));
    fireEvent.click(await screen.findByRole("button", { name: "Simular 45 minutos vistos" }));
    await waitFor(() => expect(posts(calls, "/api/me/webinars/proximo/asistencia")).toHaveLength(1));
    expect(await screen.findByText("Asistencia registrada · +50 puntos Club MVZ")).toBeInTheDocument();
    expect(await screen.findByText("Tu asistencia quedó registrada · +50 puntos Club MVZ")).toBeInTheDocument();
  });

  it("sin sesión pide iniciar sesión para registrarse", async () => {
    mockApi({ "/api/webinars": [W] });
    renderApp("/webinar/proximo");
    fireEvent.click(await screen.findByRole("button", { name: /Registrarme al webinar/ }));
    expect(screen.getByRole("dialog", { name: "Tu cuenta de médico" })).toBeInTheDocument();
  });
});
