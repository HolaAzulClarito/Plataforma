/* Páginas del sitio (paginas(), APP.editPage, moveBlock, addBlock, publishPage). */
import { useState } from "react";
import type { Lang, PageCreateRequest, PageList, PageUpdateRequest, SitePage } from "@kiron/shared";
import { Icon } from "../../components/Icon";
import { ApiStatus } from "../../components/ui";
import { useT } from "../../i18n";
import { apiPatch, apiPost } from "../../lib/api";
import { closeModal, openModal } from "../../state/modal";
import { navigate } from "../../state/session";
import { toast } from "../../state/toasts";
import { bumpAdmin, EmptyRow, failToast, StateTag, useAdminApi } from "./common";
import { MainHead } from "./Shell";

const NEW_BLOCKS = ["Testimonios", "Preguntas frecuentes", "Galería", "Banner de webinar"];

function PageEditor({ page }: { page: SitePage | null }) {
  const t = useT();
  const [titulo, setTitulo] = useState(page?.titulo ?? "Nueva página");
  const [url, setUrl] = useState(page?.url ?? "/nueva-pagina/");
  const [blocks, setBlocks] = useState<string[]>(page?.bloques.length ? page.bloques : ["Héroe", "Texto", "Productos destacados", "Formulario"]);
  const [nb, setNb] = useState(NEW_BLOCKS[0]!);
  const [seoT, setSeoT] = useState(page?.seo.titulo ?? "Nueva página · Kirón");
  const [seoD, setSeoD] = useState(page?.seo.descripcion ?? "Laboratorio veterinario mexicano");
  const [lang, setLang] = useState<Lang>(page?.seo.idioma ?? "es");
  const [busy, setBusy] = useState(false);

  const move = (j: number, d: number) =>
    setBlocks((b) => {
      const k = j + d;
      if (k < 0 || k >= b.length) return b;
      const c = b.slice();
      [c[j], c[k]] = [c[k]!, c[j]!];
      return c;
    });

  const publish = async () => {
    setBusy(true);
    try {
      const seo = { titulo: seoT.trim(), descripcion: seoD.trim(), idioma: lang };
      let id = page?.id;
      if (id === undefined) {
        const body: PageCreateRequest = { titulo: titulo.trim(), url: url.trim(), bloques: blocks };
        id = (await apiPost<SitePage>("/admin/paginas", body)).id;
      }
      const upd: PageUpdateRequest = { bloques: blocks, seo, ...(page ? { titulo: titulo.trim(), url: url.trim() } : {}) };
      await apiPatch<SitePage>(`/admin/paginas/${id}`, upd);
      await apiPost<SitePage>(`/admin/paginas/${id}/publicar`);
      bumpAdmin();
      closeModal();
      toast("Página publicada · la versión anterior quedó guardada");
    } catch (e) {
      failToast(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-b editor">
      <div>
        <p className="l">{t("Bloques de la página")}</p>
        <ul className="blocks" id="blocks">
          {blocks.map((b, j) => (
            <li key={`${b}-${j}`}>
              <Icon name="sliders-horizontal" /> {t(b)}
              <span>
                <button type="button" className="mini" onClick={() => move(j, -1)} aria-label={`${t("Subir")} · ${t(b)}`} disabled={j === 0}>
                  ↑
                </button>
                <button type="button" className="mini" onClick={() => move(j, 1)} aria-label={`${t("Bajar")} · ${t(b)}`} disabled={j === blocks.length - 1}>
                  ↓
                </button>
              </span>
            </li>
          ))}
        </ul>
        <div className="add-block">
          <label className="sr" htmlFor="nb">
            {t("Bloque nuevo")}
          </label>
          <select className="select" id="nb" value={nb} onChange={(e) => setNb(e.target.value)}>
            {NEW_BLOCKS.map((b) => (
              <option key={b} value={b}>
                {t(b)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (blocks.length >= 30) return;
              setBlocks((b) => [...b, nb]);
              toast("Bloque agregado");
            }}
          >
            <Icon name="plus" /> {t("Agregar")}
          </button>
        </div>
      </div>
      <div>
        {page ? null : (
          <>
            <div className="form-row">
              <label className="l" htmlFor="pgT">
                {t("Nombre de la página")}
              </label>
              <input className="input" id="pgT" maxLength={120} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div className="form-row">
              <label className="l" htmlFor="pgU">
                {t("URL")}
              </label>
              <input className="input" id="pgU" maxLength={120} value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
          </>
        )}
        <p className="l">{t("SEO")}</p>
        <div className="form-row">
          <label className="l" htmlFor="pgST">
            {t("Título")}
          </label>
          <input className="input" id="pgST" maxLength={120} value={seoT} onChange={(e) => setSeoT(e.target.value)} />
        </div>
        <div className="form-row">
          <label className="l" htmlFor="pgSD">
            {t("Descripción")}
          </label>
          <input className="input" id="pgSD" maxLength={300} value={seoD} onChange={(e) => setSeoD(e.target.value)} />
        </div>
        <div className="form-row">
          <label className="l" htmlFor="pgSL">
            {t("Idioma")}
          </label>
          <select className="select" id="pgSL" value={lang} onChange={(e) => setLang(e.target.value === "en" ? "en" : "es")}>
            <option value="es">{t("Español")}</option>
            <option value="en">English</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              closeModal();
              navigate(page?.url === "/" || !page ? "/" : page.url);
            }}
          >
            <Icon name="eye" /> {t("Vista previa")}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => toast("Programada para el 02/11/2026 09:00")}>
            <Icon name="calendar" /> {t("Programar")}
          </button>
          <button type="button" className="btn btn-primary" onClick={publish} disabled={busy}>
            {t("Publicar")}
          </button>
        </div>
      </div>
    </div>
  );
}

const openEditor = (p: SitePage | null) => openModal({ title: p ? `Editar · ${p.titulo}` : "Editar · Nueva página", content: <PageEditor page={p} /> });

export function PaginasPage() {
  const t = useT();
  const { data, loading, error, refetch } = useAdminApi<PageList>("/admin/paginas");
  return (
    <>
      <MainHead
        title="Páginas"
        sub="Contenido del sitio · datos de ejemplo"
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => openEditor(null)}>
            <Icon name="plus" /> {t("Nueva página")}
          </button>
        }
      />
      <ApiStatus loading={loading && !data} error={error} onRetry={refetch} />
      {data ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">{t("Página")}</th>
                <th scope="col">{t("URL")}</th>
                <th scope="col">{t("Estado")}</th>
                <th scope="col">{t("Última edición")}</th>
                <th scope="col">
                  <span className="sr">{t("Acciones")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.id}>
                  <td>
                    <b style={{ color: "var(--web-navy)" }}>{t(p.titulo)}</b>
                  </td>
                  <td>
                    <code>{p.url}</code>
                  </td>
                  <td>
                    <StateTag cls={p.estado === "Publicada" ? "st-ok" : "st-draft"}>{t(p.estado)}</StateTag>
                  </td>
                  <td>{p.edicion}</td>
                  <td className="nowrap">
                    <button type="button" className="mini" onClick={() => openEditor(p)} aria-label={`${t("Editar")} · ${t(p.titulo)}`}>
                      <Icon name="pencil" /> {t("Editar")}
                    </button>
                  </td>
                </tr>
              ))}
              {!data.length ? <EmptyRow cols={5}>{t("Sin páginas.")}</EmptyRow> : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
