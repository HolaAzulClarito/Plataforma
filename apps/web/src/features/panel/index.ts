/* Feature: panel del médico (rol mvz). Ruta /panel/* (sub-rutas: "", cursos, constancias, club).
   Se pinta dentro de AppLayout (sin pie de página). RequireRole ya inicia la sesión simulada si falta.
   PanelPage se carga con React.lazy desde app/routes.tsx (importa PanelPage.tsx directo).
   useMe() / useMyPoints() / refreshMe(): sesión y puntos desde GET /api/sesion (encabezado y mock del inicio).
   Fuente legacy: panelShell(), panel(), misCursos(), misConstancias(), clubView(). */
export { PanelPage } from "./PanelPage";
export { useMe, useMyPoints, refreshMe } from "./useMe";
