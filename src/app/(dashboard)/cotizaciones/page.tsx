import { Suspense } from "react";
import Link from "next/link";
import { z } from "zod";
import { buttonVariants } from "@/components/ui/button";
import {
  exigirPermiso,
  obtenerPermisosUsuario,
} from "@/server/auth/permissions";
import {
  getCatalogos,
  listCotizaciones,
  type ListFilters,
} from "@/modules/cotizaciones/server/cotizaciones.repository";
import { CotizacionesFilters } from "@/modules/cotizaciones/components/cotizaciones-filters";
import { CotizacionesTable } from "@/modules/cotizaciones/components/cotizaciones-table";
type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
async function Contenido({ searchParams }: Props) {
  await exigirPermiso("cotizaciones.ver");
  const params = await searchParams;
  const one = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : "";
  const filters: ListFilters = {
    q: one("q").slice(0, 100),
    empresa: z.uuid().safeParse(one("empresa")).success ? one("empresa") : "",
    estado: one("estado") === "borrador" ? "borrador" : "",
    page: Math.min(100000, Math.max(1, Number.parseInt(one("page"), 10) || 1)),
    order: one("order") === "asc" ? "asc" : "desc",
  };
  const [catalogos, result, permissions] = await Promise.all([
    getCatalogos(),
    listCotizaciones(filters),
    obtenerPermisosUsuario(),
  ]);
  const pageLink = (page: number) =>
    `/cotizaciones?${new URLSearchParams({ q: filters.q, empresa: filters.empresa, estado: filters.estado, order: filters.order, page: String(page) })}`;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Cotizaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tus presupuestos en un solo lugar. El folio y el código se generan
            al guardar.
          </p>
        </div>
        {permissions.includes("cotizaciones.crear") && (
          <Link
            href="/cotizaciones/nueva"
            className={buttonVariants({ className: "min-h-11 px-4" })}
          >
            Nueva cotización
          </Link>
        )}
      </div>
      {z.uuid().safeParse(one("guardada")).success && (
        <p
          role="status"
          className="rounded-lg border bg-background p-4 text-sm"
        >
          Borrador guardado correctamente.{" "}
          <Link className="underline" href={`/cotizaciones/${one("guardada")}`}>
            Ver detalle
          </Link>
        </p>
      )}
      <CotizacionesFilters empresas={catalogos.empresas} filters={filters} />
      <p className="text-sm text-muted-foreground">
        {result.count} cotizaciones encontradas · Importes preliminares sin
        impuestos
      </p>
      <CotizacionesTable rows={result.rows} />
      <nav
        aria-label="Paginación"
        className="flex items-center justify-between text-sm"
      >
        {filters.page > 1 ? (
          <Link href={pageLink(filters.page - 1)} className="underline">
            Anterior
          </Link>
        ) : (
          <span />
        )}
        <span>
          Página {filters.page} de {Math.max(1, Math.ceil(result.count / 20))}
        </span>
        {filters.page * 20 < result.count ? (
          <Link href={pageLink(filters.page + 1)} className="underline">
            Siguiente
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
export default function CotizacionesPage(props: Props) {
  return (
    <Suspense fallback={<p role="status">Cargando cotizaciones…</p>}>
      <Contenido {...props} />
    </Suspense>
  );
}
