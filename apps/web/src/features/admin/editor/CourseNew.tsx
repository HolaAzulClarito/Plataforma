/* Nuevo curso (APP.courseNew, courseModAdd, courseModDel, courseCover, courseSave). Se crea como borrador y abre el
   editor. El precio es informativo: no se cobra en línea ni da acceso. */
import { useState, type FormEvent } from "react";
import type { AdminCourseList, CourseKind, EditorCourseCreateRequest, EditorCourseDetail } from "@kiron/shared";
import { Icon } from "../../../components/Icon";
import { Notice } from "../../../components/ui";
import { useT } from "../../../i18n";
import { apiPost } from "../../../lib/api";
import { closeModal, openModal } from "../../../state/modal";
import { navigate } from "../../../state/session";
import { toast } from "../../../state/toasts";
import { bumpAdmin, readImage, useAdminApi } from "../common";

export const NIVELES = ["Todos los niveles", "Básico", "Intermedio", "Avanzado"] as const;
export const MAX_MODULES = 12;
export const MAX_LESSONS = 60;

/* Validación de precios compartida con "Datos del curso". Devuelve el mensaje de error o "". */
export function priceError(precio: number, regular: number): string {
  if (![precio, regular].every((x) => Number.isInteger(x) && x >= 0)) return "Los precios van en pesos enteros, 0 si es gratuito.";
  if (precio > regular && regular > 0) return "El precio de oferta no puede ser mayor que el regular.";
  return "";
}

export function useCategories(current?: string): string[] {
  const { data } = useAdminApi<AdminCourseList>("/admin/cursos");
  const cats = new Set((data?.items ?? []).map((r) => r.cat).filter(Boolean));
  cats.add("Curso independiente");
  if (current) cats.add(current);
  return [...cats];
}

export const coverMsgs = { type: "La portada debe ser JPG, PNG o WebP", size: "La portada pesa más de 2 MB" };
export const COVER_RX = /^image\/(jpeg|png|webp)$/;

export function CourseNewForm() {
  const t = useT();
  const cats = useCategories();
  const [f, setF] = useState({ titulo: "", tituloEn: "", tipo: "Curso" as CourseKind, categoria: "", instructor: "", nivel: NIVELES[0] as string, precioRegular: "0", precio: "0" });
  const [mods, setMods] = useState([
    { k: 1, nombre: "", lecciones: "4" },
    { k: 2, nombre: "", lecciones: "4" },
  ]);
  const [portada, setPortada] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));
  const categoria = f.categoria || cats[0] || "Curso independiente";

  const addMod = () => {
    if (mods.length >= MAX_MODULES) {
      toast("Máximo 12 módulos por curso");
      return;
    }
    setMods((m) => [...m, { k: Math.max(0, ...m.map((x) => x.k)) + 1, nombre: "", lecciones: "4" }]);
  };
  const delMod = (k: number) => {
    if (mods.length <= 1) {
      toast("El curso necesita al menos un módulo");
      return;
    }
    setMods((m) => m.filter((x) => x.k !== k));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const modulos = mods.map((m) => ({ nombre: m.nombre.trim(), lecciones: Number(m.lecciones) }));
    const body: EditorCourseCreateRequest = {
      titulo: f.titulo.trim(),
      tituloEn: f.tituloEn.trim(),
      tipo: f.tipo,
      categoria,
      instructor: f.instructor.trim(),
      nivel: f.nivel,
      precioRegular: Number(f.precioRegular),
      precio: Number(f.precio),
      modulos,
      portada,
    };
    const pe = priceError(body.precio, body.precioRegular);
    let msg = "";
    if (!body.titulo || !body.tituloEn) msg = "Escribe el título en español y en inglés.";
    else if (!body.instructor) msg = "Escribe el nombre del autor o ponente.";
    else if (pe) msg = pe;
    else if (!modulos.length || modulos.some((m) => !m.nombre)) msg = "Cada módulo necesita nombre.";
    else if (modulos.some((m) => !Number.isInteger(m.lecciones) || m.lecciones < 1 || m.lecciones > MAX_LESSONS)) msg = "Cada módulo lleva de 1 a 60 lecciones.";
    if (msg) {
      setErr(msg);
      return;
    }
    if (!body.precioRegular) body.precioRegular = body.precio;
    setBusy(true);
    try {
      const d = await apiPost<EditorCourseDetail>("/admin/editor/cursos", body);
      bumpAdmin();
      closeModal();
      navigate(`/admin/academia/editor/${d.curso.id}/0/0`);
      toast("Curso creado como borrador. Carga el video y los archivos de cada lección.");
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "No se pudo crear el curso.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="modal-b" id="fCur" noValidate onSubmit={submit}>
      <div className="grid2">
        <div className="form-row">
          <label className="l" htmlFor="cTi">{t("Título en español")}</label>
          <input className="input" id="cTi" maxLength={140} required value={f.titulo} onChange={set("titulo")} />
        </div>
        <div className="form-row">
          <label className="l" htmlFor="cTe">{t("Título en inglés")}</label>
          <input className="input" id="cTe" maxLength={140} required value={f.tituloEn} onChange={set("tituloEn")} />
        </div>
      </div>
      <div className="grid2">
        <div className="form-row">
          <label className="l" htmlFor="cTy">{t("Tipo")}</label>
          <select className="input" id="cTy" value={f.tipo} onChange={set("tipo")}>
            <option value="Curso">{t("Curso")}</option>
            <option value="Diplomado">{t("Diplomado")}</option>
          </select>
        </div>
        <div className="form-row">
          <label className="l" htmlFor="cCa">{t("Categoría")}</label>
          <select className="input" id="cCa" value={categoria} onChange={set("categoria")}>
            {cats.map((c) => (
              <option key={c} value={c}>
                {t(c)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid2">
        <div className="form-row">
          <label className="l" htmlFor="cIn">{t("Autor o ponente (solo se muestra)")}</label>
          <input className="input" id="cIn" maxLength={120} required autoComplete="off" value={f.instructor} onChange={set("instructor")} />
        </div>
        <div className="form-row">
          <label className="l" htmlFor="cNi">{t("Nivel de dificultad")}</label>
          <select className="input" id="cNi" value={f.nivel} onChange={set("nivel")}>
            {NIVELES.map((x) => (
              <option key={x} value={x}>
                {t(x)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid2">
        <div className="form-row">
          <label className="l" htmlFor="cPr">{t("Precio regular en MXN (informativo)")}</label>
          <input className="input" type="number" id="cPr" min={0} step={1} required value={f.precioRegular} onChange={set("precioRegular")} />
        </div>
        <div className="form-row">
          <label className="l" htmlFor="cPo">{t("Precio de oferta en MXN (0 = gratuito)")}</label>
          <input className="input" type="number" id="cPo" min={0} step={1} required value={f.precio} onChange={set("precio")} />
        </div>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "-12px 0 16px" }}>
        {t("El precio solo se muestra. No se cobra en línea ni da acceso: el médico solicita y el equipo aprueba su inscripción.")} {t("IVA por confirmar")}.
      </p>
      <div className="form-row">
        <label className="l" htmlFor="cPt">{t("Imagen destacada (JPG, PNG o WebP, máximo 2 MB)")}</label>
        <input
          className="input file"
          type="file"
          id="cPt"
          accept="image/jpeg,image/png,image/webp"
          onChange={async (e) => {
            const input = e.currentTarget;
            const url = await readImage(input.files?.[0], COVER_RX, 2 * 1024 * 1024, coverMsgs);
            if (!url) input.value = "";
            setPortada(url);
          }}
        />
      </div>
      <h4 style={{ margin: "4px 0 10px" }}>{t("Módulos")}</h4>
      <div id="cMods">
        {mods.map((m, i) => (
          <div className="cmod" key={m.k}>
            <div>
              <label className="l" htmlFor={`cmN${m.k}`}>
                {t("Módulo")} {i + 1}
              </label>
              <input
                className="input cm-n"
                id={`cmN${m.k}`}
                maxLength={120}
                placeholder={t("Nombre del módulo")}
                value={m.nombre}
                onChange={(e) => setMods((all) => all.map((x) => (x.k === m.k ? { ...x, nombre: e.target.value } : x)))}
              />
            </div>
            <div>
              <label className="l" htmlFor={`cmL${m.k}`}>
                {t("Lecciones")}
              </label>
              <input
                className="input cm-l"
                id={`cmL${m.k}`}
                type="number"
                min={1}
                max={MAX_LESSONS}
                value={m.lecciones}
                onChange={(e) => setMods((all) => all.map((x) => (x.k === m.k ? { ...x, lecciones: e.target.value } : x)))}
              />
            </div>
            <button type="button" className="icon-btn" aria-label={`${t("Quitar módulo")} ${i + 1}`} onClick={() => delMod(m.k)}>
              <Icon name="x" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={addMod}>
        <Icon name="plus" /> {t("Agregar módulo")}
      </button>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "10px 0 18px" }}>
        {t("Los módulos solo agrupan lecciones. El curso tiene un solo examen, al final; sus intentos, calificación aprobatoria y tiempo límite se definen en el editor.")}
      </p>
      <Notice style={{ marginBottom: 18 }}>
        {t("El curso se crea como borrador y se abre el editor para cargar el video de Bunny, la duración y los archivos de cada lección. Lo publicas desde ahí cuando esté completo.")}
      </Notice>
      {err ? (
        <p className="err" role="alert" style={{ color: "#b42318", fontSize: 13.5, marginBottom: 12 }}>
          {t(err)}
        </p>
      ) : null}
      <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
        <Icon name="plus" /> {t("Crear curso y abrir el editor")}
      </button>
    </form>
  );
}

export const openCourseNew = () => openModal({ title: "Nuevo curso", content: <CourseNewForm /> });
