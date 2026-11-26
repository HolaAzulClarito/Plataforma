import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ClubReward, ClubRule, MeResponse, MyCoursesResponse, PointsBalance } from "@kiron/shared";
import { session } from "../../state/session";
import { renderApp } from "../../test/utils";
import { mockApi, posts, FREE } from "../academia/testing";

const RULES: ClubRule[] = [
  { id: "leccion", nombre: "Completar una lección", puntos: 20, frecuencia: "Por lección" },
  { id: "curso", nombre: "Terminar un curso", puntos: 300, frecuencia: "Al aprobar el examen final" },
];
const REWARDS: ClubReward[] = [
  { id: "webinar-vip", nombre: "Lugar preferente en webinar en vivo", puntos: 500, icono: "video" },
  { id: "promo-3x2", nombre: "Promoción 3×2 en un producto participante", puntos: 3000, icono: "gift" },
];
const ME = (puntos: number): MeResponse => ({ rol: "mvz", usuario: { name: "Dra. Laura Méndez", email: "laura.mendez@clinica.mx", initials: "LM" }, puntos });
const COURSES: MyCoursesResponse = {
  cursos: [{ course: FREE, hechas: 1, total: 16, pct: 6, intentosUsados: 0, intentosMax: 3, notaFinal: null, examen: "bloqueado", constancia: null }],
  solicitudes: [],
};

describe("Club MVZ", () => {
  it("canjea un premio con la API y actualiza el saldo", async () => {
    act(() => session.login("mvz"));
    let saldo = 1240;
    let canjeados: string[] = [];
    const calls = mockApi({
      "/api/sesion": () => ME(saldo),
      "/api/me/puntos": (): PointsBalance => ({ saldo, canjeados, movimientos: [] }),
      "/api/club/reglas": RULES,
      "/api/club/premios": REWARDS,
      "/api/me/cursos": COURSES,
      "/api/me/canjes": (m: string, body: unknown) => {
        if (m === "POST") {
          saldo -= 500;
          canjeados = [(body as { premio: string }).premio];
        }
        return { saldo, premio: REWARDS[0], inscripcion: null };
      },
    });
    renderApp("/panel/club");
    expect(await screen.findByText("1,240")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Te faltan 1,760" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Canjear" }));
    const dialog = screen.getByRole("dialog", { name: "Confirmar canje" });
    expect(dialog).toHaveTextContent("Te quedarán 740.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Canjear" }));
    await waitFor(() => expect(posts(calls, "/api/me/canjes")).toEqual([{ premio: "webinar-vip" }]));
    expect(await screen.findByText("740")).toBeInTheDocument();
    expect(screen.getByText("Canjeado")).toBeInTheDocument();
  });
});

describe("panel del médico", () => {
  it("inicio: cursos, constancias y puntos desde la API; el menú de usuario muestra los puntos", async () => {
    act(() => session.login("mvz"));
    mockApi({
      "/api/sesion": ME(1240),
      "/api/me/cursos": COURSES,
      "/api/me/constancias": [{ folio: "KI-2026-001234", tipo: "diplomado", ref: "inmunologia", titulo: "Módulo 1", fecha: "12/09/2026", origen: "migrada" }],
      "/api/me/puntos": { saldo: 1240, canjeados: [], movimientos: [] },
      "/api/club/premios": REWARDS,
    });
    renderApp("/panel");
    expect(await screen.findByText("1 cursos en curso")).toBeInTheDocument();
    expect(await screen.findByText("1 constancias")).toBeInTheDocument();
    expect(await screen.findByText("1,240 puntos")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mi cuenta" }));
    expect(await screen.findByRole("menuitem", { name: /Club MVZ · 1,240 pts/ })).toBeInTheDocument();
  });

  it("mis cursos: tabla con lecciones, intentos y estado del examen final", async () => {
    act(() => session.login("mvz"));
    mockApi({ "/api/me/cursos": COURSES });
    renderApp("/panel/cursos");
    const row = (await screen.findAllByText(FREE.title)).find((n) => n.closest("tr"))!.closest("tr")!;
    expect(row).toHaveTextContent("1 de 16");
    expect(row).toHaveTextContent("0 de 3");
    expect(row).toHaveTextContent("Bloqueado");
  });
});
