import { Link } from "react-router";
import { useT } from "../i18n";
import { PageHead } from "./ui";

/* Página temporal para las secciones que portan otros agentes (academia, panel, webinars, admin).
   Reemplázala por la página real en el index.ts de cada feature. */
export function EnMigracion({ seccion }: { seccion: string }) {
  const t = useT();
  return (
    <>
      <PageHead eyebrow={seccion} title="En migración" lead="Esta sección se está migrando a la nueva plataforma. Mientras tanto, puedes volver al inicio." />
      <div className="wrap" style={{ padding: "20px 32px 100px" }}>
        <Link className="btn btn-primary" to="/">
          {t("Ir al inicio")}
        </Link>
      </div>
    </>
  );
}
