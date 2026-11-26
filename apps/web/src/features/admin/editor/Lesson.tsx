/* Lección del editor (ceLesson y APP.ceSet/ceDur/ceVideo/ceVideoTest/ceAdj/ceAdjDel/ceLesMove/ceLesDel). El video de
   Bunny solo guarda librería e ID; el token de reproducción se firma en el servidor. La lección se completa sola al
   reproducir el 100 % del video: no hay forma de marcarla a mano. */
import { useState } from "react";
import { bunnyIds, DURATION_RE, type EditorCourseDetail, type EditorLessonUpdateRequest } from "@kiron/shared";
import { Icon } from "../../../components/Icon";
import { useT } from "../../../i18n";
import { apiDelete, apiPatch, apiPost } from "../../../lib/api";
import { openModal } from "../../../state/modal";
import { navigate } from "../../../state/session";
import { toast } from "../../../state/toasts";
import { AIcon } from "../icons";
import { ceHref, type EditorApi } from "./Editor";

export const ceTam = (b: number) => (b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB");
const ATTACH_RX = /\.(pdf|docx?|xlsx?|pptx?|zip)$/i;
const MAX_ATTACH = 50 * 1048576;

function PlayerTest({ lib, vid }: { lib: string; vid: string }) {
  const t = useT();
  return (
    <div className="modal-b">
      <div style={{ position: "relative", aspectRatio: "16/9", background: "#000", borderRadius: 12, overflow: "hidden" }}>
        <iframe
          src={`https://iframe.mediadelivery.net/embed/${encodeURIComponent(lib)}/${encodeURIComponent(vid)}?autoplay=false&preload=false&responsive=true`}
          title={t("Reproductor de Bunny Stream")}
          loading="lazy"
          allow="accelerometer;gyroscope;encrypted-media;picture-in-picture"
          allowFullScreen
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
        />
      </div>
      <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "12px 0 0" }}>
        {t("Si tu librería tiene activada la autenticación por token, aquí verás un error 403: es lo esperado. En la plataforma el servidor firma cada reproducción.")}
      </p>
    </div>
  );
}

export function LessonEditor({ api, mi, li }: { api: EditorApi; mi: number; li: number }) {
  const t = useT();
  const { c, mut, base, busy } = api;
  const l = c.modulos[mi]!.lecciones[li]!;
  const path = `${base}/modulos/${mi}/lecciones/${li}`;
  const [titulo, setTitulo] = useState(l.titulo);
  const [video, setVideo] = useState("");
  const [dur, setDur] = useState(l.dur);
  const save = (body: EditorLessonUpdateRequest, ok?: string) => mut(() => apiPatch<EditorCourseDetail>(path, body), ok);

  const saveVideo = () => {
    const v = video.trim();
    if (!v) return;
    if (!bunnyIds(v)) {
      toast("No encontramos la librería y el ID del video en lo que pegaste");
      return;
    }
    void save({ video: v }, "Video vinculado a Bunny Stream").then((r) => {
      if (r) setVideo("");
    });
  };
  const saveDur = () => {
    const v = dur.trim();
    if (v === l.dur) return;
    if (v && !DURATION_RE.test(v)) {
      toast("Escribe la duración como min:seg, por ejemplo 12:40");
      return;
    }
    void save({ dur: v });
  };
  const move = async (d: -1 | 1) => {
    const j = li + d;
    if (j < 0 || j >= c.modulos[mi]!.lecciones.length) return;
    if (await mut(() => apiPost<EditorCourseDetail>(`${path}/mover`, { dir: d }), undefined, true)) navigate(ceHref(c.id, mi, j));
  };
  const del = async () => {
    if (await mut(() => apiDelete<EditorCourseDetail>(path), "Elemento eliminado del temario", true)) navigate(ceHref(c.id, mi, Math.max(li - 1, 0)));
  };
  const addFiles = async (files: FileList | null) => {
    const fs = [...(files ?? [])];
    let bad = 0;
    let ok = 0;
    for (const f of fs) {
      if (!ATTACH_RX.test(f.name) || f.size > MAX_ATTACH || f.size < 1) {
        bad++;
        continue;
      }
      if (await mut(() => apiPost<EditorCourseDetail>(`${path}/adjuntos`, { nombre: f.name.slice(0, 120), tam: f.size }))) ok++;
    }
    if (bad) toast(`${ok} archivos agregados · ${bad} no son de un tipo permitido o pesan más de 50 MB`);
    else if (ok) toast("Archivos listos. En la plataforma se guardan en almacenamiento privado.");
  };

  return (
    <>
      <div className="panel ce-lhead">
        <div className="ce-lt">
          <label className="sr" htmlFor="ceT">
            {t("Título de la lección")}
          </label>
          <input
            className="ce-title"
            id="ceT"
            value={titulo}
            maxLength={120}
            onChange={(e) => setTitulo(e.target.value)}
            onBlur={() => {
              const v = titulo.trim();
              if (v && v !== l.titulo) void save({ titulo: v });
              else setTitulo(l.titulo);
            }}
          />
          <div className="ce-lmove">
            <button type="button" className="icon-btn" aria-label={t("Subir lección")} onClick={() => move(-1)} disabled={busy || li === 0}>
              <AIcon name="arrow-up" />
            </button>
            <button type="button" className="icon-btn" aria-label={t("Bajar lección")} onClick={() => move(1)} disabled={busy || li === c.modulos[mi]!.lecciones.length - 1}>
              <AIcon name="arrow-down" />
            </button>
            <button type="button" className="icon-btn" aria-label={t("Eliminar lección")} onClick={del} disabled={busy}>
              <AIcon name="trash" />
            </button>
          </div>
        </div>
        <p className="ce-hint" style={{ marginTop: 8 }}>
          <Icon name="lock" /> {t("Se marca completada sola cuando el alumno reproduce el 100 % del video. No hay botón para marcarla a mano.")}
        </p>
      </div>
      <div className="ce-block">
        <div className="ce-bh">
          <Icon name="video" />
          <b>{t("Video de la lección · Bunny Stream")}</b>
        </div>
        <div className="ce-bb">
          <div className="form-row">
            <label className="l" htmlFor="ceV">
              {t("Código de inserción, URL del reproductor o «librería/ID»")}
            </label>
            <textarea
              className="input ce-code"
              id="ceV"
              rows={3}
              placeholder='<iframe src="https://iframe.mediadelivery.net/embed/123456/xxxxxxxx-xxxx-..."></iframe>'
              value={video}
              onChange={(e) => setVideo(e.target.value)}
              onBlur={saveVideo}
            />
          </div>
          {l.video.lib ? (
            <div className="ce-chips">
              <span className="ce-chip ok">
                <Icon name="circle-check" /> <span>{t("Librería")}</span> <b>{l.video.lib}</b>
              </span>
              <span className="ce-chip ok">
                <span>{t("Video")}</span> <b>{l.video.vid.slice(0, 8)}…</b>
              </span>
              <button type="button" className="mini" onClick={() => openModal({ title: "Prueba del reproductor", content: <PlayerTest lib={l.video.lib} vid={l.video.vid} /> })}>
                <Icon name="play" /> {t("Probar reproductor")}
              </button>
            </div>
          ) : (
            <p className="ce-hint">{t("Copia el código desde Bunny: Stream, tu librería, el video y Embed. Solo guardamos la librería y el ID; nunca el script.")}</p>
          )}
          <div className="grid2" style={{ marginTop: 14 }}>
            <div className="form-row">
              <label className="l" htmlFor="ceD">
                {t("Duración del video (min:seg)")}
              </label>
              <input className="input" id="ceD" maxLength={9} placeholder="12:40" value={dur} onChange={(e) => setDur(e.target.value)} onBlur={saveDur} />
            </div>
            <div className="form-row">
              <label className="l" htmlFor="ceU">
                {t("Fecha de desbloqueo (opcional)")}
              </label>
              <input className="input" type="date" id="ceU" defaultValue={l.desbloqueo} onChange={(e) => void save({ desbloqueo: e.target.value })} />
            </div>
          </div>
          <p className="ce-hint">
            <Icon name="info" /> {t("Sin fecha, la lección está disponible de inmediato. Con fecha, el alumno la ve con candado hasta ese día.")}
          </p>
          <p className="ce-hint">
            <Icon name="lock" />{" "}
            {t("En la plataforma el reproductor se firma con un token que vence en minutos (Embed view token authentication de Bunny), así que el video no se puede incrustar fuera del sitio.")}
          </p>
        </div>
      </div>
      <div className="ce-block">
        <div className="ce-bh">
          <Icon name="download" />
          <b>{t("Archivos de ejercicios y documentación")}</b>
        </div>
        <div className="ce-bb">
          {l.adjuntos.map((a, k) => (
            <div className="ce-file" key={a.key}>
              <AIcon name="file-down" />
              <div>
                <b>{a.nombre}</b>
                <small>{ceTam(a.tam)}</small>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label={`${t("Quitar archivo")} · ${a.nombre}`}
                disabled={busy}
                onClick={() => mut(() => apiDelete<EditorCourseDetail>(`${path}/adjuntos/${k}`), "Archivo quitado")}
              >
                <AIcon name="trash" />
              </button>
            </div>
          ))}
          <label className="ce-drop">
            <Icon name="upload" />
            <b>{t("Agrega archivos")}</b>
            <small>{t("PDF, Word, Excel, PowerPoint o ZIP, hasta 50 MB cada uno")}</small>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
              className="sr"
              onChange={(e) => {
                const input = e.currentTarget;
                void addFiles(input.files).then(() => {
                  input.value = "";
                });
              }}
            />
          </label>
          <p className="ce-hint">
            <Icon name="info" /> {t("Por ahora se registra el nombre y el peso del archivo; la carga al almacenamiento privado llega con la etapa de archivos.")}
          </p>
        </div>
      </div>
    </>
  );
}
