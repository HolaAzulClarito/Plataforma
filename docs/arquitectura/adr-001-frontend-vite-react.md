# ADR-001: Frontend con Vite + React + TypeScript en lugar de Next.js

**Estado:** Aceptado
**Fecha:** 26/11/2026
**Decide:** Tech lead Azul Clarito (aprobado en conversación, Gate 2)

## Contexto
El demo v2.4.1 es una SPA en JavaScript vanilla (`legacy/assets/js/app.js`, ~2,000 líneas) que se publica como sitio estático. Hay que migrarlo a React con una estructura mantenible. El stack por defecto de la agencia es Next.js.

## Opciones consideradas
| Opción | A favor | En contra | Costo aproximado |
|---|---|---|---|
| Vite + React + TS (SPA) | Encaja con el demo actual; build estático; hosting igual al de hoy; menos piezas | Sin render en servidor ni SEO por página | Hosting estático: [FALTA DATO] (hoy Netlify) |
| Next.js + React + TS | Default de la agencia; SSR y SEO | Requiere hosting con Node; más estructura de la que pide un prototipo | [FALTA DATO] |

## Decisión
Vite + React 19 + TypeScript, con React Router 7 en modo librería y `BrowserRouter` (URLs limpias, sin `#`). El hosting estático redirige todas las rutas a `index.html`.

## Consecuencias
- Más fácil: publicar igual que hoy; desarrollo rápido con HMR.
- Más difícil: SEO por página. Aceptable porque el demo está marcado `noindex`.
- Deuda: los enlaces viejos con `#/ruta` se redirigen en el cliente a `/ruta` (ver `docs/mapa-rutas.md`).

## Cuándo revisar esta decisión
Si la plataforma se convierte en el sitio público de kironmexico.com y necesita SEO por producto, migrar a Next.js (los componentes React se reutilizan).
