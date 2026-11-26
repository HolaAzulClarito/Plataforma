import { Hono } from "hono";
import { v } from "../../lib/http";
import { IdParam } from "../../lib/schemas";
import { approveVerification, listVerifications } from "./service";

export const medicosAdmin = new Hono()
  .get("/medicos/verificaciones", async (c) => c.json(await listVerifications()))
  .post("/medicos/verificaciones/:id/aprobar", v("param", IdParam), async (c) => c.json(await approveVerification(c.req.valid("param").id)));
