import { etiqueta } from "../constants/cotizacion-statuses";
import type { Historial } from "../types/cotizacion.types";
function cambios(actual: Historial, previa?: Historial) {
  const a = actual.resumen,
    b = previa?.resumen,
    lineas: string[] = [];
  if (!a) return lineas;
  if (a.documento) lineas.push("Documento registrado · " + a.documento);
  if (!b) {
    if (actual.accion === "creada")
      lineas.push(
        ...a.partidas.map(
          (p) => "Partida agregada · " + p.concepto + " · " + p.subtotal,
        ),
      );
    return lineas;
  }
  for (const k of [
    "proyecto",
    "solicitante",
    "especificaciones",
    "estado",
    "numero_po",
    "motivo",
  ] as const) {
    if (a[k] !== b[k])
      lineas.push(
        (k === "numero_po" ? "Número de PO" : k) +
          " · " +
          (k === "estado" ? etiqueta(b[k]) : b[k] || "—") +
          " → " +
          (k === "estado" ? etiqueta(a[k]) : a[k] || "—"),
      );
  }
  for (const p of a.partidas) {
    const old = b.partidas.find((o) => o.id === p.id);
    if (!old) {
      lineas.push("Partida agregada · " + p.concepto + " · " + p.subtotal);
      continue;
    }
    for (const k of [
      "modo",
      "horas",
      "cantidad",
      "precio",
      "subtotal",
    ] as const)
      if (old[k] !== p[k])
        lineas.push(p.concepto + " · " + k + " " + old[k] + " → " + p[k]);
  }
  for (const p of b.partidas)
    if (!a.partidas.some((o) => o.id === p.id))
      lineas.push("Partida eliminada · " + p.concepto + " · " + p.subtotal);
  return lineas;
}
export function HistorialCotizacion({ eventos }: { eventos: Historial[] }) {
  return (
    <section className="rounded-xl border bg-background p-5">
      <h2 className="font-semibold">Historial de cambios</h2>
      <ol className="mt-4 space-y-4">
        {eventos.map((ev, i) => (
          <li key={ev.id} className="border-l-2 pl-3 text-sm">
            <strong>
              {ev.accion} · {ev.usuario_nombre}
            </strong>
            <p>
              {new Date(ev.creado_en).toLocaleString("es-MX", {
                timeZone: "America/Tijuana",
              })}{" "}
              · Versión {ev.version} · Importe {ev.importe}
            </p>
            <ul>
              {cambios(ev, eventos[i + 1]).map((s, j) => (
                <li key={j}>{s}</li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
