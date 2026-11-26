/* Club MVZ (adminClub, APP.ruleSave, APP.rewardAdd, APP.rewardDel). */
import { useState, type FormEvent } from "react";
import type { ClubReward, ClubRule, RewardCreateRequest } from "@kiron/shared";
import { Icon } from "../../components/Icon";
import { ApiStatus } from "../../components/ui";
import { useT } from "../../i18n";
import { apiDelete, apiPost, apiPut } from "../../lib/api";
import { EmptyRow, useAction, useAdminApi } from "./common";
import { MainHead } from "./Shell";

function RuleRow({ r }: { r: ClubRule }) {
  const t = useT();
  const { run } = useAction();
  const [v, setV] = useState(String(r.puntos));
  const commit = () => {
    const puntos = Math.max(0, parseInt(v, 10) || 0);
    setV(String(puntos));
    if (puntos === r.puntos) return;
    void run(() => apiPut<ClubRule>(`/admin/club/reglas/${r.id}`, { puntos }), `Regla guardada · ${r.nombre} · ${puntos} puntos`);
  };
  return (
    <div className="list-row">
      <span className="lr-ico">
        <Icon name="plus" />
      </span>
      <div>
        <b>{t(r.nombre)}</b>
        <small>{t(r.frecuencia)}</small>
      </div>
      <span className="end">
        <input
          className="input pts-in"
          type="number"
          min={0}
          step={10}
          value={v}
          aria-label={`${t("Puntos por")} ${t(r.nombre)}`}
          onChange={(e) => setV(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
          }}
        />
      </span>
    </div>
  );
}

export function ClubPage() {
  const t = useT();
  const rules = useAdminApi<ClubRule[]>("/club/reglas");
  const rewards = useAdminApi<ClubReward[]>("/club/premios");
  const { busy, run } = useAction();
  const [nombre, setNombre] = useState("");
  const [puntos, setPuntos] = useState("");

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const body: RewardCreateRequest = { nombre: nombre.trim(), puntos: parseInt(puntos, 10) };
    if (!body.nombre || !body.puntos || body.puntos < 1) return;
    const r = await run(() => apiPost<ClubReward>("/admin/club/premios", body), "Premio agregado. Ya aparece en el Club de los médicos.");
    if (r) {
      setNombre("");
      setPuntos("");
    }
  };

  return (
    <>
      <MainHead title="Club MVZ" sub="Reglas para sumar y premios para canjear · valores de ejemplo" />
      <div className="two" style={{ marginTop: 0 }}>
        <div className="panel">
          <h3>{t("Cómo se suman puntos")}</h3>
          <p className="sub">{t("Cambia el valor y guarda")}</p>
          <ApiStatus loading={rules.loading && !rules.data} error={rules.error} onRetry={rules.refetch} />
          {rules.data?.map((r) => <RuleRow key={`${r.id}-${r.puntos}`} r={r} />)}
        </div>
        <div className="panel">
          <h3>{t("Nuevo premio")}</h3>
          <p className="sub">{t("Aparece al momento en el Club de cada médico")}</p>
          <form onSubmit={add}>
            <div className="form-row">
              <label className="l" htmlFor="rw1">
                {t("Premio")}
              </label>
              <input className="input" id="rw1" required maxLength={120} placeholder={t("Ej. Diplomado Medicina Interna Felina")} value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="form-row">
              <label className="l" htmlFor="rw2">
                {t("Puntos necesarios")}
              </label>
              <input className="input" id="rw2" type="number" min={1} required placeholder={t("Ej. 2500")} value={puntos} onChange={(e) => setPuntos(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
              <Icon name="plus" /> {t("Agregar premio")}
            </button>
          </form>
        </div>
      </div>
      <h3 style={{ margin: "28px 0 14px", fontSize: 22 }}>{t("Premios vigentes")}</h3>
      <ApiStatus loading={rewards.loading && !rewards.data} error={rewards.error} onRetry={rewards.refetch} />
      {rewards.data ? (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th scope="col">{t("Premio")}</th>
                <th scope="col">{t("Puntos")}</th>
                <th scope="col">
                  <span className="sr">{t("Acciones")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rewards.data.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b style={{ color: "var(--web-navy)" }}>{r.nombre}</b>
                  </td>
                  <td>{r.puntos.toLocaleString("es-MX")}</td>
                  <td className="nowrap">
                    <button
                      type="button"
                      className="mini"
                      aria-label={`${t("Quitar")} · ${r.nombre}`}
                      onClick={() => run(() => apiDelete(`/admin/club/premios/${r.id}`), `Premio quitado · ${r.nombre}`)}
                    >
                      <Icon name="x" /> {t("Quitar")}
                    </button>
                  </td>
                </tr>
              ))}
              {!rewards.data.length ? <EmptyRow cols={3}>{t("Sin premios vigentes.")}</EmptyRow> : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
