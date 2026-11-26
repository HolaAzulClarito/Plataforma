import { Hono } from "hono";
import { v } from "../../lib/http";
import { SlugParam } from "../../lib/schemas";
import { listCategories, listCountries, listDistributors, listProducts, listReps, listVideos, productDetail } from "./service";

/* Público. El filtrado y orden de productos se hacen en el cliente, como en el demo. */
export const catalogoPublic = new Hono()
  .get("/categorias", async (c) => c.json(await listCategories()))
  .get("/productos", async (c) => c.json(await listProducts()))
  .get("/productos/:slug", v("param", SlugParam), async (c) => c.json(await productDetail(c.req.valid("param").slug)))
  .get("/representantes", async (c) => c.json(await listReps()))
  .get("/distribuidores", async (c) => c.json(await listDistributors()))
  .get("/paises", async (c) => c.json(await listCountries()))
  .get("/videos", async (c) => c.json(await listVideos()));
