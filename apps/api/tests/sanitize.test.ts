import { describe, expect, it } from "vitest";
import { sanitizeHtml } from "../src/lib/sanitize";

describe("sanitizeHtml", () => {
  it("conserva el formato permitido sin atributos", () => {
    expect(sanitizeHtml('<p class="x"><b>Hola</b> <em>mundo</em></p><ul><li>uno</li></ul>')).toBe("<p><b>Hola</b> <em>mundo</em></p><ul><li>uno</li></ul>");
  });

  it("elimina scripts, estilos, iframes y manejadores de eventos", () => {
    expect(sanitizeHtml('<script>alert(1)</script><style>p{}</style><iframe src="x"></iframe><img src=x onerror=alert(1)><p onmouseover="x">t</p>')).toBe("<p>t</p>");
  });

  it("solo deja enlaces http, https o mailto", () => {
    expect(sanitizeHtml('<a href="https://kironmexico.com">k</a>')).toBe('<a href="https://kironmexico.com" rel="noopener noreferrer" target="_blank">k</a>');
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
    expect(sanitizeHtml('<a href="data:text/html,hi">x</a>')).toBe("<a>x</a>");
  });

  it("escapa los signos sueltos y etiquetas sin cerrar", () => {
    expect(sanitizeHtml("3 < 5 y <scr<script>ipt>")).toBe("3 &lt; 5 y &lt;scr");
    expect(sanitizeHtml('<p title="a>b">x</p>')).toBe("<p>b&quot;&gt;x</p>");
  });
});
