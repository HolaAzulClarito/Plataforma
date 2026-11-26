/* Páginas del administrador (rol admin), dentro de AdminShell. Fuente legacy: admin(), adminShell(), adminAcademia(t),
   ceView() y las acciones APP.* del demo v2.4.1. Rutas: /admin/*, /admin/academia/:tab y
   /admin/academia/editor/:ci/:mi/:li (ci = id del curso en el editor; mi = módulo, "datos" o "examen"). */
import { useParams } from "react-router";
import { AcademiaAdmin, isAcademiaTab } from "./academia/Academia";
import { ClubPage } from "./Club";
import { EditorView } from "./editor/Editor";
import { PaginasPage } from "./Paginas";
import { AdminShell, type AdminSection } from "./Shell";
import { MedicosPage, TableroPage } from "./Tablero";
import { WebinarsPage } from "./Webinars";

export function AdminPage() {
  const sub = (useParams()["*"] ?? "").split("/")[0] ?? "";
  if (sub === "academia")
    return (
      <AdminShell section="academia">
        <AcademiaAdmin tab="cursos" />
      </AdminShell>
    );
  const section: AdminSection = sub === "medicos" || sub === "webinars" || sub === "club" || sub === "paginas" ? sub : "";
  return (
    <AdminShell section={section}>
      {section === "medicos" ? <MedicosPage /> : section === "webinars" ? <WebinarsPage /> : section === "club" ? <ClubPage /> : section === "paginas" ? <PaginasPage /> : <TableroPage />}
    </AdminShell>
  );
}

export function AdminAcademiaPage() {
  const { tab = "cursos" } = useParams();
  return (
    <AdminShell section="academia">
      <AcademiaAdmin key={tab} tab={isAcademiaTab(tab) ? tab : "cursos"} />
    </AdminShell>
  );
}

export function AdminEditorPage() {
  const { ci = "", mi = "0", li = "0" } = useParams();
  return (
    <AdminShell section="academia">
      <EditorView key={ci} id={ci} mi={mi} li={li} />
    </AdminShell>
  );
}
