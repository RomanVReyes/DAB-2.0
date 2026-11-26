import Link from "next/link";
import { Suspense } from "react";
import { exigirPermiso } from "@/server/auth/permissions";
import { z } from "zod";
import { notFound } from "next/navigation";
import {
  getCatalogos,
  findCotizacion,
} from "@/modules/cotizaciones/server/cotizaciones.repository";
import { CotizacionForm } from "@/modules/cotizaciones/components/cotizacion-form";
type Props = { searchParams: Promise<{ copiar?: string }> };
async function Contenido({ searchParams }: Props) {
  await exigirPermiso("cotizaciones.ver");
  await exigirPermiso("cotizaciones.crear");
  const { copiar } = await searchParams;
  if (copiar && !z.uuid().safeParse(copiar).success) notFound();
  const [catalogos, copia] = await Promise.all([
    getCatalogos(),
    copiar ? findCotizacion(copiar) : null,
  ]);
  if (copiar && !copia) notFound();
  return (
    <div className="space-y-6">
      <Link className="text-sm underline" href="/cotizaciones">
        ← Volver a cotizaciones
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Nueva cotización</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {copia
            ? "Copia de " +
              copia.codigo +
              " · Se asignará un nuevo folio al guardar."
            : "Prepara un presupuesto y guárdalo como borrador."}
        </p>
      </div>
      <CotizacionForm
        copia={copia ?? undefined}
        catalogos={catalogos}
        today={new Date().toISOString().slice(0, 10)}
      />
    </div>
  );
}
export default function NuevaPage(props: Props) {
  return (
    <Suspense fallback={<p role="status">Cargando catálogos…</p>}>
      <Contenido {...props} />
    </Suspense>
  );
}
