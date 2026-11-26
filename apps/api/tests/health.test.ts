import { describe, expect, it } from "vitest";
import { app } from "../src/app";

describe("GET /api/health", () => {
  it("responde ok", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });
  it("devuelve 404 en JSON para rutas desconocidas", async () => {
    const res = await app.request("/api/no-existe");
    expect(res.status).toBe(404);
  });
});
