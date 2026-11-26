import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { exigirPermiso } from "@/server/auth/permissions";
import {
  getCatalogos,
  findCotizacion,
} from "@/modules/cotizaciones/server/cotizaciones.repository";
import { CotizacionForm } from "@/modules/cotizaciones/components/cotizacion-form";
type Props = { params: Promise<{ id: string }> };
async function Contenido({ params }: Props) {
  await exigirPermiso("cotizaciones.ver");
  await exigirPermiso("cotizaciones.editar");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [initial, catalogos] = await Promise.all([
    findCotizacion(id),
    getCatalogos(),
  ]);
  if (!initial) notFound();
  if (initial.bloqueado_en) redirect(`/cotizaciones/${id}`);
  return (
    <div className="space-y-6">
      <Link className="text-sm underline" href="/cotizaciones">
        ← Volver a cotizaciones
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">{initial.proyecto}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {initial.codigo} · Versión {initial.version}
        </p>
      </div>
      <nav className="flex gap-4 text-sm">
        <strong>General</strong>
        <Link href={`/cotizaciones/${id}?vista=historial`}>Historial</Link>
        <Link href={"/cotizaciones/" + id + "#seguimiento"}>Seguimiento</Link>
      </nav>
      <CotizacionForm
        initial={initial}
        catalogos={catalogos}
        today={new Date().toISOString().slice(0, 10)}
      />
    </div>
  );
}
export default function EditarPage(props: Props) {
  return (
    <Suspense fallback={<p role="status">Abriendo borrador…</p>}>
      <Contenido {...props} />
    </Suspense>
  );
}
