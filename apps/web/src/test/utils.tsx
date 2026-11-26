/* Utilidades de prueba: mock de fetch por ruta y render de la app dentro de MemoryRouter. */
import type { ReactNode } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";
import { vi } from "vitest";
import { AppShell } from "../app/App";
import { I18nProvider } from "../i18n";
import { CATALOG } from "./fixtures";

export interface FetchCall {
  url: string;
  init?: RequestInit;
}

/* Sustituye fetch: responde 200 con `routes[url]` o 404 { error }. Devuelve la lista de llamadas. */
export function mockFetch(routes: Record<string, unknown> = CATALOG): FetchCall[] {
  const calls: FetchCall[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, init });
      const path = url.split("?")[0] ?? url;
      if (Object.hasOwn(routes, path)) return new Response(JSON.stringify(routes[path]), { status: 200, headers: { "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "No encontrado" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }),
  );
  return calls;
}

/* Muestra la URL actual para poder afirmar redirecciones. */
export function LocationProbe() {
  const l = useLocation();
  return <output data-testid="location">{l.pathname + l.search}</output>;
}

export function renderApp(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppShell />
      <LocationProbe />
    </MemoryRouter>,
  );
}

export function renderWithProviders(ui: ReactNode, path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <I18nProvider>{ui}</I18nProvider>
      <LocationProbe />
    </MemoryRouter>,
  );
}
