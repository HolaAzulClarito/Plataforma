import { Hono } from "hono";
import { DEMO_USER } from "@kiron/shared";
import { v } from "../../lib/http";
import { SlugParam } from "../../lib/schemas";
import { WebinarCreateBody } from "./schemas";
import { adminWebinars, attend, attendees, createWebinar, getWebinar, listWebinars, myWebinar, nextWebinar, register } from "./service";

const ME = DEMO_USER.name;

/* "/webinars/proximo" se declara antes de "/webinars/:slug" para conservar el contrato NextWebinar. */
export const webinarsPublic = new Hono()
  .get("/webinars/proximo", async (c) => c.json(await nextWebinar()))
  .get("/webinars", async (c) => c.json(await listWebinars()))
  .get("/webinars/:slug", v("param", SlugParam), async (c) => c.json(await getWebinar(c.req.valid("param").slug)));

export const webinarsMe = new Hono()
  .get("/webinars/:slug", v("param", SlugParam), async (c) => c.json(await myWebinar(ME, c.req.valid("param").slug)))
  .post("/webinars/:slug/registro", v("param", SlugParam), async (c) => c.json(await register(ME, c.req.valid("param").slug)))
  .post("/webinars/:slug/asistencia", v("param", SlugParam), async (c) => c.json(await attend(ME, c.req.valid("param").slug)));

export const webinarsAdmin = new Hono()
  .get("/webinars", async (c) => c.json(await adminWebinars()))
  .post("/webinars", v("json", WebinarCreateBody), async (c) => c.json(await createWebinar(c.req.valid("json")), 201))
  .get("/webinars/:slug/asistentes", v("param", SlugParam), async (c) => c.json(await attendees(c.req.valid("param").slug)));
