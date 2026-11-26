/* Pestaña Cursos: estados, filtros, acciones en lote (APP.crsF, crsSel, crsAll, crsBulk) y examen de cada curso. */
import { useState } from "react";
import { Link } from "react-router";
import { type AdminCourseList, type AdminCourseRow, type CourseBulkRequest, type CourseState, type CourseStateFilter, type DateRange } from "@kiron/shared";
import { Icon } from "../../../components/Icon";
import { Price } from "../../../components/ProductCard";
import { ApiStatus } from "../../../components/ui";
import { useT } from "../../../i18n";
import { apiPost } from "../../../lib/api";
import { toast } from "../../../state/toasts";
import { CST_CLS, CSTATES, EmptyRow, FECHAS, FilterSelect, qs, SearchBox, StateTag, useAction, useAdminApi } from "../common";
import { openExamConfig } from "./Examenes";

const PILLS: Array<[CourseStateFilter, string]> = [
  ["todos", "Todos"],
  ["publicado", "Publicados"],
  ["borrador", "Borradores"],
  ["programado", "Programados"],
  ["privado", "Privados"],
  ["papelera", "Papelera"],
];

const BULK: Array<[string, CourseState, string]> = [
  ["publicar", "publicado", "Publicar"],
  ["borrador", "borrador", "Pasar a borrador"],
  ["privado", "privado", "Hacer privado"],
  ["papelera", "papelera", "Mover a la papelera"],
  ["restaurar", "borrador", "Restaurar de la papelera"],
];

export const editorHref = (r: Pick<AdminCourseRow, "key">) => `/admin/academia/editor/${r.key.slice(2)}/0/0`;
const rowHref = (r: AdminCourseRow) => (r.nuevo ? editorHref(r) : `/academia/curso/${r.slug}`);

export function CursosTab() {
  const t = useT();
  const [st, setSt] = useState<CourseStateFilter>("todos");
  const [cat, setCat] = useState("");
  const [rango, setRango] = useState<DateRange>("");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState("publicar");
  const all = useAdminApi<AdminCourseList>("/admin/cursos");
  const { data, loading, error, refetch } = useAdminApi<AdminCourseList>("/admin/cursos" + qs({ estado: st, cat, q, rango }));
  const { busy, run } = useAction();
  const rows = data?.items ?? [];
  const cats = [...new Set((all.data?.items ?? []).map((r) => r.cat).filter(Boolean))];
  /* Cambiar un filtro limpia la selección, como el demo. */
  const filter = (fn: () => void) => {
    fn();
    setSel(new Set());
  };
  const toggle = (key: string, on: boolean) =>
    setSel((s) => {
      const n = new Set(s);
      if (on) n.add(key);
      else n.delete(key);
      return n;
    });
  const allOn = rows.length > 0 && rows.every((r) => sel.has(r.key));
  const apply = async () => {
    if (!sel.size) {
      toast("Selecciona al menos un curso");
      return;
    }
    const estado = BULK.find((b) => b[0] === bulk)?.[1] ?? "borrador";
    const body: CourseBulkRequest = { claves: [...sel], estado };
    const r = await run(
      () => apiPost<{ actualizados: number; omitidos: number }>("/admin/cursos/lote", body),
      (x) => (x.actualizados === 1 ? "1 curso actualizado" : `${x.actualizados} cursos actualizados`) + (x.omitidos ? ` · ${x.omitidos} sin publicar porque tienen pendientes` : ""),
    );
    if (r) setSel(new Set());
  };

  return (
    <>
      <div className="pills" role="group" aria-label={t("Estado")}>
        {PILLS.map(([k, label]) => (
          <button key={k} type="button" className={st === k ? "on" : ""} aria-pressed={st === k} onClick={() => filter(() => setSt(k))}>
            {t(label)} <em>{data?.conteo[k] ?? all.data?.conteo[k] ?? 0}</em>
          </button>
        ))}
      </div>
      <div className="tool-row">
        <FilterSelect id="cf1" label="Categoría" value={cat} options={[["", "Todas"], ...cats.map((x): [string, string] => [x, x])]} onChange={(v) => filter(() => setCat(v))} />
        <FilterSelect id="cf2" label="Fecha" value={rango} options={FECHAS} onChange={(v) => filter(() => setRango(v as DateRange))} />
        <span className="grow" />
        <SearchBox value={q} placeholder="Buscar curso" onSearch={(v) => filter(() => setQ(v))} />
      </div>
      <div className="bulk">
        <label className="ce-chk">
          <input type="checkbox" checked={allOn} onChange={(e) => setSel(e.target.checked ? new Set(rows.map((r) => r.key)) : new Set())} />{" "}
          <span>
            {t("Seleccionar los")} {rows.length} {t("resultados")}
          </span>
        </label>
        <span className="bulk-n" aria-live="polite">
          {sel.size ? (sel.size === 1 ? t("1 seleccionado") : `${sel.size} ${t("seleccionados")}`) : t("Ninguno seleccionado")}
        </span>
        <span className="grow" />
        <label className="sr" htmlFor="cba">
          {t("Acción en lote")}
        </label>
        <select className="input" id="cba" value={bulk} onChange={(e) => setBulk(e.target.value)}>
          {BULK.map(([k, , label]) => (
            <option key={k} value={k}>
              {t(label)}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-primary btn-sm" onClick={apply} disabled={busy}>
          {t("Aplicar")}
        </button>
      </div>
      <ApiStatus loading={loading && !data} error={error} onRetry={refetch} />
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th className="chk" scope="col">
                <span className="sr">{t("Seleccionar")}</span>
              </th>
              <th scope="col">{t("Curso")}</th>
              <th scope="col">{t("Módulos")}</th>
              <th scope="col">{t("Lecciones")}</th>
              <th scope="col">{t("Precio")}</th>
              <th scope="col">{t("Fecha")}</th>
              <th scope="col">{t("Estado")}</th>
              <th scope="col">
                <span className="sr">{t("Acciones")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td className="chk">
                  <input type="checkbox" aria-label={`${t("Seleccionar curso")} · ${r.titulo}`} checked={sel.has(r.key)} onChange={(e) => toggle(r.key, e.target.checked)} />
                </td>
                <td>
                  <Link to={rowHref(r)}>
                    <b>{r.titulo}</b>
                  </Link>
                  <small style={{ display: "block", color: "var(--muted)" }}>
                    {r.cat ? t(r.cat) : "—"} · {r.autor ? r.autor : t("Autor sin capturar")}
                  </small>
                </td>
                <td>{r.temas}</td>
                <td>{r.lecciones}</td>
                <td className="nowrap">
                  {r.oferta ? (
                    <span className="adm-price">
                      <Price amount={r.oferta} was={r.regular > r.oferta ? r.regular : undefined} />
                    </span>
                  ) : (
                    t("Gratuito")
                  )}
                </td>
                <td className="nowrap">{r.fecha}</td>
                <td>
                  <StateTag cls={CST_CLS[r.estado]}>{t(CSTATES[r.estado])}</StateTag>
                </td>
                <td className="nowrap">
                  {r.nuevo ? (
                    <Link className="mini" to={rowHref(r)}>
                      <Icon name="pencil" /> {t("Editar")}
                    </Link>
                  ) : (
                    <>
                      <Link className="mini" to={rowHref(r)}>
                        <Icon name="eye" /> {t("Ver")}
                      </Link>{" "}
                      <button type="button" className="mini" onClick={() => openExamConfig(r.slug, r.titulo)} aria-label={`${t("Examen")} · ${r.titulo}`}>
                        <Icon name="settings" /> {t("Examen")}
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {data && !rows.length ? <EmptyRow cols={8}>{t("No hay cursos con esos filtros.")}</EmptyRow> : null}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 12 }}>
        {t(
          "El precio se muestra en la página del curso como referencia; no se cobra en línea ni da acceso. El acceso lo da la inscripción aprobada. Un curso en borrador, privado o en la papelera deja de verse en la academia, pero las constancias que ya emitió se conservan.",
        )}
      </p>
    </>
  );
}
