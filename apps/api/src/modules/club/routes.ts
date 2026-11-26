import { Hono } from "hono";
import { z } from "zod";
import { DEMO_USER } from "@kiron/shared";
import { v } from "../../lib/http";
import { required } from "../../lib/schemas";
import { addReward, deleteReward, listRewards, listRules, myPoints, redeem, updateRule } from "./service";

const ME = DEMO_USER.name;
const RewardId = z.string().min(1).max(80).regex(/^[a-z0-9-]+$/);

export const clubPublic = new Hono()
  .get("/club/reglas", async (c) => c.json(await listRules()))
  .get("/club/premios", async (c) => c.json(await listRewards()));

export const clubMe = new Hono()
  .get("/puntos", async (c) => c.json(await myPoints(ME)))
  .post("/canjes", v("json", z.object({ premio: RewardId })), async (c) => c.json(await redeem(ME, c.req.valid("json").premio), 201));

export const clubAdmin = new Hono()
  .put("/club/reglas/:id", v("param", z.object({ id: z.enum(["cedula", "webinar", "curso", "leccion"]) })), v("json", z.object({ puntos: z.number().int().min(0).max(100_000) })), async (c) =>
    c.json(await updateRule(c.req.valid("param").id, c.req.valid("json").puntos)),
  )
  .post("/club/premios", v("json", z.object({ nombre: required(120), puntos: z.number().int().min(1).max(1_000_000) })), async (c) => {
    const b = c.req.valid("json");
    return c.json(await addReward(b.nombre, b.puntos), 201);
  })
  .delete("/club/premios/:id", v("param", z.object({ id: RewardId })), async (c) => {
    await deleteReward(c.req.valid("param").id);
    return c.body(null, 204);
  });
