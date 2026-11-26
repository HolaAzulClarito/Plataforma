# ADR-004: i18n con el diccionario existente y función t()

**Estado:** Aceptado
**Fecha:** 26/11/2026
**Decide:** Tech lead Azul Clarito (aprobado en conversación, Gate 2)

## Contexto
El demo traduce al inglés recorriendo el DOM ya pintado con un `MutationObserver` y un diccionario de ~1,000 entradas indexado por el texto en español (`legacy/assets/js/i18n-en.js`). En React, modificar el DOM por fuera rompe la reconciliación.

## Opciones consideradas
| Opción | A favor | En contra | Costo aproximado |
|---|---|---|---|
| `t("texto en español")` con el diccionario actual | Se reutilizan las traducciones; el español sigue siendo legible en el código | Cambiar un texto en español obliga a cambiar su llave | Bajo |
| react-i18next con llaves (`home.hero.title`) | Estándar de la industria | Reescribir ~1,000 entradas y todo el copy | Alto |

## Decisión
Un `I18nProvider` propio con `t(es)`: devuelve el texto en español o su traducción del diccionario, con las mismas reglas del demo (exactas, expresiones regulares y partes unidas con " · "). Un test falla si un texto usado no tiene traducción.

## Consecuencias
- Sin `MutationObserver` ni manipulación del DOM.
- Los datos que vienen de la API (nombres de producto, títulos de curso) no se traducen, igual que en el demo.

## Cuándo revisar esta decisión
Si se agrega un tercer idioma o un equipo de traducción externo: migrar a llaves con react-i18next.
