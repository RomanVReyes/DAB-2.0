import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { exigirPermiso, hasPermission } from "@/server/auth/permissions";
import { findCotizacion } from "@/modules/cotizaciones/server/cotizaciones.repository";
import { CotizacionSummary } from "@/modules/cotizaciones/components/cotizacion-summary";
import { CotizacionStatus } from "@/modules/cotizaciones/components/cotizacion-status";
import { importe } from "@/modules/cotizaciones/lib/importes";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
type Props = { params: Promise<{ id: string }> };
async function Contenido({ params }: Props) {
  await exigirPermiso("cotizaciones.ver");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const cot = await findCotizacion(id);
  if (!cot) notFound();
  const editable =
    cot.estado === "borrador" && (await hasPermission("cotizaciones.editar"));
  return (
    <div className="space-y-6">
      <Link className="text-sm underline" href="/cotizaciones">
        ← Cotizaciones
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Folio {cot.folio} · {cot.codigo}
          </p>
          <h1 className="mt-1 text-2xl font-semibold break-words">
            {cot.proyecto}
          </h1>
          <div className="mt-3">
            <CotizacionStatus estado={cot.estado} />
          </div>
        </div>
        {editable && (
          <Link
            className={buttonVariants({ className: "min-h-11" })}
            href={`/cotizaciones/${id}/editar`}
          >
            Editar borrador
          </Link>
        )}
      </div>
      <Card>
        <CardContent>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Cliente</dt>
              <dd>{cot.empresas.nombre}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Solicitante</dt>
              <dd>{cot.solicitantes.nombre}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Creado por</dt>
              <dd>{cot.creador_nombre}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Creación</dt>
              <dd>
                {new Date(cot.creado_en).toLocaleString("es-MX", {
                  timeZone: "America/Tijuana",
                })}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Especificaciones</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words">
                {cot.especificaciones || "Sin especificaciones adicionales."}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
      <div className="overflow-x-auto rounded-xl border bg-background">
        <table className="w-full min-w-[650px] text-left text-sm">
          <caption className="p-4 text-left font-semibold">
            Partidas del presupuesto
          </caption>
          <thead className="border-y text-xs text-muted-foreground">
            <tr>
              {[
                "Concepto",
                "Cantidad",
                "Unidad",
                "Horas",
                "Precio unitario",
                "Subtotal",
              ].map((t) => (
                <th className="p-3" key={t} scope="col">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cot.partidas.map((p) => (
              <tr className="border-b last:border-0" key={p.id}>
                <td className="p-3">{p.concepto_nombre}</td>
                <td className="p-3">{importe(p.cantidad)}</td>
                <td className="p-3">{p.unidad}</td>
                <td className="p-3">{importe(p.horas)}</td>
                <td className="p-3">{importe(p.precio_unitario)}</td>
                <td className="p-3 font-semibold">{importe(p.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CotizacionSummary total={cot.importe} horas={cot.horas} />
      <Card>
        <CardContent>
          <h2 className="font-semibold">Historial de cambios</h2>
          <ol className="mt-4 space-y-3 text-sm">
            {cot.cotizacion_historial.map((h) => (
              <li key={h.id} className="border-l-2 pl-3">
                <p>
                  Versión {h.version} ·{" "}
                  {h.accion === "creada" ? "Creada" : "Editada"} por{" "}
                  {h.usuario_nombre}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(h.creado_en).toLocaleString("es-MX", {
                    timeZone: "America/Tijuana",
                  })}{" "}
                  · Importe {importe(h.importe)}
                </p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
export default function DetallePage(props: Props) {
  return (
    <Suspense fallback={<p role="status">Cargando cotización…</p>}>
      <Contenido {...props} />
    </Suspense>
  );
}
