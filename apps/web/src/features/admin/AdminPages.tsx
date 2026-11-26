import { useParams } from "react-router";
import { EnMigracion } from "../../components/EnMigracion";

/* Placeholders del administrador. Los reemplaza el agente de admin. */
export function AdminPage() {
  const params = useParams();
  const sub = params["*"] ?? "";
  return <EnMigracion seccion={sub ? `Administrador · ${sub}` : "Administrador"} />;
}

export function AdminAcademiaPage() {
  const { tab = "cursos" } = useParams();
  return <EnMigracion seccion={`Administrador · Academia · ${tab}`} />;
}

export function AdminEditorPage() {
  const { ci = "0", mi = "0", li = "0" } = useParams();
  return <EnMigracion seccion={`Editor de curso · ${ci}/${mi}/${li}`} />;
}
