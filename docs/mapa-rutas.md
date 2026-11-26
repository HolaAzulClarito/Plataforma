# Mapa de rutas y módulos

Fuente: `legacy/assets/js/app.js` (`route()`, línea 956). Las rutas nuevas no llevan `#`. Un enlace viejo `/#/ruta` se redirige en el cliente a `/ruta`.

## Frontend (`apps/web/src/features/`)

| Ruta nueva | Ruta legacy | Feature | Acceso |
|---|---|---|---|
| `/` | `#/` | sitio | Público |
| `/productos?cat=&q=&focus=` | `#/productos` | sitio | Público |
| `/producto/:slug` | `#/producto/:slug` | sitio | Público |
| `/academia?tab=cursos\|diplomados\|webinars&sec=` | `#/academia` | academia | Público |
| `/academia/curso/:slug` | `#/academia/curso/:slug` | academia | Público; lecciones con inscripción aprobada |
| `/verificar/:folio` | `#/verificar/:folio` | academia | Público |
| `/webinar/:slug` | `#/webinar/:slug` | webinars | Público |
| `/webinar` (sin slug) | `#/webinar` | webinars | Redirige a `/webinar/proximo` |
| `/videoteca?tab=productos\|tutoriales` | `#/videoteca`, `#/videoteca-pets` | sitio | Videos solo con sesión |
| `/recetas-cuantificadas` | igual | sitio | Público |
| `/distribuidores/mexico`, `/distribuidores/mundo` | `#/distribuidores*`, `#/distribuidores-mexico`, `#/distribuidores-mundo` | sitio | Público |
| `/representantes` | `#/representantes`, `#/donde-comprar` | sitio | Público |
| `/farmacovigilancia` | igual | sitio | Público |
| `/legal/privacidad`, `/legal/condiciones` | igual | sitio | Público |
| `/panel`, `/panel/cursos`, `/panel/constancias`, `/panel/club` | `#/panel*`, `#/consultorio*` | panel | Rol `mvz` |
| `/admin` | `#/admin` | admin | Rol `admin` |
| `/admin/medicos`, `/admin/webinars`, `/admin/club`, `/admin/paginas` | igual | admin | Rol `admin` |
| `/admin/academia/:tab` (cursos, inscripciones, alumnos, calificaciones, intentos, examenes, constancias, automatizaciones, reportes, ajustes) | igual | admin | Rol `admin` |
| `/admin/academia/editor/:ci/:mi/:li` | igual | admin | Rol `admin` |
| `*` | 404 | sitio | Público |

Comportamiento heredado: entrar a `/panel` o `/admin` sin sesión inicia sesión simulada con ese rol (ver ADR-003).

## API (`apps/api/src/modules/`)

Contrato completo (tipos de request/response) en `packages/shared/src/api.ts`. Prefijos:

- `/api/...` público. `/api/me/...` rol `mvz` (siempre el médico de demo `DEMO_USER`). `/api/admin/...` rol `admin`.
- El rol viaja en `X-Demo-Role: mvz | admin` (ADR-003, no es seguridad). Sin rol en `/api/me` o `/api/admin`: 401. Rol equivocado: 403.
- Errores `{ error }` (400 validación con `campos`, 401, 403, 404, 409, 413 cuerpo de más de 5 MB). Datos en memoria; `POST /api/demo/reset` los restaura (404 en producción).

| Módulo | Público | Médico (`/api/me`) | Admin (`/api/admin`) |
|---|---|---|---|
| demo | `GET /sesion` (mvz o admin), `POST /demo/reset` | | |
| catalogo | `GET /categorias`, `/productos`, `/productos/:slug`, `/representantes`, `/distribuidores`, `/paises`, `/videos` | | |
| cursos | `GET /cursos` (`?todos=1` solo admin), `GET /cursos/:slug` | | `GET /cursos?estado=&cat=&q=&rango=`, `PATCH /cursos/:slug`, `POST /cursos/lote`, `GET /cursos/:slug/vista`, `GET\|PUT /cursos/:slug/examen` |
| inscripciones | | `GET\|POST /inscripciones` | `GET /inscripciones?curso=&estado=&q=&rango=`, `POST /inscripciones`, `PATCH /inscripciones/:id`, `POST /inscripciones/lote` |
| progreso | | `GET /cursos`, `GET /cursos/:slug/progreso`, `POST /cursos/:slug/lecciones/:i/avance` | |
| examenes | | `GET /cursos/:slug/examen`, `POST .../examen/iniciar`, `POST .../examen/intentos`, `POST .../examen/solicitudes` | `GET /academia/solicitudes`, `POST /academia/solicitudes/:id`, `GET /academia/intentos`, `GET /academia/intentos/:id` |
| constancias | `GET /constancias/:folio` (verificación) | `GET /constancias`, `GET /constancias/:folio` | |
| webinars | `GET /webinars/proximo`, `GET /webinars`, `GET /webinars/:slug` | `GET /webinars/:slug`, `POST /webinars/:slug/registro`, `POST /webinars/:slug/asistencia` | `GET\|POST /webinars`, `GET /webinars/:slug/asistentes` |
| club | `GET /club/reglas`, `GET /club/premios` | `GET /puntos`, `POST /canjes` | `PUT /club/reglas/:id`, `POST /club/premios`, `DELETE /club/premios/:id` |
| medicos | | | `GET /medicos/verificaciones`, `POST /medicos/verificaciones/:id/aprobar` |
| paginas | | | `GET\|POST /paginas`, `PATCH /paginas/:id`, `POST /paginas/:id/publicar` |
| academia | | | `GET\|PATCH /academia/ajustes`, `GET /academia/examenes`, `GET /academia/calificaciones`, `GET /academia/calificaciones/historial`, `GET /academia/alumnos`, `POST /academia/alumnos/importar`, `GET\|POST /academia/grupos`, `GET\|PATCH /academia/grupos/:id`, `GET\|POST /academia/banco`, `GET /academia/automatizaciones`, `PATCH /academia/automatizaciones/:id`, `GET /academia/reportes`, `GET /academia/reportes/:tipo` (CSV) |
| plantillas | | | `GET\|POST /academia/plantillas`, `GET\|PATCH /academia/plantillas/:id`, `PUT\|DELETE /academia/plantillas/:id/imagen` |
| editor | | | `GET\|POST /editor/cursos`, `GET\|PATCH /editor/cursos/:id`, `POST .../publicar`, módulos (`DELETE .../modulos/:mi`), lecciones (`mover`, `adjuntos`), `PATCH .../examen`, preguntas, `banco`, `importar`, `exportar` |
| tablero | | | `GET /tablero` (`?formato=csv`) |

**Excepción explícita: `GET /api/webinars/proximo`.** Comparte forma con `GET /api/webinars/:slug` pero devuelve `NextWebinar` (el contador del inicio), no `WebinarSummary`. Se declara antes de `/webinars/:slug` y se conserva por compatibilidad con el inicio. Consecuencias: `proximo` es un slug reservado (crear un webinar con él responde 400) y el `WebinarSummary` del próximo webinar se toma de `GET /api/webinars`, que lo incluye (así lo hace `WebinarPage`). Las rutas `/api/me/webinars/proximo/*` y `/api/admin/webinars/proximo/asistentes` sí usan `proximo` como slug normal.

**Índices posicionales (editor).** El avance guarda índices de lección y los intentos, índices de pregunta. Con alumnos con avance, el editor responde 409 al borrar o mover lecciones existentes, al borrar un módulo con lecciones o al agregar lecciones en un módulo que no es el último con lecciones; con intentos del examen, 409 al borrar preguntas o al cambiarlas entre tipo calificable y no calificable. Agregar al final siempre se permite.

**CSV.** Toda exportación (servidor o navegador) usa `csvCell`/`csvDocument` de `@kiron/shared`: comillas escapadas, BOM y neutralización de fórmulas (`=`, `+`, `-`, `@`).

Reglas que aplica el servidor (ADR-005): un solo examen final por curso; el precio es informativo (curso gratuito: inscripción aprobada al momento; con precio: solicitud pendiente); contenido, avance y examen solo con inscripción `approved` en un curso visible; la lección se completa al reportar 100 % del video (no hay marcado manual); constancia = todas las lecciones + examen aprobado por nota final según la regla de cálculo (ADR-006); intentos = los del examen (0 = sin límite) + adicionales autorizados. El intento cuenta desde que se inicia; el envío se acepta hasta 15 s después del tiempo límite y, pasado eso, el intento queda en 0.0. `GET` del examen nunca incluye respuestas correctas; el detalle solo se devuelve con el ajuste `ocultar` apagado. Puntos según las reglas vigentes del Club (+20 lección, +300 curso, +50 webinar, +200 cédula).
