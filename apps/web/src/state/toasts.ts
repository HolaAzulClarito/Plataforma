/* Bus de avisos (toast). toast("texto en español"): ToastHost lo traduce y lo anuncia con aria-live. */
import { createStore, useStore } from "./createStore";

export interface ToastState {
  id: number;
  msg: string;
}

const DURATION = 3600;
export const toastStore = createStore<ToastState | null>(null);
let seq = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(msg: string): void {
  seq += 1;
  toastStore.set({ id: seq, msg });
  clearTimeout(timer);
  timer = setTimeout(() => toastStore.set(null), DURATION);
}

export const useToast = () => useStore(toastStore);
