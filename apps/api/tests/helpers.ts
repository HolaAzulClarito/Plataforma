/* eslint-disable @typescript-eslint/no-explicit-any -- los tests leen cuerpos JSON de forma libre; el contrato tipado vive en @kiron/shared. */
import { afterEach, beforeEach } from "vitest";
import { DEMO_ROLE_HEADER, type Role } from "@kiron/shared";
import { app } from "../src/app";
import { resetStore } from "../src/store";
import { setClock } from "../src/lib/clock";

/* Fecha fija de los tests: 26/11/2026 al mediodía en el centro de México. */
export const T0 = new Date("2026-11-26T12:00:00-06:00").getTime();
let offset = 0;

export const advance = (ms: number) => {
  offset += ms;
};

export const useDemo = () => {
  beforeEach(() => {
    resetStore();
    offset = 0;
    setClock(() => new Date(T0 + offset));
  });
  afterEach(() => setClock(null));
};

export interface Res<T = any> {
  status: number;
  body: T;
  text: string;
  headers: Headers;
}

/* Petición a la app con rol de demo opcional. */
export const call = async <T = any>(method: string, path: string, opts: { role?: Role | string; body?: unknown } = {}): Promise<Res<T>> => {
  const headers: Record<string, string> = {};
  if (opts.role) headers[DEMO_ROLE_HEADER] = opts.role;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await app.request(path, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
  const text = await res.text();
  let body: T;
  try {
    body = JSON.parse(text) as T;
  } catch {
    body = text as T;
  }
  return { status: res.status, body, text, headers: res.headers };
};

export const get = <T = any>(path: string, role?: Role) => call<T>("GET", path, { role });
export const mvz = {
  get: <T = any>(p: string) => call<T>("GET", "/api/me" + p, { role: "mvz" }),
  post: <T = any>(p: string, body: unknown = {}) => call<T>("POST", "/api/me" + p, { role: "mvz", body }),
};
export const admin = {
  get: <T = any>(p: string) => call<T>("GET", "/api/admin" + p, { role: "admin" }),
  post: <T = any>(p: string, body: unknown = {}) => call<T>("POST", "/api/admin" + p, { role: "admin", body }),
  patch: <T = any>(p: string, body: unknown) => call<T>("PATCH", "/api/admin" + p, { role: "admin", body }),
  put: <T = any>(p: string, body: unknown) => call<T>("PUT", "/api/admin" + p, { role: "admin", body }),
  del: <T = any>(p: string) => call<T>("DELETE", "/api/admin" + p, { role: "admin" }),
};
