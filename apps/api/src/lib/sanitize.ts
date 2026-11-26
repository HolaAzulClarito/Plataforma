/* Limpieza de HTML con lista de etiquetas permitidas, sin atributos (salvo href seguro en <a>).
   Conservador a propósito: lo que no reconoce lo convierte en texto escapado. Si la descripción llega a necesitar más
   formato, conviene una librería mantenida (p. ej. sanitize-html); hoy no se agrega para no sumar dependencias. */

const ALLOWED = new Set(["p", "br", "b", "strong", "i", "em", "u", "ul", "ol", "li", "h3", "h4", "blockquote", "a"]);
const DROP_WITH_CONTENT = /<(script|style|iframe|object|embed|template|noscript|svg|math)\b[\s\S]*?(<\/\1\s*>|$)/gi;
const TAG = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^<>]*)>/g;

const escapeText = (s: string) => s.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const escapeAttr = (s: string) => s.replace(/&(?!amp;)/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const safeHref = (attrs: string): string | null => {
  const m = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/i.exec(attrs);
  const raw = (m?.[2] ?? m?.[3] ?? m?.[4] ?? "").trim();
  return /^(https?:\/\/|mailto:)/i.test(raw) ? raw : null;
};

export const sanitizeHtml = (input: string): string => {
  const src = input.replace(/<!--[\s\S]*?(-->|$)/g, "").replace(DROP_WITH_CONTENT, "");
  let out = "";
  let last = 0;
  for (const m of src.matchAll(TAG)) {
    out += escapeText(src.slice(last, m.index));
    last = m.index + m[0].length;
    const name = m[1]!.toLowerCase();
    if (!ALLOWED.has(name)) continue;
    const closing = m[0].startsWith("</");
    if (closing) out += name === "br" ? "" : `</${name}>`;
    else if (name === "a") {
      const href = safeHref(m[2] ?? "");
      out += href ? `<a href="${escapeAttr(href)}" rel="noopener noreferrer" target="_blank">` : "<a>";
    } else out += `<${name}>`;
  }
  return out + escapeText(src.slice(last));
};
