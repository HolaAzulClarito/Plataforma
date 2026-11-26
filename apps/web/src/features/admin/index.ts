/* Feature: administrador (rol admin). Rutas: /admin/*, /admin/academia/:tab, /admin/academia/editor/:ci/:mi/:li.
   Se pinta dentro de AppLayout (sin pie de página). Se carga en diferido (React.lazy en app/routes.tsx): no importes
   este índice de forma estática desde otras features o el admin entraría al paquete principal. */
export { AdminPage, AdminAcademiaPage, AdminEditorPage } from "./AdminPages";
