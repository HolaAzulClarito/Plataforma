import { useToast } from "../state/toasts";
import { useT } from "../i18n";
import { cx } from "../lib/cx";
import { Icon } from "./Icon";

/* Aviso flotante del demo (.toast). Siempre está en el DOM para que aria-live anuncie cada mensaje.
   Para mostrar uno: toast("Texto en español") de state/toasts. */
export function ToastHost() {
  const t = useT();
  const cur = useToast();
  return (
    <div className={cx("toast", cur && "show")} role="status" aria-live="polite">
      <span className="ok">
        <Icon name="check" />
      </span>
      <span className="msg" key={cur?.id}>
        {cur ? t(cur.msg) : ""}
      </span>
    </div>
  );
}
