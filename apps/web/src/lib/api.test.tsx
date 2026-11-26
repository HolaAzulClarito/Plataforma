import { render, screen, waitFor } from "@testing-library/react";
import { DEMO_ROLE_HEADER } from "@kiron/shared";
import { describe, expect, it, vi } from "vitest";
import { session } from "../state/session";
import { mockFetch } from "../test/utils";
import { ApiError, apiPost, useApi } from "./api";

function Probe({ path }: { path: string }) {
  const { data, error, status, loading } = useApi<string[]>(path);
  if (loading) return <p>cargando</p>;
  if (error) return <p>error: {error} ({status})</p>;
  return <p>datos: {data?.join(",")}</p>;
}

describe("cliente de API", () => {
  it("useApi pasa por loading y entrega los datos", async () => {
    mockFetch({ "/api/categorias": ["A", "B"] });
    render(<Probe path="/categorias" />);
    expect(screen.getByText("cargando")).toBeInTheDocument();
    expect(await screen.findByText("datos: A,B")).toBeInTheDocument();
  });

  it("envía el rol de demo en el encabezado cuando hay sesión", async () => {
    session.login("admin");
    const calls = mockFetch({ "/api/cursos": [] });
    render(<Probe path="/cursos" />);
    await waitFor(() => expect(calls).toHaveLength(1));
    const headers = calls[0]!.init!.headers as Record<string, string>;
    expect(headers[DEMO_ROLE_HEADER]).toBe("admin");
  });

  it("sin sesión no envía el encabezado de rol", async () => {
    const calls = mockFetch({ "/api/cursos": [] });
    render(<Probe path="/cursos" />);
    await waitFor(() => expect(calls).toHaveLength(1));
    expect((calls[0]!.init!.headers as Record<string, string>)[DEMO_ROLE_HEADER]).toBeUndefined();
  });

  it("muestra el mensaje { error } de la API con su status", async () => {
    mockFetch({});
    render(<Probe path="/productos/x" />);
    expect(await screen.findByText("error: No encontrado (404)")).toBeInTheDocument();
  });

  it("apiPost manda JSON y lanza ApiError con el mensaje de la API", async () => {
    const calls = mockFetch({});
    await expect(apiPost("/webinars/proximo/registro", { a: 1 })).rejects.toEqual(new ApiError("No encontrado", 404, { error: "No encontrado" }));
    expect(calls[0]!.init!.method).toBe("POST");
    expect(calls[0]!.init!.body).toBe('{"a":1}');
  });
});

describe("ApiError conserva el cuerpo del error", () => {
  it("expone body con campos extra (p. ej. pendientes en un 409)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "Con pendientes", pendientes: ["a", "b"] }), { status: 409, headers: { "Content-Type": "application/json" } })),
    );
    const e = await apiPost("/admin/editor/cursos/x/publicar").catch((x: unknown) => x);
    expect(e).toBeInstanceOf(ApiError);
    expect((e as ApiError).status).toBe(409);
    expect((e as ApiError).message).toBe("Con pendientes");
    expect((e as ApiError).body).toEqual({ error: "Con pendientes", pendientes: ["a", "b"] });
  });
});
