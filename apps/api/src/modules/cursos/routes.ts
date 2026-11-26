import { Hono } from "hono";
import type { RoleVars } from "../../lib/demo-role";
import { v } from "../../lib/http";
import { ExamConfigSchema, SlugParam } from "../../lib/schemas";
import { AdminCoursesQuery, CourseBulkBody, CourseStateBody, PublicCoursesQuery } from "./schemas";
import {
  adminCourseList,
  adminPreview,
  bulkCourseState,
  courseDetail,
  getExamConfig,
  listPublicCourses,
  putExamConfig,
  setCatalogState,
} from "./service";

export const cursosPublic = new Hono<RoleVars>()
  .get("/cursos", v("query", PublicCoursesQuery), async (c) => {
    const todos = c.req.valid("query").todos === "1" && c.get("role") === "admin";
    return c.json(await listPublicCourses(todos));
  })
  .get("/cursos/:slug", v("param", SlugParam), async (c) => {
    const role = c.get("role");
    return c.json(await courseDetail(c.req.valid("param").slug, { admin: role === "admin", withSession: !!role }));
  });

export const cursosAdmin = new Hono()
  .get("/cursos", v("query", AdminCoursesQuery), async (c) => c.json(await adminCourseList(c.req.valid("query"))))
  .post("/cursos/lote", v("json", CourseBulkBody), async (c) => {
    const b = c.req.valid("json");
    return c.json(await bulkCourseState(b.claves, b.estado));
  })
  .patch("/cursos/:slug", v("param", SlugParam), v("json", CourseStateBody), async (c) => {
    const b = c.req.valid("json");
    return c.json(await setCatalogState(c.req.valid("param").slug, b.estado, b.fecha));
  })
  .get("/cursos/:slug/vista", v("param", SlugParam), async (c) => c.json(await adminPreview(c.req.valid("param").slug)))
  .get("/cursos/:slug/examen", v("param", SlugParam), async (c) => c.json(await getExamConfig(c.req.valid("param").slug)))
  .put("/cursos/:slug/examen", v("param", SlugParam), v("json", ExamConfigSchema), async (c) =>
    c.json(await putExamConfig(c.req.valid("param").slug, c.req.valid("json"))),
  );
