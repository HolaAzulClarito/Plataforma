import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { clearApiCache } from "../lib/api";
import { closeModal } from "../state/modal";
import { session } from "../state/session";
import { clearMissing } from "../i18n";

/* jsdom no implementa scrollTo ni scrollIntoView. */
window.scrollTo = () => {};
Element.prototype.scrollIntoView = () => {};

afterEach(() => {
  cleanup();
  closeModal();
  session.reset();
  clearApiCache();
  clearMissing();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
