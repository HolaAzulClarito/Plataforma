# Frontend de la plataforma Kirón (apps/web/src)

Vite 8 + React 19 + TypeScript + React Router 7 (modo librería). Fuente de verdad visual y de comportamiento: `legacy/`.
Decisiones: `docs/arquitectura/adr-001` (stack), `adr-004` (i18n), `adr-005` (reglas del LMS). Rutas: `docs/mapa-rutas.md`.

## Estructura

```
app/          App.tsx (BrowserRouter + AppShell), routes.tsx (tabla de rutas), redirects.tsx (#/ y alias),
              RouteEffects.tsx (título, scroll, cierre de modal), links.ts (enlaces y menús fijos),
              layouts/ (Header con demo bar y menú móvil, Footer, PublicLayout, AppLayout, RequireRole)
components/   Icon, Modal/ModalHost, ToastHost, Button/btnClass, Badge, Notice, PageHead, ExtLink, ApiStatus,
              ProductCard/ProductImage/Price, QrCode, Countdown, EnMigracion
i18n/         en.ts (diccionario del demo, generado), extra.ts (textos nuevos), engine.ts, I18nProvider (useT)
state/        session.ts (idioma, aviso de demo, rol), toasts.ts, modal.ts, createStore.ts
lib/          api.ts (cliente y useApi), motion.ts (Lenis, GSAP, .rv, data-count), time.ts, download.ts, cx.ts
styles/       CSS del demo dividido por área; index.css fija el orden de la cascada; extras.css para lo nuevo
features/     sitio (público), auth (login simulado), chatbot, webinars, academia, panel, admin
test/         setup.ts, fixtures.ts (datos con la forma del contrato), utils.tsx (mockFetch, renderApp)
```

## Cómo agregar una página

1. Crea el componente en su feature, p. ej. `features/academia/Academia.tsx`. Copia el HTML del legacy y conviértelo
   a JSX **con los mismos nombres de clase** (`class` -> `className`, `style="a:b"` -> `style={{ a: "b" }}`).
2. Exporta la página en `features/<feature>/index.ts` (reemplaza el placeholder `EnMigracion`).
3. Regístrala en `app/routes.tsx` dentro del layout correcto: `PublicLayout` (con pie) o `AppLayout` (sin pie,
   para `/panel/*` y `/admin/*`). Las rutas de academia, panel, webinars y admin ya están registradas.
4. Si la sección necesita título propio, agrégalo a `TITLES` en `app/RouteEffects.tsx`.
5. Agrega tests junto al archivo (`*.test.tsx`). Usa `mockFetch()` y `renderApp("/ruta")` de `test/utils.tsx`.

## Convenciones

**Textos (useT).** Todo texto fijo se escribe en español y pasa por `t()`: `const t = useT(); t("Mis cursos")`.
Los datos de la API (nombres de producto, títulos de curso, nombres de personas) **no** pasan por `t()`.
Si el texto es nuevo y no está en `i18n/en.ts`, agrégalo a `i18n/extra.ts` (o una regla en `I18N_EXTRA_RX`).
Para textos con datos, separa la parte fija: `{t("Enviada el")} {fecha}`; o usa " · ": `t("Ficha técnica · " + nombre)`
traduce la parte conocida. En inglés, `getMissing()` lista lo que falte: los tests de `features/sitio/i18n-paginas.test.tsx`
y `i18n/i18n.test.tsx` fallan si un texto no tiene traducción; agrega tus rutas a esa lista.

**Datos (useApi).** `const { data, error, status, loading, refetch } = useApi<Tipo>("/ruta")` con los tipos de
`@kiron/shared` (`CatalogResponses`, etc.). Envía solo el encabezado `X-Demo-Role` con el rol de la sesión y vuelve a pedir
cuando cambia el rol. Para escribir: `apiPost/apiPatch/apiPut/apiDelete` (lanzan `ApiError` con `.status` y el mensaje
`{ error }` de la API). Muestra carga y error con `<ApiStatus loading error onRetry />`. No leas `legacy/assets/js/data.js`.
Si un endpoint no está en `packages/shared/src/api.ts`, pídelo; no inventes la forma.

**Sesión (state/session).** `useSession()` -> `{ lang, demoHidden, role }`. Acciones: `session.login(role, redirect?)`,
`session.logout()`, `session.setLang()`, `session.toggleLang()`, `session.hideDemo()`. Fuera de componentes:
`getSession()` y `navigate(to)`. Para pedir sesión antes de una acción: `requireSession("mvz", () => ...)` o
`openLogin({ role, dest, stay, signup, next })` de `features/auth`; enlaces con sesión: `<GatedLink role to>`.
`RequireRole` ya inicia la sesión simulada al entrar a `/panel` o `/admin` (comportamiento del demo).

**Modal.** `openModal({ title: "Título en español", content: <div className="modal-b">…</div>, size: "sm" })` y
`closeModal()`. El título se traduce solo; el contenido trae su propio `.modal-b`. El Modal ya maneja role=dialog,
aria-modal, foco inicial y atrapado, Escape, clic fuera, regreso del foco y pausa de Lenis.

**Avisos.** `toast("Texto en español")`: se traduce y se anuncia con aria-live.

**Movimiento.** Agrega la clase `rv` a lo que debe aparecer al hacer scroll y `data-count={n}` a cifras animadas: el
layout ya los revela (también los que llegan después de cargar datos). Respeta `prefers-reduced-motion`.
Desplazarse a una sección: `scrollToId("id")` de `lib/motion`. No crees otra instancia de Lenis.

**Clases CSS.** Botones: `btn btn-primary|btn-accent|btn-ghost|btn-light|btn-outline-light`, `btn-sm`, `btn-block`
(o `btnClass("primary", { sm: true })`). Badges: `badge badge-new|soft|ok|warn|dark`. Avisos: `notice`, `notice warn`.
Paneles: `panel`, `list-row`, `tbl-wrap` + `tbl`, `state st-ok|st-rev|st-draft`. Panel y admin: `.app > nav.side + main.main`.
Estilos nuevos van en `styles/extras.css` o al final del archivo de su área; no reordenes `styles/index.css`.

**Precios.** Siempre `<Price amount was />` (pinta `money()` + `ivaLabel()`); nunca un monto sin la leyenda de IVA.

**Iconos.** `<Icon name="award" />` (decorativo, aria-hidden). Nombres tipados en `components/icons.ts`.

**Accesibilidad.** Un solo `<h1>` por página; `<label htmlFor>` en cada campo; botones son `<button type="button">`;
`aria-expanded` en lo que abre y cierra; sin `dangerouslySetInnerHTML` con datos (solo constantes del código, como Icon).

## Stubs que dejó esta tarea

- `features/webinars/actions.tsx`: `webinarReg` guarda el registro solo en la sesión del navegador; `enterLive` navega a
  `/webinar/:slug` (placeholder). Reemplazar por la API cuando exista `POST /api/webinars/:slug/registro`.
- `features/sitio/Red.tsx` y `Paginas.tsx`: los formularios "Quiero ser distribuidor" y farmacovigilancia solo confirman
  (como el demo). [FALTA DATO] endpoint de recepción en el contrato.
- `features/sitio/Home.tsx` > `PanelMock`: acepta `stats` (puntos, cursos, constancias); hoy muestra textos neutros.
