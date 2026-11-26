/* Movimiento del sitio (paridad con el demo): Lenis para el scroll suave y GSAP + ScrollTrigger para el revelado de
   los elementos .rv y los contadores [data-count]. Todo se apaga con prefers-reduced-motion. */
import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let lenis: Lenis | null = null;
let registered = false;
const register = () => {
  if (!registered) {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }
};

/* Instancia global de Lenis. Puede ser null (movimiento reducido o tests). */
export const getLenis = () => lenis;

/* Monta Lenis una vez para toda la app. Se llama solo en App. */
export function useLenis(): void {
  useEffect(() => {
    const reduced = prefersReducedMotion();
    document.documentElement.classList.toggle("no-motion", reduced);
    if (reduced) return;
    register();
    const l = new Lenis({ duration: 1.1, smoothWheel: true });
    lenis = l;
    l.on("scroll", ScrollTrigger.update);
    let raf = 0;
    const loop = (tm: number) => {
      l.raf(tm);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      l.destroy();
      if (lenis === l) lenis = null;
    };
  }, []);
}

/* Detiene / reanuda el scroll suave (el Modal lo detiene mientras está abierto). */
export const stopScroll = () => lenis?.stop();
export const startScroll = () => lenis?.start();

/* Sube al inicio sin animación (cambio de ruta). */
export function scrollToTop(): void {
  if (lenis) lenis.scrollTo(0, { immediate: true });
  if (typeof window.scrollTo === "function") {
    try {
      window.scrollTo(0, 0);
    } catch {
      /* jsdom no implementa scrollTo */
    }
  }
}

/* Desplaza hasta un id (APP.scrollTo del demo). */
export function scrollToId(id: string, offset = -90): void {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el, { offset });
  else el.scrollIntoView?.({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

const showNow = (el: HTMLElement) => {
  el.style.opacity = "1";
  el.style.transform = "none";
};

function revealEl(el: HTMLElement): void {
  if (el.dataset.rv) return;
  el.dataset.rv = "1";
  const idx = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
  gsap.to(el, {
    opacity: 1,
    y: 0,
    duration: 0.8,
    ease: "power3.out",
    delay: (idx % 6) * 0.06,
    scrollTrigger: { trigger: el, start: "top 92%", once: true },
  });
}

function countEl(el: HTMLElement): void {
  if (el.dataset.counted) return;
  el.dataset.counted = "1";
  const end = Number(el.dataset.count);
  if (!Number.isFinite(end)) return;
  const o = { v: 0 };
  gsap.to(o, {
    v: end,
    duration: 1.6,
    ease: "power2.out",
    scrollTrigger: { trigger: el, start: "top 95%", once: true },
    onUpdate: () => {
      el.textContent = Math.round(o.v).toLocaleString("es-MX");
    },
  });
}

/* Revela los .rv y anima los [data-count] dentro de `ref`, incluidos los que aparecen después (datos de la API).
   Se usa una vez por layout. Limpia animaciones y observadores al desmontar. */
export function useReveal(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const reduced = prefersReducedMotion();
    if (!reduced) register();
    const ctx = reduced ? null : gsap.context(() => {}, root);
    let pending = 0;
    const scan = () => {
      pending = 0;
      const rv = root.querySelectorAll<HTMLElement>(".rv");
      if (!ctx) {
        rv.forEach(showNow);
        return;
      }
      ctx.add(() => {
        rv.forEach(revealEl);
        root.querySelectorAll<HTMLElement>("[data-count]").forEach(countEl);
      });
      ScrollTrigger.refresh();
    };
    scan();
    /* Los .rv nuevos (cambio de ruta, datos que llegan) se procesan en el siguiente cuadro. */
    const mo = new MutationObserver(() => {
      if (!pending) pending = requestAnimationFrame(scan);
    });
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      if (pending) cancelAnimationFrame(pending);
      ctx?.revert();
    };
  }, [ref]);
}
