/* Raíz de la app. El router, el layout y los providers (estado, i18n) se agregan en la tarea 5.
   Por ahora solo confirma que el monorepo compila y que el paquete compartido se resuelve. */
import { money, ivaLabel } from "@kiron/shared";

export function App() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 32 }}>
      <h1>Kirón · plataforma v2.5 en construcción</h1>
      <p>
        Estructura React lista. Ejemplo de formato compartido: {money(2999)} · {ivaLabel()}
      </p>
    </main>
  );
}
