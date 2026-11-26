/* Pestaña Constancias: plantillas y editor visual (APP.certPick/certNew/certSet/certVarOn/certSize/certCourse/certImg/
   certImgDel/certPreview y bindCertDrag). Cada dato se arrastra con mouse o touch y también se mueve con las flechas
   del teclado (Shift = pasos más grandes). Las constancias emitidas no cambian: los cambios aplican a las nuevas. */
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { todayMx, type CertTemplateDetail, type CertTemplateSummary, type CertTemplateUpdateRequest, type CertVar, type CertVarKey } from "@kiron/shared";
import { Icon } from "../../../components/Icon";
import { QrCode } from "../../../components/QrCode";
import { ApiStatus, Notice } from "../../../components/ui";
import { useT } from "../../../i18n";
import { apiDelete, apiPatch, apiPost, apiPut } from "../../../lib/api";
import { cx } from "../../../lib/cx";
import { openModal } from "../../../state/modal";
import { toast } from "../../../state/toasts";
import { bumpAdmin, failToast, readImage, StateTag, useAction, useAdminApi } from "../common";
import { AIcon } from "../icons";
import { useCourseOptions } from "./options";

export const CVARS: Record<CertVarKey, string> = { nombre: "Nombre del alumno", curso: "Curso", fecha: "Fecha", folio: "Folio", qr: "Código QR" };
const KEYS = Object.keys(CVARS) as CertVarKey[];
const SAMPLE = { nombre: "Laura Méndez", curso: "Nombre del curso o diplomado", fecha: todayMx(), folio: "KI-2026-000000" };
type Vars = Record<CertVarKey, CertVar>;

const clampX = (x: number) => Math.round(Math.min(98, Math.max(2, x)) * 10) / 10;
const clampY = (y: number) => Math.round(Math.min(97, Math.max(3, y)) * 10) / 10;
const STEP: Record<string, [number, number]> = { ArrowLeft: [-0.5, 0], ArrowRight: [0.5, 0], ArrowUp: [0, -0.5], ArrowDown: [0, 0.5] };

/* Hoja de la constancia. Con `edit`, los datos se pueden arrastrar y mover con teclado. */
export function CertSheet({
  vars,
  imagen,
  data = SAMPLE,
  edit,
}: {
  vars: Vars;
  imagen: string | null;
  data?: typeof SAMPLE;
  edit?: { selected: CertVarKey; onSelect: (k: CertVarKey) => void; onMove: (k: CertVarKey, x: number, y: number) => void; onCommit: (k: CertVarKey) => void };
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ k: CertVarKey; id: number } | null>(null);
  const at = (e: PointerEvent): [number, number] => {
    const r = ref.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100];
  };
  const down = (k: CertVarKey) => (e: PointerEvent<HTMLDivElement>) => {
    if (!edit) return;
    e.preventDefault();
    e.currentTarget.focus();
    edit.onSelect(k);
    drag.current = { k, id: e.pointerId };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!edit || !drag.current || drag.current.id !== e.pointerId) return;
    const [x, y] = at(e);
    edit.onMove(drag.current.k, clampX(x), clampY(y));
  };
  const up = () => {
    if (!edit || !drag.current) return;
    edit.onCommit(drag.current.k);
    drag.current = null;
  };
  const key = (k: CertVarKey) => (e: KeyboardEvent<HTMLDivElement>) => {
    if (!edit) return;
    const d = STEP[e.key];
    if (!d) return;
    e.preventDefault();
    const m = e.shiftKey ? 4 : 1;
    edit.onMove(k, clampX(vars[k].x + d[0] * m), clampY(vars[k].y + d[1] * m));
    edit.onCommit(k);
  };
  return (
    <div className={cx("cert-sheet", edit && "edit")} id={edit ? "certCanvas" : undefined} ref={ref}>
      {imagen ? (
        <img className="cert-bg" src={imagen} alt="" />
      ) : (
        <div className="cert-base">
          <img src="/img/kiron-logo.png" alt="Kirón" />
          <b>{t("CONSTANCIA")}</b>
          <span>{t("Se otorga a")}</span>
          <i />
          <em>{t("por aprobar")}</em>
        </div>
      )}
      {KEYS.filter((k) => vars[k].on).map((k) => {
        const v = vars[k];
        return (
          <div
            key={k}
            className={cx("cert-var", k === "qr" && "qr", edit?.selected === k && "on")}
            data-k={k}
            style={{ left: `${v.x}%`, top: `${v.y}%`, ...(k === "qr" ? { width: `${v.size / 8.8}cqw` } : { fontSize: `${v.size / 8.8}cqw` }) }}
            {...(edit
              ? {
                  tabIndex: 0,
                  role: "button",
                  "aria-label": `${t("Mover")} ${t(CVARS[k])} · ${Math.round(v.x)} %, ${Math.round(v.y)} %`,
                  "aria-describedby": "certHelp",
                  onPointerDown: down(k),
                  onPointerMove: move,
                  onPointerUp: up,
                  onPointerCancel: up,
                  onKeyDown: key(k),
                  onFocus: () => edit.onSelect(k),
                }
              : {})}
          >
            {k === "qr" ? <QrCode seed={data.folio} size={120} /> : <span>{data[k]}</span>}
          </div>
        );
      })}
    </div>
  );
}

function Editor({ id }: { id: string }) {
  const t = useT();
  const copts = useCourseOptions();
  const { data: te, loading, error, refetch } = useAdminApi<CertTemplateDetail>(`/admin/academia/plantillas/${id}`);
  const [vars, setVars] = useState<Vars | null>(null);
  const [cv, setCv] = useState<CertVarKey>("nombre");
  const [name, setName] = useState("");
  const timers = useRef<Partial<Record<CertVarKey, ReturnType<typeof setTimeout>>>>({});
  const latest = useRef<Vars | null>(null);
  const { busy, run } = useAction();

  /* Copia local de las posiciones para arrastrar sin esperar a la API; se re-sincroniza con cada lectura. */
  useEffect(() => {
    if (!te) return;
    setVars(te.vars);
    latest.current = te.vars;
    setName(te.nombre);
  }, [te]);
  useEffect(() => {
    const tm = timers.current;
    return () => Object.values(tm).forEach((x) => clearTimeout(x));
  }, []);

  if (!te || !vars)
    return <ApiStatus loading={loading} error={error} onRetry={refetch} />;

  const patch = (body: CertTemplateUpdateRequest, ok?: string) => run(() => apiPatch<CertTemplateSummary>(`/admin/academia/plantillas/${id}`, body), ok);
  const saveVar = (k: CertVarKey, delay = 350) => {
    clearTimeout(timers.current[k]);
    timers.current[k] = setTimeout(() => {
      const v = latest.current?.[k];
      if (!v) return;
      apiPatch<CertTemplateSummary>(`/admin/academia/plantillas/${id}`, { vars: { [k]: v } }).catch((e: unknown) => failToast(e));
    }, delay);
  };
  const setVar = (k: CertVarKey, p: Partial<CertVar>) => {
    setVars((cur) => {
      if (!cur) return cur;
      const next = { ...cur, [k]: { ...cur[k], ...p } };
      latest.current = next;
      return next;
    });
  };
  const onImage = async (f: File | undefined) => {
    const url = await readImage(f, /^image\/(jpeg|png)$/, 3 * 1048576, { type: "La imagen debe ser JPG o PNG", size: "La imagen pesa más de 3 MB" });
    if (url) await run(() => apiPut<CertTemplateSummary>(`/admin/academia/plantillas/${id}/imagen`, { imagen: url }), "Imagen base cargada. Acomoda los datos encima.");
  };
  const size = vars[cv];
  const isQr = cv === "qr";

  return (
    <>
      <div className="main-head" style={{ marginTop: 28 }}>
        <div>
          <h2 style={{ fontSize: 22 }}>{te.nombre}</h2>
          <p>{t("Arrastra cada dato a su lugar sobre la imagen base")}</p>
        </div>
        <div className="ce-actions">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() =>
              openModal({
                title: `Vista previa · ${te.nombre}`,
                content: (
                  <div className="modal-b">
                    <CertSheet vars={vars} imagen={te.imagen} />
                    <p className="ce-hint" style={{ marginTop: 12 }}>
                      {t("Vista previa con datos de ejemplo.")}
                    </p>
                  </div>
                ),
              })
            }
          >
            <Icon name="eye" /> {t("Vista previa")}
          </button>
        </div>
      </div>
      <div className="cert-ed">
        <div>
          <CertSheet
            vars={vars}
            imagen={te.imagen}
            edit={{
              selected: cv,
              onSelect: setCv,
              onMove: (k, x, y) => setVar(k, { x, y }),
              onCommit: (k) => saveVar(k),
            }}
          />
          <p className="ce-hint" style={{ marginTop: 10 }} id="certHelp">
            <Icon name="info" />{" "}
            {t(
              "Datos de ejemplo. Al emitirse, cada constancia toma el nombre del alumno, el curso, la fecha y su folio. También puedes mover el dato seleccionado con las flechas del teclado.",
            )}
          </p>
        </div>
        <div className="panel cert-side">
          <div className="form-row">
            <label className="l" htmlFor="ctN">
              {t("Nombre de la plantilla")}
            </label>
            <input
              className="input"
              id="ctN"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => {
                const n = name.trim();
                if (n && n !== te.nombre) void patch({ nombre: n });
                else setName(te.nombre);
              }}
            />
          </div>
          <div className="form-row">
            <span className="l">{t("Imagen base")}</span>
            {te.imagen ? (
              <>
                <div className="ce-file">
                  <Icon name="file-check" />
                  <div>
                    <b>{t("Imagen cargada")}</b>
                    <small>{t("JPG o PNG del equipo de diseño")}</small>
                  </div>
                  <label className="mini ce-repl">
                    <Icon name="upload" /> {t("Reemplazar")}
                    <input type="file" accept="image/jpeg,image/png" className="sr" onChange={(e) => onImage(e.target.files?.[0])} />
                  </label>
                </div>
                <button type="button" className="mini" disabled={busy} onClick={() => run(() => apiDelete<CertTemplateSummary>(`/admin/academia/plantillas/${id}/imagen`), "Imagen quitada")}>
                  <AIcon name="trash" /> {t("Quitar imagen")}
                </button>
              </>
            ) : (
              <label className="ce-drop">
                <Icon name="upload" />
                <b>{t("Sube la imagen del diseño")}</b>
                <small>{t("JPG o PNG horizontal, hasta 3 MB")}</small>
                <input type="file" accept="image/jpeg,image/png" className="sr" onChange={(e) => onImage(e.target.files?.[0])} />
              </label>
            )}
          </div>
          <fieldset className="ce-opts">
            <legend>{t("Datos en la constancia")}</legend>
            {KEYS.map((k) => (
              <label className="ce-chk" key={k}>
                <input
                  type="checkbox"
                  checked={vars[k].on}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setVar(k, { on });
                    if (on) setCv(k);
                    void patch({ vars: { [k]: { on } } });
                  }}
                />{" "}
                {t(CVARS[k])}
              </label>
            ))}
          </fieldset>
          <div className="form-row" style={{ marginTop: 14 }}>
            <label className="l" htmlFor="ctS">
              {t("Tamaño")} · {t(CVARS[cv])}
            </label>
            <input
              id="ctS"
              type="range"
              min={isQr ? 50 : 9}
              max={isQr ? 160 : 72}
              value={size.size}
              onChange={(e) => {
                setVar(cv, { size: Number(e.target.value) });
                saveVar(cv, 300);
              }}
            />
          </div>
          <fieldset className="ce-opts">
            <legend>{t("Cursos que la usan")}</legend>
            <div className="cert-courses">
              {copts.map(([slug, title]) => (
                <label className="ce-chk" key={slug}>
                  <input
                    type="checkbox"
                    checked={te.cursos.includes(slug)}
                    onChange={(e) => {
                      const cursos = e.target.checked ? [...new Set([...te.cursos, slug])] : te.cursos.filter((x) => x !== slug);
                      void patch({ cursos });
                    }}
                  />{" "}
                  <span>{title}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="form-row" style={{ marginTop: 14 }}>
            <label className="l" htmlFor="ctE">
              {t("Estado")}
            </label>
            <select
              className="input"
              id="ctE"
              value={te.estado}
              onChange={(e) => {
                const estado = e.target.value === "published" ? "published" : "draft";
                void patch({ estado }, estado === "published" ? "Plantilla publicada. Se usa en las constancias nuevas de sus cursos." : "Plantilla en borrador");
              }}
            >
              <option value="draft">{t("Borrador")}</option>
              <option value="published">{t("Publicada")}</option>
            </select>
          </div>
          <p className="ce-hint">
            <Icon name="info" /> {t("Un curso usa una sola plantilla publicada. Si asocias un curso aquí, se quita de las demás.")}
          </p>
        </div>
      </div>
    </>
  );
}

export function ConstanciasTab() {
  const t = useT();
  const list = useAdminApi<CertTemplateSummary[]>("/admin/academia/plantillas");
  const [pick, setPick] = useState<string | null>(null);
  const sel = pick && list.data?.some((x) => x.id === pick) ? pick : (list.data?.[0]?.id ?? null);
  const create = async () => {
    try {
      const n = await apiPost<CertTemplateSummary>("/admin/academia/plantillas", { nombre: "Nueva plantilla" });
      bumpAdmin();
      setPick(n.id);
      toast("Plantilla creada como borrador. Sube la imagen del diseño.");
    } catch (e) {
      failToast(e);
    }
  };
  return (
    <>
      <Notice icon="shield-check" style={{ marginBottom: 18 }}>
        {t(
          "Una constancia emitida es un registro propio con folio y QR: no cambia ni desaparece aunque edites la plantilla o el curso deje de publicarse. Los cambios de plantilla aplican a las constancias nuevas.",
        )}
      </Notice>
      <ApiStatus loading={list.loading && !list.data} error={list.error} onRetry={list.refetch} />
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th scope="col">{t("Plantilla")}</th>
              <th scope="col">{t("Cursos asociados")}</th>
              <th scope="col">{t("Estado")}</th>
              <th scope="col">
                <span className="sr">{t("Acciones")}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {list.data?.map((x) => (
              <tr key={x.id} className={x.id === sel ? "row-on" : undefined} aria-current={x.id === sel ? "true" : undefined}>
                <td>
                  <b style={{ color: "var(--web-navy)" }}>{x.nombre}</b>
                </td>
                <td>{x.cursos.length || "—"}</td>
                <td>
                  <StateTag cls={x.estado === "published" ? "st-ok" : "st-draft"}>{t(x.estado === "published" ? "Publicada" : "Borrador")}</StateTag>
                </td>
                <td className="nowrap">
                  <button type="button" className="mini" onClick={() => setPick(x.id)} aria-label={`${t("Editar")} · ${x.nombre}`}>
                    <Icon name="pencil" /> {t("Editar")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ce-actions" style={{ justifyContent: "flex-end", marginTop: 14 }}>
        <button type="button" className="btn btn-primary btn-sm" onClick={create}>
          <Icon name="plus" /> {t("Nueva plantilla")}
        </button>
      </div>
      {sel ? <Editor key={sel} id={sel} /> : null}
    </>
  );
}
