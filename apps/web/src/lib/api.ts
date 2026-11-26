/* Cliente HTTP tipado contra /api (contrato en packages/shared/src/api.ts).
   - Envía el rol de demo en DEMO_ROLE_HEADER.
   - Errores: la API responde { error }; aquí se lanza ApiError con ese mensaje y el status.
   - useApi<T>(path) para lecturas en componentes; apiPost/apiPatch/apiPut/apiDelete para escrituras. */
import { useCallback, useEffect, useState } from "react";
import { DEMO_ROLE_HEADER, type ApiError as ApiErrorBody } from "@kiron/shared";
import { getSession, useSession } from "../state/session";

export const API_BASE = "/api";

export class ApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const toUrl = (path: string) =>
  path.startsWith(API_BASE + "/") ? path : API_BASE + (path.startsWith("/") ? path : "/" + path);

export async function apiRequest<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const role = getSession().role;
  if (role) headers[DEMO_ROLE_HEADER] = role;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  let res: Response;
  try {
    res = await fetch(toUrl(path), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError("No pudimos conectar con el servidor.", 0);
  }
  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = undefined;
    }
  }
  if (!res.ok) {
    const msg = (data as Partial<ApiErrorBody> | undefined)?.error;
    throw new ApiError(typeof msg === "string" && msg ? msg : `Error ${res.status}`, res.status);
  }
  return data as T;
}

export const apiGet = <T>(path: string, signal?: AbortSignal) => apiRequest<T>("GET", path, undefined, signal);
export const apiPost = <T>(path: string, body?: unknown) => apiRequest<T>("POST", path, body ?? {});
export const apiPatch = <T>(path: string, body: unknown) => apiRequest<T>("PATCH", path, body);
export const apiPut = <T>(path: string, body: unknown) => apiRequest<T>("PUT", path, body);
export const apiDelete = <T = void>(path: string) => apiRequest<T>("DELETE", path);

/* Caché en memoria de lecturas GET por rol + ruta: evita parpadeos al volver a una página. Siempre se revalida. */
const cache = new Map<string, unknown>();
export const clearApiCache = () => cache.clear();

export interface ApiState<T> {
  data: T | undefined;
  error: string | null;
  /* Código HTTP del último error (0 = sin conexión), o null si no hubo error. */
  status: number | null;
  loading: boolean;
  refetch: () => void;
}

interface InnerState<T> {
  key: string | null;
  data: T | undefined;
  error: string | null;
  status: number | null;
  loading: boolean;
}

const initial = <T>(key: string | null): InnerState<T> => ({
  key,
  data: key ? (cache.get(key) as T | undefined) : undefined,
  error: null,
  status: null,
  loading: key !== null,
});

/* Lee `path` (con o sin el prefijo /api). Con path = null no pide nada (lecturas condicionales).
   Vuelve a pedir cuando cambian la ruta o el rol. */
export function useApi<T>(path: string | null): ApiState<T> {
  const { role } = useSession();
  const key = path === null ? null : `${role ?? "-"} ${path}`;
  const [state, setState] = useState<InnerState<T>>(() => initial<T>(key));
  const [nonce, setNonce] = useState(0);

  /* Si cambió la llave, el estado anterior no aplica: se ajusta durante el render (patrón documentado de React). */
  if (state.key !== key) {
    const next = initial<T>(key);
    /* Si solo cambió el rol (misma ruta), conserva los datos visibles mientras revalida: evita parpadeos al iniciar sesión. */
    const samePath = state.key !== null && key !== null && state.key.slice(state.key.indexOf(" ")) === key.slice(key.indexOf(" "));
    setState(samePath && next.data === undefined ? { ...next, data: state.data } : next);
  }

  useEffect(() => {
    if (key === null || path === null) return;
    const ctrl = new AbortController();
    setState((s) => (s.key === key ? { ...s, loading: true, error: null, status: null } : s));
    apiGet<T>(path, ctrl.signal).then(
      (data) => {
        cache.set(key, data);
        setState({ key, data, error: null, status: null, loading: false });
      },
      (e: unknown) => {
        if ((e as Error).name === "AbortError") return;
        const msg = e instanceof Error ? e.message : "Error";
        const status = e instanceof ApiError ? e.status : 0;
        setState((s) => ({ key, data: s.key === key ? s.data : undefined, error: msg, status, loading: false }));
      },
    );
    return () => ctrl.abort();
  }, [key, path, nonce]);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);
  return { data: state.data, error: state.error, status: state.status, loading: state.loading, refetch };
}
