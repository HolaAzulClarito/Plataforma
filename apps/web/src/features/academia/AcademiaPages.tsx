import { useParams } from "react-router";
import { EnMigracion } from "../../components/EnMigracion";

/* Placeholders de la academia. Los reemplaza el agente de academia/panel/webinars (ver src/README.md). */
export function AcademiaPage() {
  return <EnMigracion seccion="Academia" />;
}

export function CursoPage() {
  const { slug = "" } = useParams();
  return <EnMigracion seccion={`Academia · ${slug}`} />;
}

export function VerificarPage() {
  return <EnMigracion seccion="Verificación de constancias" />;
}
