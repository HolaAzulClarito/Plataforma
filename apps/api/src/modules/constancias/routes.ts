import { Hono } from "hono";
import { z } from "zod";
import { DEMO_USER, FOLIO_RE } from "@kiron/shared";
import { v } from "../../lib/http";
import { myCertificateDocument, myCertificates, verifyFolio } from "./service";

const ME = DEMO_USER.name;
/* Acepta minúsculas y espacios alrededor, como el formulario de verificación del demo. */
const FolioParam = z.object({ folio: z.string().max(40).transform((s) => s.trim().toUpperCase()).pipe(z.string().regex(FOLIO_RE)) });

export const constanciasPublic = new Hono().get("/constancias/:folio", v("param", FolioParam), async (c) => c.json(await verifyFolio(c.req.valid("param").folio)));

export const constanciasMe = new Hono()
  .get("/constancias", async (c) => c.json(await myCertificates(ME)))
  .get("/constancias/:folio", v("param", FolioParam), async (c) => c.json(await myCertificateDocument(ME, c.req.valid("param").folio)));
