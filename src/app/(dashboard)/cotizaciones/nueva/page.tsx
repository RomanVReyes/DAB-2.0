import { Suspense } from "react";
import { exigirPermiso } from "@/server/auth/permissions";
import { getCatalogos } from "@/modules/cotizaciones/server/cotizaciones.repository";
import { CotizacionForm } from "@/modules/cotizaciones/components/cotizacion-form";
async function Contenido() {
  await exigirPermiso("cotizaciones.ver");
  await exigirPermiso("cotizaciones.crear");
  const catalogos = await getCatalogos();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nueva cotización</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Prepara un presupuesto y guárdalo como borrador.
        </p>
      </div>
      <CotizacionForm
        catalogos={catalogos}
        today={new Date().toISOString().slice(0, 10)}
      />
    </div>
  );
}
export default function NuevaPage() {
  return (
    <Suspense fallback={<p role="status">Cargando catálogos…</p>}>
      <Contenido />
    </Suspense>
  );
}
