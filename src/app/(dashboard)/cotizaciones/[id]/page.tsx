import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { exigirPermiso, hasPermission } from "@/server/auth/permissions";
import {
  findCotizacion,
  getCatalogos,
} from "@/modules/cotizaciones/server/cotizaciones.repository";
import { CotizacionForm } from "@/modules/cotizaciones/components/cotizacion-form";
import { HistorialCotizacion } from "@/modules/cotizaciones/components/historial";
import { Seguimiento } from "@/modules/cotizaciones/components/seguimiento";
import { CotizacionStatus } from "@/modules/cotizaciones/components/cotizacion-status";
import { buttonVariants } from "@/components/ui/button";
type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vista?: string }>;
};
async function Contenido({ params, searchParams }: Props) {
  await exigirPermiso("cotizaciones.ver");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const cot = await findCotizacion(id);
  if (!cot) notFound();
  const editable =
    !cot.bloqueado_en && (await hasPermission("cotizaciones.editar"));
  const historial = (await searchParams).vista === "historial";
  const [catalogos, permitido, crear] = await Promise.all([
    getCatalogos(),
    hasPermission("cotizaciones.seguimiento"),
    hasPermission("cotizaciones.crear"),
  ]);
  return (
    <div className="space-y-6">
      <Link className="text-sm underline" href="/cotizaciones">
        ← Volver a cotizaciones
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
            <CotizacionStatus estado={cot.estado} />{" "}
            {cot.es_patrocinio && cot.estado !== "patrocinio" && (
              <CotizacionStatus estado="patrocinio" />
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {crear && (
            <Link
              className={buttonVariants({
                variant: "outline",
                className: "min-h-11",
              })}
              href={"/cotizaciones/nueva?copiar=" + id}
            >
              Duplicar
            </Link>
          )}
          {editable && (
            <Link
              className={buttonVariants({ className: "min-h-11" })}
              href={`/cotizaciones/${id}/editar`}
            >
              {cot.estado === "borrador"
                ? "Editar borrador"
                : "Editar presupuesto"}
            </Link>
          )}
        </div>
      </div>
      <nav
        aria-label="Secciones de la cotización"
        className="flex gap-4 border-b pb-2 text-sm"
      >
        <Link
          className={!historial ? "font-bold underline" : ""}
          href={"/cotizaciones/" + id}
        >
          General
        </Link>
        <Link
          className={historial ? "font-bold underline" : ""}
          href={"/cotizaciones/" + id + "?vista=historial"}
        >
          Historial
        </Link>
      </nav>
      {historial ? (
        <HistorialCotizacion eventos={cot.cotizacion_historial} />
      ) : (
        <>
          <p className="text-sm">
            Creada por {cot.creador_nombre} ·{" "}
            {new Date(cot.creado_en).toLocaleDateString("es-MX", {
              timeZone: "America/Tijuana",
            })}
          </p>
          <CotizacionForm
            readOnly
            initial={cot}
            catalogos={catalogos}
            today={cot.creado_en.slice(0, 10)}
          />
          <Seguimiento key={cot.version} cot={cot} permitido={permitido} />
        </>
      )}
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
