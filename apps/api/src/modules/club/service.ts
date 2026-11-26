import type { ClubReward, ClubRule, PointsBalance, RedeemResult, RuleId } from "@kiron/shared";
import { db } from "../../store";
import { hoyMx } from "../../lib/clock";
import { conflict, notFound } from "../../lib/http";
import { findCourse } from "../cursos/service";
import { hasApprovedEnrollment, upsertEnrollment } from "../inscripciones/service";

/* Suma (o resta) puntos y deja el movimiento en el historial. Devuelve los puntos aplicados. */
export const addPoints = (u: string, puntos: number, concepto: string): number => {
  if (!puntos) return 0;
  const s = db();
  s.puntos[u] = (s.puntos[u] ?? 0) + puntos;
  s.movimientos.unshift({ u, f: hoyMx(), concepto, puntos });
  return puntos;
};

/* Aplica la regla vigente (los valores los edita la administración). */
export const awardRule = (u: string, id: RuleId, concepto: string): number => {
  const r = db().reglas.find((x) => x.id === id);
  return r ? addPoints(u, r.puntos, concepto) : 0;
};

export const balanceOf = (u: string): number => db().puntos[u] ?? 0;

export const listRules = async (): Promise<ClubRule[]> => db().reglas;
export const listRewards = async (): Promise<ClubReward[]> => db().premios;

export const myPoints = async (u: string): Promise<PointsBalance> => ({
  saldo: balanceOf(u),
  canjeados: db().canjeados.filter((c) => c.u === u).map((c) => c.premio),
  movimientos: db()
    .movimientos.filter((m) => m.u === u)
    .map(({ f, concepto, puntos }) => ({ f, concepto, puntos })),
});

export const redeem = async (u: string, premioId: string): Promise<RedeemResult> => {
  const s = db();
  const premio = s.premios.find((p) => p.id === premioId);
  if (!premio) throw notFound("Premio no encontrado");
  const curso = findCourse(premio.id);
  if (s.canjeados.some((c) => c.u === u && c.premio === premio.id) || (curso && hasApprovedEnrollment(u, premio.id)))
    throw conflict(curso ? "Ya tienes este curso" : "Ya canjeaste este premio");
  if (balanceOf(u) < premio.puntos) throw conflict("Puntos insuficientes");
  addPoints(u, -premio.puntos, `Canje: ${premio.nombre}`);
  s.canjeados.push({ u, premio: premio.id });
  const inscripcion = curso ? upsertEnrollment(u, premio.id, "approved", "Canje Club MVZ") : null;
  return { saldo: balanceOf(u), premio, inscripcion };
};

export const updateRule = async (id: RuleId, puntos: number): Promise<ClubRule> => {
  const r = db().reglas.find((x) => x.id === id);
  if (!r) throw notFound("Regla no encontrada");
  r.puntos = puntos;
  return r;
};

export const addReward = async (nombre: string, puntos: number): Promise<ClubReward> => {
  const s = db();
  const n = s.premios.reduce((m, p) => Math.max(m, Number(/^rw-(\d+)$/.exec(p.id)?.[1] ?? 0)), 0) + 1;
  const r: ClubReward = { id: `rw-${n}`, nombre, puntos, icono: "gift" };
  s.premios.push(r);
  return r;
};

export const deleteReward = async (id: string): Promise<void> => {
  const s = db();
  const i = s.premios.findIndex((p) => p.id === id);
  if (i < 0) throw notFound("Premio no encontrado");
  s.premios.splice(i, 1);
};
