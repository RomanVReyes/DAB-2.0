import Link from "next/link";
import type { Cotizacion } from "../types/cotizacion.types";
import { importe } from "../lib/importes";
import { CotizacionStatus } from "./cotizacion-status";
export function CotizacionesTable({ rows }: { rows: Cotizacion[] }) {
  if (!rows.length)
    return (
      <div className="rounded-xl border border-dashed bg-background px-6 py-16 text-center">
        <h2 className="font-semibold">No hay cotizaciones para mostrar</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Crea tu primer borrador o ajusta los filtros.
        </p>
      </div>
    );
  return (
    <div className="overflow-x-auto rounded-xl border bg-background">
      <table className="w-full min-w-[760px] text-left text-sm">
        <caption className="sr-only">Cotizaciones almacenadas</caption>
        <thead className="border-b text-xs text-muted-foreground">
          <tr>
            {[
              "Folio / Cotización",
              "Solicitante",
              "Creada",
              "Horas",
              "Importe preliminar",
              "Estado",
            ].map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
              <td className="max-w-sm px-4 py-4">
                <Link
                  className="font-semibold hover:underline"
                  href={`/cotizaciones/${r.id}`}
                >
                  {r.empresas.nombre} · {r.proyecto}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  #{r.folio} · {r.codigo}
                </p>
              </td>
              <td className="px-4 py-4">{r.solicitantes.nombre}</td>
              <td className="whitespace-nowrap px-4 py-4">
                {new Date(r.creado_en).toLocaleDateString("es-MX", {
                  timeZone: "America/Tijuana",
                })}
              </td>
              <td className="px-4 py-4">{importe(r.horas)}</td>
              <td className="px-4 py-4 font-semibold tabular-nums">
                {importe(r.importe)}
              </td>
              <td className="px-4 py-4">
                <CotizacionStatus estado={r.estado} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
