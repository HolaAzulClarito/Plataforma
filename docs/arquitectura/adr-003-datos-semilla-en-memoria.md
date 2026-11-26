# ADR-003: Etapa 1 con datos semilla en memoria y login simulado

**Estado:** Aceptado
**Fecha:** 26/11/2026
**Decide:** Tech lead Azul Clarito (aprobado en conversación, Gate 2)

## Contexto
El objetivo de esta etapa es organizar el proyecto y migrarlo a React con paridad funcional. Todavía no hay hosting de base de datos, proveedor de login ni presupuesto aprobado para infraestructura.

## Opciones consideradas
| Opción | A favor | En contra | Costo aproximado |
|---|---|---|---|
| Datos semilla JSON en memoria | Cero infraestructura; paridad rápida con el demo | Los cambios se pierden al reiniciar la API | $0 MXN |
| PostgreSQL + Drizzle + auth gestionado | Persistencia real | Requiere hosting, costos y alta de proveedor | [FALTA DATO] |

## Decisión
La API carga los JSON de `apps/api/src/data/` al arrancar y guarda los cambios en memoria. El login es simulado: el cliente elige el rol `mvz` o `admin` y la API lo recibe en un encabezado de demo. **No es un mecanismo de seguridad** y no debe llegar a producción.

## Consecuencias
- Los servicios exponen funciones con firmas que no dependen del almacenamiento, para cambiar a Drizzle sin tocar rutas ni frontend.
- Los datos reales (catálogo, cursos, representantes) y los de ejemplo (alumnos, puntos, KPIs) viven en carpetas separadas.
- Los datos personales de ejemplo son ficticios; los reales de representantes ya son públicos en kironmexico.com.

## Cuándo revisar esta decisión
Antes de cualquier uso con médicos reales: se requiere PostgreSQL, un proveedor de auth gestionado y un aviso de privacidad conforme a la LFPDPPP.
