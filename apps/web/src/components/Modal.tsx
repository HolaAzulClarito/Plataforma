import { useEffect, useRef, type ReactNode } from "react";
import { closeModal, useModalState } from "../state/modal";
import { useT } from "../i18n";
import { startScroll, stopScroll } from "../lib/motion";
import { cx } from "../lib/cx";
import { Icon } from "./Icon";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])';

interface ModalProps {
  title: string;
  size?: "sm" | "md";
  onClose: () => void;
  children: ReactNode;
}

/* Diálogo accesible con las clases del demo (.modal-bg, .modal, .modal-h, .modal-b):
   role=dialog + aria-modal, foco inicial en el primer campo o botón .btn, foco atrapado con Tab, Escape y clic
   fuera cierran, devuelve el foco al disparador y detiene Lenis mientras está abierto.
   Normalmente no se usa directo: llama openModal() de state/modal y ModalHost lo pinta. */
export function Modal({ title, size = "md", onClose, children }: ModalProps) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = "modal-title";
  /* onClose en una ref: el efecto de foco corre una sola vez aunque el padre pase una función nueva. */
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    stopScroll();
    const box = ref.current;
    const first =
      box?.querySelector<HTMLElement>(".modal-b input:not([type=hidden]), .modal-b button.btn") ??
      box?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRef.current();
        return;
      }
      if (e.key !== "Tab" || !box) return;
      const items = [...box.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.closest("[hidden]"));
      if (!items.length) return;
      const a = items[0]!;
      const z = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === a) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      startScroll();
      if (trigger && document.contains(trigger)) trigger.focus();
    };
  }, []);

  return (
    <div
      className="modal-bg open"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div ref={ref} className={cx("modal", size === "sm" && "sm")} role="dialog" aria-modal="true" aria-labelledby={titleId} data-lenis-prevent="">
        <div className="modal-h">
          <h3 id={titleId}>{t(title)}</h3>
          <button className="icon-btn" type="button" aria-label={t("Cerrar")} onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* Pinta el modal global abierto con openModal(). Va una sola vez en App. */
export function ModalHost() {
  const m = useModalState();
  if (!m) return null;
  return (
    <Modal key={m.id} title={m.title} size={m.size} onClose={closeModal}>
      {m.content}
    </Modal>
  );
}
