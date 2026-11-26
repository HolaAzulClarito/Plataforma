/* Farmacovigilancia (formulario), legales (privacidad y condiciones). */
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { todayIso } from "@kiron/shared";
import { Icon } from "../../components/Icon";
import { Notice, PageHead } from "../../components/ui";
import { useT } from "../../i18n";
import { scrollToId } from "../../lib/motion";
import { toast } from "../../state/toasts";
import { useProductos } from "./data";

export function Farmacovigilancia() {
  const t = useT();
  const [params] = useSearchParams();
  const pre = params.get("p") ?? "";
  const productos = useProductos();
  const [done, setDone] = useState(false);

  /* [FALTA DATO] Endpoint del reporte (no está en el contrato). El demo solo confirma con un folio de ejemplo. */
  const submit = () => {
    setDone(true);
    scrollToId("view");
    toast("Reporte enviado al área de farmacovigilancia");
  };

  const lab = (id: string, text: string) => (
    <label className="l" htmlFor={id}>
      {t(text)}
    </label>
  );

  return (
    <>
      <PageHead
        eyebrow="Farmacovigilancia"
        title="Reporte de farmacovigilancia"
        lead="Si observaste un evento adverso con un producto Kirón, cuéntanos. Llega directo al área de farmacovigilancia."
      />
      <section className="sec" style={{ paddingTop: 40 }}>
        <div className="wrap" style={{ maxWidth: 820 }}>
          {done ? (
            <div className="panel success" role="status">
              <div className="big-ok">
                <Icon name="circle-check" />
              </div>
              <h3 style={{ fontSize: 24, margin: "10px 0 6px" }}>{t("Reporte recibido")}</h3>
              <p style={{ color: "var(--muted)" }}>{t("Folio FV-2026-0042 (ejemplo). El área de farmacovigilancia te contactará si necesita más información.")}</p>
              <Link className="btn btn-ghost" style={{ marginTop: 18 }} to="/">
                {t("Volver al inicio")}
              </Link>
            </div>
          ) : (
            <form
              className="panel"
              style={{ padding: 32 }}
              id="fvform"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <div className="grid2">
                <div className="form-row">
                  {lab("fv1", "Nombre de quien reporta")}
                  <input className="input" id="fv1" autoComplete="name" required />
                </div>
                <div className="form-row">
                  {lab("fv2", "Correo o WhatsApp")}
                  <input className="input" id="fv2" required />
                </div>
              </div>
              <div className="grid2">
                <div className="form-row">
                  {lab("fv3", "Producto")}
                  <select className="select" id="fv3" key={productos.data ? "ok" : "loading"} defaultValue={productos.data?.find((p) => p.slug === pre)?.name}>
                    {(productos.data ?? []).map((p) => (
                      <option key={p.slug}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  {lab("fv4", "Lote")}
                  <input className="input" id="fv4" placeholder={t("Viene en el empaque")} />
                </div>
              </div>
              <div className="grid2">
                <div className="form-row">
                  {lab("fv-sp", "Especie")}
                  <select className="select" id="fv-sp">
                    <option>{t("Perro")}</option>
                    <option>{t("Gato")}</option>
                    <option>{t("Otra")}</option>
                  </select>
                </div>
                <div className="form-row">
                  {lab("fv5", "Fecha del evento")}
                  <input className="input" id="fv5" type="date" defaultValue={todayIso()} max={todayIso()} />
                </div>
              </div>
              <div className="form-row">
                {lab("fv6", "¿Qué pasó?")}
                <textarea
                  className="input"
                  id="fv6"
                  rows={4}
                  required
                  style={{ height: "auto", padding: 14 }}
                  placeholder={t("Describe el evento, la dosis y la evolución del paciente")}
                />
              </div>
              <label className="check">
                <input type="checkbox" required /> {t("Acepto el")} <Link to="/legal/privacidad">{t("aviso de privacidad")}</Link>.
              </label>
              <button className="btn btn-accent" type="submit">
                <Icon name="send" /> {t("Enviar reporte")}
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}

export function Legal() {
  const t = useT();
  const { doc } = useParams();
  const priv = doc !== "condiciones";
  const block = (h: string, p: string) => (
    <>
      <h3>{t(h)}</h3>
      <p>{t(p)}</p>
    </>
  );
  return (
    <>
      <PageHead eyebrow="Legal" title={priv ? "Aviso de privacidad" : "Condiciones de uso"} />
      <section className="sec" style={{ paddingTop: 40 }}>
        <div className="wrap prose">
          <Notice tone="warn">{t("En el demo se muestra la estructura. El texto legal vigente de Kirón se migra tal cual desde el sitio actual y lo valida su área legal.")}</Notice>
          {priv ? (
            <>
              {block("Responsable", "Laboratorios Kirón México. Razón social y domicilio: se toman del aviso vigente.")}
              {block("Datos que tratamos", "De médicos: nombre, correo, WhatsApp y cédula profesional.")}
              {block("Finalidades", "Cuenta y verificación profesional, academia, webinars y constancias, Club MVZ y atención por el asistente de preguntas frecuentes.")}
              {block("Transferencias", "Proveedores de nube, transmisión de video y correo, conforme a la LFPDPPP.")}
              {block("Derechos ARCO", "Desde tu perfil puedes descargar o borrar tus datos. También puedes escribir a [correo de privacidad].")}
            </>
          ) : (
            <>
              {block("Uso del sitio", "El contenido técnico es de uso exclusivo del Médico Veterinario Zootecnista.")}
              {block("Academia", "Inscripción a cursos, webinars y constancias.")}
              {block("Club MVZ", "Reglas para sumar y canjear puntos.")}
            </>
          )}
          <p>
            <a className="link-arrow" href="https://kironmexico.com/" target="_blank" rel="noopener noreferrer">
              {t("Ver el texto vigente en el sitio actual")} <Icon name="arrow-right" />
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
