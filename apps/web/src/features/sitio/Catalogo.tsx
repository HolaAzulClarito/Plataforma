/* /productos: catálogo con filtro por clasificación, búsqueda sin acentos, orden y conteo anunciado (productos()). */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { ApiStatus, Notice, PageHead } from "../../components/ui";
import { Icon } from "../../components/Icon";
import { ProductCard } from "../../components/ProductCard";
import { useT } from "../../i18n";
import { ALL, countByCat, filterFromParams, filterProducts, resultParts, type CatalogFilter, type CatalogSort } from "./catalog";
import { useCategorias, useProductos } from "./data";

/* Último filtro usado en la sesión (el demo lo guardaba en su estado S). */
let lastFilter: CatalogFilter = { cat: ALL, q: "", sort: "rel" };

export function Catalogo() {
  const { search } = useLocation();
  /* key = query string: si cambian ?cat / ?q / ?focus, el filtro se reinicia desde la URL. */
  return <CatalogoView key={search} />;
}

function CatalogoView() {
  const t = useT();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const productos = useProductos();
  const categorias = useCategorias();
  const [filter, setFilter] = useState<CatalogFilter>(() => filterFromParams(params, lastFilter));
  const [draft, setDraft] = useState(filter.q);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    lastFilter = filter;
  }, [filter]);

  useEffect(() => {
    if (!params.has("focus")) return;
    const id = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(id);
  }, [params]);

  const all = useMemo(() => productos.data ?? [], [productos.data]);
  const list = useMemo(() => filterProducts(all, filter), [all, filter]);
  const cats = [ALL, ...(categorias.data ?? [])];
  const parts = resultParts(list.length, filter.q, filter.cat);

  const clear = () => {
    lastFilter = { ...filter, cat: ALL, q: "" };
    setFilter(lastFilter);
    setDraft("");
    navigate("/productos?focus=1");
  };

  return (
    <>
      <PageHead eyebrow="Catálogo" title="Nuestros productos" lead="Busca por nombre o clasificación." />
      <section className="sec" style={{ paddingTop: 40 }}>
        <div className="wrap catalog">
          <aside className="filters" aria-label={t("Filtros")}>
            <h4 id="cat-h">{t("Clasificación")}</h4>
            <div role="radiogroup" aria-labelledby="cat-h">
              {cats.map((c) => (
                <label key={c}>
                  <input type="radio" name="cat" value={c} checked={filter.cat === c} onChange={() => setFilter((f) => ({ ...f, cat: c }))} /> {t(c)}
                  <span className="count">{countByCat(all, c)}</span>
                </label>
              ))}
            </div>
            <Notice style={{ marginTop: 16 }}>
              {t("Catálogo tomado de kironmexico.com el 18/11/2026. Los filtros por especie, forma y vía se activan con las fichas estructuradas.")}
            </Notice>
          </aside>
          <div>
            <form
              className="search-big"
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                setFilter((f) => ({ ...f, q: draft.trim() }));
              }}
            >
              <Icon name="search" />
              <input
                ref={inputRef}
                id="q"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setFilter((f) => ({ ...f, q: e.target.value }));
                }}
                placeholder={t("Ej. Kir-Anthel, Vibix, oftálmicos")}
                aria-label={t("Buscar productos")}
                autoComplete="off"
              />
              {filter.q ? (
                <button type="button" className="clear-x" aria-label={t("Limpiar búsqueda")} onClick={clear}>
                  <Icon name="x" />
                </button>
              ) : null}
              <button className="btn btn-primary btn-sm" style={{ borderRadius: 50 }} type="submit">
                {t("Buscar")}
              </button>
            </form>
            <div className="result-meta">
              <span id="rcount" aria-live="polite">
                {productos.data ? (
                  <>
                    {t(parts.count)}
                    {parts.query ? (
                      <>
                        {" "}
                        {t("para")} “{parts.query}”
                      </>
                    ) : null}
                    {parts.inCat ? (
                      <>
                        {" "}
                        {t("en")} {t(parts.inCat)}
                      </>
                    ) : null}
                  </>
                ) : null}
              </span>
              <label className="sortsel">
                {t("Ordenar por")}{" "}
                <select id="sort" value={filter.sort} onChange={(e) => setFilter((f) => ({ ...f, sort: e.target.value as CatalogSort }))}>
                  <option value="rel">{t("Relevancia")}</option>
                  <option value="az">{t("Nombre A-Z")}</option>
                  <option value="new">{t("Novedades primero")}</option>
                </select>
              </label>
            </div>
            <ApiStatus loading={productos.loading && !productos.data} error={productos.error} onRetry={productos.refetch} />
            <div className="grid-p three" id="pgrid">
              {productos.data && list.length === 0 ? (
                <div className="empty" style={{ gridColumn: "1/-1" }}>
                  <Icon name="search" />
                  <p style={{ marginTop: 8 }}>
                    {t("No encontramos productos con ese criterio. Prueba con otro nombre o")}{" "}
                    <Link
                      to="/productos"
                      onClick={(e) => {
                        e.preventDefault();
                        clear();
                      }}
                    >
                      {t("limpia los filtros")}
                    </Link>
                    .
                  </p>
                </div>
              ) : (
                list.map((p) => <ProductCard key={p.slug} product={p} />)
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
