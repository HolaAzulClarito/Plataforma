import { useParams } from "react-router";
import { EnMigracion } from "../../components/EnMigracion";

/* Placeholder de /panel/* (inicio, cursos, constancias, club). Lo reemplaza el agente de panel. */
export function PanelPage() {
  const params = useParams();
  const tab = params["*"] ?? "";
  return <EnMigracion seccion={tab ? `Mi panel · ${tab}` : "Mi panel"} />;
}
