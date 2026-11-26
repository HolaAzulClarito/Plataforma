import { Link } from "react-router";
import { PageHead } from "../../components/ui";
import { useT } from "../../i18n";

export function NotFound() {
  const t = useT();
  return (
    <>
      <PageHead eyebrow="404" title="No encontramos esta página" lead="Puede que la liga haya cambiado con la nueva plataforma." />
      <div className="wrap" style={{ padding: "20px 32px 100px" }}>
        <Link className="btn btn-primary" to="/">
          {t("Ir al inicio")}
        </Link>
      </div>
    </>
  );
}
