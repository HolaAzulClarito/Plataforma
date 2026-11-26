/* Hallazgo 3 del dictamen: "Salir" desde /panel o /admin no debe volver a iniciar la sesión (RequireRole). */
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getSession, session } from "../state/session";
import { mockFetch, renderApp } from "../test/utils";

const where = () => screen.getByTestId("location").textContent;

const logoutFromUserMenu = async () => {
  fireEvent.click(await screen.findByRole("button", { name: "Mi cuenta" }));
  fireEvent.click(within(document.getElementById("umenu-pop")!).getByRole("menuitem", { name: /Cerrar sesión/ }));
};

const expectLoggedOut = async () => {
  await waitFor(() => expect(getSession().role).toBeNull());
  expect(where()).toBe("/");
  /* Un ciclo más: RequireRole no debe haber reiniciado la sesión. */
  await act(async () => new Promise((r) => setTimeout(r, 10)));
  expect(getSession().role).toBeNull();
  expect(where()).toBe("/");
};

describe("cerrar sesión", () => {
  it("desde /panel con el menú de la cuenta", async () => {
    mockFetch();
    act(() => session.login("mvz"));
    renderApp("/panel");
    await logoutFromUserMenu();
    await expectLoggedOut();
  });

  it("desde /admin con el menú de la cuenta", async () => {
    mockFetch();
    act(() => session.login("admin"));
    renderApp("/admin");
    await logoutFromUserMenu();
    await expectLoggedOut();
  });

  it("desde /admin con el botón Salir del menú lateral", async () => {
    mockFetch();
    act(() => session.login("admin"));
    renderApp("/admin");
    fireEvent.click(await screen.findByRole("button", { name: "Salir" }));
    await expectLoggedOut();
  });
});
