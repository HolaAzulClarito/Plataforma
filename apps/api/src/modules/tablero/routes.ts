import { Hono } from "hono";
import { z } from "zod";
import { v } from "../../lib/http";
import { dashboard, dashboardCsv } from "./service";

export const tableroAdmin = new Hono().get("/tablero", v("query", z.object({ formato: z.enum(["json", "csv"]).optional() })), async (c) => {
  if (c.req.valid("query").formato === "csv")
    return c.body(await dashboardCsv(), 200, { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="tablero-kiron-demo.csv"' });
  return c.json(await dashboard());
});
