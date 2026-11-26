/* Opciones de curso para los filtros de la academia (catálogo + editor), leídas de GET /api/admin/cursos. */
import type { AdminCourseList } from "@kiron/shared";
import { useAdminApi } from "../common";

export type CourseOption = [slug: string, titulo: string];

export function useCourseOptions(): CourseOption[] {
  const { data } = useAdminApi<AdminCourseList>("/admin/cursos");
  return (data?.items ?? []).map((c): CourseOption => [c.slug, c.titulo]);
}

export const courseTitleOf = (opts: CourseOption[], slug: string): string => opts.find((o) => o[0] === slug)?.[1] ?? slug;
