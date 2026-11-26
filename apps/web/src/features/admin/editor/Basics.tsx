/* Datos del curso (ceBasics y APP.ceBasicsSave/ceDescPrev/courseCover).
   Vista previa de la descripción HTML: NO se inserta en el DOM de la app. Se pinta dentro de un <iframe sandbox="">
   con srcDoc (origen opaco, sin scripts, sin formularios, sin navegación) y una CSP que bloquea todo salvo imágenes y
   estilos en línea. Así, aunque el texto escrito aún no pase por la limpieza del servidor, no puede ejecutar código ni
   leer la sesión. El servidor guarda la versión limpia (lista de etiquetas permitidas). */
import { useMemo, useState, type FormEvent } from "react";
import { todayIso, type CourseKind, type CourseState, type EditorCourseDetail, type EditorCourseUpdateRequest } from "@kiron/shared";
import { Icon } from "../../../components/Icon";
import { useT } from "../../../i18n";
import { apiPatch } from "../../../lib/api";
import { toast } from "../../../state/toasts";
import { bumpAdmin, CSTATES, failToast, readImage } from "../common";
import { COVER_RX, coverMsgs, NIVELES, priceError, useCategories } from "./CourseNew";
import { showIssues, type EditorApi } from "./Editor";

const PREVIEW_CSP = "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; font-src 'none'";
const escapeAttr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/* Documento aislado para la vista previa. El HTML del usuario va solo dentro del <body> del iframe sandbox. */
export const previewDoc = (html: string, emptyText: string) =>
  `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${escapeAttr(PREVIEW_CSP)}">` +
  `<style>body{font:15px/1.6 system-ui,sans-serif;color:#1d1d1b;margin:12px}img{max-width:100%;height:auto}</style></head>` +
  `<body>${html.trim() ? html : `<p>${escapeAttr(emptyText)}</p>`}</body></html>`;

export function DescPreview({ html, open }: { html: string; open: boolean }) {
  const t = useT();
  const doc = useMemo(() => previewDoc(html, t("Sin descripción.")), [html, t]);
  return (
    <details className="ce-prev" open={open}>
      <summary>{t("Vista previa de la descripción")}</summary>
      <iframe className="ce-desc ce-desc-frame" title={t("Vista previa de la descripción")} sandbox="" srcDoc={doc} referrerPolicy="no-referrer" />
    </details>
  );
}

export function BasicsForm({ api, onSaved }: { api: EditorApi; onSaved: (d: EditorCourseDetail) => void }) {
  const t = useT();
  const c = api.c;
  const cats = useCategories(c.categoria);
  const [f, setF] = useState({
    titulo: c.titulo,
    tituloEn: c.tituloEn,
    descripcion: c.descripcion,
    tipo: c.tipo as CourseKind,
    categoria: c.categoria,
    nivel: c.nivel,
    instructor: c.instructor,
    precioRegular: String(c.precioRegular),
    precio: String(c.precio),
    estado: (c.estado === "papelera" ? "borrador" : c.estado) as CourseState,
    fechaProg: c.fechaProg,
  });
  const [portada, setPortada] = useState<string | null | undefined>(undefined);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body: EditorCourseUpdateRequest = {
      titulo: f.titulo.trim(),
      tituloEn: f.tituloEn.trim(),
      descripcion: f.descripcion,
      tipo: f.tipo,
      categoria: f.categoria,
      nivel: f.nivel,
      instructor: f.instructor.trim(),
      precioRegular: Number(f.precioRegular),
      precio: Number(f.precio),
      estado: f.estado,
      fechaProg: f.estado === "programado" ? f.fechaProg : "",
      ...(portada !== undefined ? { portada } : {}),
    };
    const pe = priceError(body.precio!, body.precioRegular!);
    let msg = "";
    if (!body.titulo || !body.tituloEn) msg = "Escribe el título en español y en inglés.";
    else if (!body.instructor) msg = "Escribe el nombre del autor o ponente.";
    else if (pe) msg = pe;
    else if (f.estado === "programado" && !(f.fechaProg && f.fechaProg > todayIso())) msg = "Elige una fecha de publicación futura.";
    if (msg) {
      setErr(msg);
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const d = await apiPatch<EditorCourseDetail>(api.base, body);
      onSaved(d);
      bumpAdmin();
      const want = f.estado;
      if ((want === "publicado" || want === "programado") && d.curso.estado === "borrador" && d.pendientes.length) showIssues(d.pendientes);
      else toast(want === "programado" ? `Curso programado · ${f.fechaProg.split("-").reverse().join("/")}` : "Datos del curso guardados");
    } catch (ex) {
      failToast(ex);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel ce-basics" noValidate onSubmit={submit}>
      <div className="grid2">
        <div className="form-row">
          <label className="l" htmlFor="bTi">{t("Título en español")}</label>
          <input className="input" id="bTi" maxLength={140} value={f.titulo} onChange={set("titulo")} />
        </div>
        <div className="form-row">
          <label className="l" htmlFor="bTe">{t("Título en inglés")}</label>
          <input className="input" id="bTe" maxLength={140} value={f.tituloEn} onChange={set("tituloEn")} />
        </div>
      </div>
      <div className="form-row">
        <label className="l" htmlFor="bDe">{t("Descripción del curso (HTML con imágenes: temario, ponentes e información visual)")}</label>
        <textarea className="input ce-code" id="bDe" rows={8} maxLength={20000} value={f.descripcion} onChange={set("descripcion")} />
      </div>
      <DescPreview html={f.descripcion} open={!!c.descripcion} />
      <div className="grid2">
        <div className="form-row">
          <label className="l" htmlFor="bTy">{t("Tipo")}</label>
          <select className="input" id="bTy" value={f.tipo} onChange={set("tipo")}>
            <option value="Curso">{t("Curso")}</option>
            <option value="Diplomado">{t("Diplomado")}</option>
          </select>
        </div>
        <div className="form-row">
          <label className="l" htmlFor="bCa">{t("Categoría")}</label>
          <select className="input" id="bCa" value={f.categoria} onChange={set("categoria")}>
            {cats.map((x) => (
              <option key={x} value={x}>
                {t(x)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid2">
        <div className="form-row">
          <label className="l" htmlFor="bNi">{t("Nivel de dificultad")}</label>
          <select className="input" id="bNi" value={f.nivel} onChange={set("nivel")}>
            {NIVELES.map((x) => (
              <option key={x} value={x}>
                {t(x)}
              </option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label className="l" htmlFor="bAu">{t("Autor o ponente (solo se muestra; no da permisos)")}</label>
          <input className="input" id="bAu" maxLength={120} value={f.instructor} onChange={set("instructor")} />
        </div>
      </div>
      <div className="grid2">
        <div className="form-row">
          <label className="l" htmlFor="bPr">{t("Precio regular en MXN (informativo)")}</label>
          <input className="input" type="number" id="bPr" min={0} step={1} value={f.precioRegular} onChange={set("precioRegular")} />
        </div>
        <div className="form-row">
          <label className="l" htmlFor="bPo">{t("Precio de oferta en MXN (0 = gratuito)")}</label>
          <input className="input" type="number" id="bPo" min={0} step={1} value={f.precio} onChange={set("precio")} />
        </div>
      </div>
      <p className="ce-hint" style={{ margin: "-8px 0 18px" }}>
        <Icon name="info" /> {t("El precio se muestra en la página del curso, pero no se cobra en línea ni da acceso. El acceso lo da solo una inscripción aprobada.")}{" "}
        {t("IVA por confirmar")}.
      </p>
      <div className="grid2">
        <div className="form-row">
          <label className="l" htmlFor="bPt">{t("Imagen destacada (JPG, PNG o WebP, máximo 2 MB)")}</label>
          <input
            className="input file"
            type="file"
            id="bPt"
            accept="image/jpeg,image/png,image/webp"
            onChange={async (e) => {
              const input = e.currentTarget;
              const url = await readImage(input.files?.[0], COVER_RX, 2 * 1024 * 1024, coverMsgs);
              if (!url) input.value = "";
              setPortada(url ?? undefined);
            }}
          />
        </div>
        <div className="form-row">
          <span className="l">{t("Actual")}</span>
          {portada || c.portada ? <img className="ce-cover" src={portada || c.portada || ""} alt={t("Imagen destacada")} /> : <p className="ce-hint">{t("Sin imagen destacada.")}</p>}
        </div>
      </div>
      <div className="grid2">
        <div className="form-row">
          <label className="l" htmlFor="bEs">{t("Estado")}</label>
          <select className="input" id="bEs" value={f.estado} onChange={set("estado")}>
            {(["borrador", "publicado", "programado", "privado"] as const).map((x) => (
              <option key={x} value={x}>
                {t(CSTATES[x])}
              </option>
            ))}
          </select>
        </div>
        {f.estado === "programado" ? (
          <div className="form-row">
            <label className="l" htmlFor="bFp">{t("Fecha de publicación")}</label>
            <input className="input" type="date" id="bFp" min={todayIso()} value={f.fechaProg} onChange={set("fechaProg")} />
          </div>
        ) : null}
      </div>
      {err ? (
        <p className="err" role="alert" style={{ color: "#b42318", fontSize: 13.5, marginBottom: 12 }}>
          {t(err)}
        </p>
      ) : null}
      <button className="btn btn-primary" type="submit" disabled={busy}>
        <Icon name="check" /> {t("Guardar datos del curso")}
      </button>
    </form>
  );
}
