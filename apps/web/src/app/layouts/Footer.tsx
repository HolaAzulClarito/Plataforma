/* Pie de página del sitio público (footer() del demo). */
import { Link } from "react-router";
import { Icon } from "../../components/Icon";
import { ExtLink } from "../../components/ui";
import { useT } from "../../i18n";
import { GatedLink } from "../../features/auth";
import { LINKS, SAMPLE_FOLIO } from "../links";

const cat = (c: string) => `/productos?cat=${encodeURIComponent(c)}`;

export function Footer() {
  const t = useT();
  return (
    <footer className="ftr">
      <div className="wrap">
        <div className="ftr-grid">
          <div>
            <Link className="pill" to="/">
              <img src="/img/kiron-logo.png" alt={t("Kirón · Cuidando la salud de tu mejor amigo")} width={124} height={72} />
            </Link>
            <p style={{ maxWidth: 300, fontSize: 14 }}>
              {t("Nacimos con la filosofía de mejorar la calidad de vida de los animales y de sus propietarios, con productos innovadores y de calidad.")}
            </p>
            <div className="social">
              <ExtLink href={LINKS.fb} label="Facebook">
                <Icon name="facebook" />
              </ExtLink>
              <ExtLink href={LINKS.ig} label="Instagram">
                <Icon name="instagram" />
              </ExtLink>
              <ExtLink href={LINKS.yt} label="YouTube">
                <Icon name="youtube" />
              </ExtLink>
              <ExtLink href={LINKS.li} label="LinkedIn">
                <Icon name="linkedin" />
              </ExtLink>
            </div>
            <p style={{ fontSize: 12.5, marginTop: 10, color: "#c5c9bf" }}>{t("Laboratorios Kirón México")}</p>
          </div>
          <div>
            <h5>{t("Productos")}</h5>
            <Link to="/productos">{t("Catálogo completo")}</Link>
            <Link to={cat("Oftálmicos")}>{t("Oftálmicos")}</Link>
            <Link to={cat("Endoparasiticidas")}>{t("Endoparasiticidas")}</Link>
            <Link to={cat("Biológicos")}>{t("Biológicos")}</Link>
            <Link to="/videoteca">{t("Videoteca")}</Link>
          </div>
          <div>
            <h5>{t("Médicos")}</h5>
            <GatedLink role="mvz" to="/panel">
              {t("Mi panel")}
            </GatedLink>
            <Link to="/academia?tab=cursos">{t("Cursos")}</Link>
            <Link to="/academia?tab=diplomados">{t("Diplomados")}</Link>
            <Link to="/academia?tab=webinars">{t("Webinars")}</Link>
            <GatedLink role="mvz" to="/panel/club">
              {t("Club MVZ")}
            </GatedLink>
            <GatedLink role="mvz" to="/panel/constancias">
              {t("Mis constancias")}
            </GatedLink>
            <Link to={`/verificar/${SAMPLE_FOLIO}`}>{t("Verificar constancia")}</Link>
          </div>
          <div>
            <h5>{t("Quiero ser distribuidor")}</h5>
            <Link to="/distribuidores/mexico">{t("México")}</Link>
            <Link to="/distribuidores/mundo">{t("Resto del mundo")}</Link>
            <h5 style={{ marginTop: 22 }}>{t("Atención")}</h5>
            <Link to="/representantes">{t("Representantes")}</Link>
            <a href={LINKS.tel}>{t("Línea Kirón · 55 5112 7743")}</a>
            <ExtLink href={LINKS.wa}>{t("Mensaje de WhatsApp")}</ExtLink>
            <Link to="/farmacovigilancia">{t("Reporte de farmacovigilancia")}</Link>
            <Link to="/legal/privacidad">{t("Aviso de privacidad")}</Link>
            <Link to="/legal/condiciones">{t("Condiciones de uso")}</Link>
          </div>
        </div>
        <div className="ftr-bottom">
          <span>{t("© 2026 Laboratorios Kirón México")}</span>
          <span>
            <GatedLink role="admin" to="/admin" style={{ color: "inherit", textDecoration: "underline", display: "inline" }}>
              {t("Acceso del equipo Kirón")}
            </GatedLink>{" "}
            {t("· Demo desarrollado por Azul Clarito Marketing & Developers")}
          </span>
        </div>
      </div>
    </footer>
  );
}
