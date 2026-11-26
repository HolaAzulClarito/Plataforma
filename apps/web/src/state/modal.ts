/* Bus del modal global (un modal a la vez, como el demo). ModalHost lo pinta con <Modal>.
   openModal({ title: "Texto en español", content: <JSX/>, size: "sm" }); closeModal(). */
import type { ReactNode } from "react";
import { createStore, useStore } from "./createStore";

export interface ModalOptions {
  /* Título en español; el Modal lo traduce con t(). */
  title: string;
  content: ReactNode;
  size?: "sm" | "md";
  /* Se llama al cerrar por cualquier vía (botón, Escape, clic fuera). */
  onClose?: () => void;
}

export interface ModalState extends ModalOptions {
  id: number;
}

export const modalStore = createStore<ModalState | null>(null);
let seq = 0;

export function openModal(opts: ModalOptions): void {
  seq += 1;
  modalStore.set({ ...opts, id: seq });
}

export function closeModal(): void {
  const cur = modalStore.get();
  if (!cur) return;
  modalStore.set(null);
  cur.onClose?.();
}

export const useModalState = () => useStore(modalStore);
export const isModalOpen = () => modalStore.get() !== null;
