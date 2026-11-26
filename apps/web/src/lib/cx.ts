/* Une clases CSS ignorando valores falsos: cx("btn", on && "on"). */
export const cx = (...parts: Array<string | false | null | undefined>): string => parts.filter(Boolean).join(" ");
