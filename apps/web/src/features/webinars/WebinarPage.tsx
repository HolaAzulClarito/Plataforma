import { useParams } from "react-router";
import { EnMigracion } from "../../components/EnMigracion";

/* Placeholder de /webinar/:slug (landing, sala en vivo y asistencia). Lo reemplaza el agente de webinars. */
export function WebinarPage() {
  const { slug = "proximo" } = useParams();
  return <EnMigracion seccion={`Webinar · ${slug}`} />;
}
