import { cotizacionStatuses } from "../constants/cotizacion-statuses";
import { Button } from "@/components/ui/button";
import type { Empresa } from "../types/cotizacion.types";
import type { ListFilters } from "../server/cotizaciones.repository";
export function CotizacionesFilters({
  empresas,
  filters,
}: {
  empresas: Empresa[];
  filters: ListFilters;
}) {
  const cls = "min-h-11 rounded-lg border bg-background px-3 text-sm";
  return (
    <form className="flex flex-wrap items-end gap-3" action="/cotizaciones">
      <label className="flex flex-col gap-1 text-xs">
        Periodo
        <input
          className={cls}
          type="month"
          required
          name="mes"
          defaultValue={filters.mes}
        />
      </label>
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
        Buscar cotización
        <input
          className={cls}
          name="q"
          defaultValue={filters.q}
          maxLength={100}
          placeholder="Código, cliente, proyecto o solicitante"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Cliente
        <select
          className={cls + " max-w-64"}
          name="empresa"
          defaultValue={filters.empresa}
        >
          <option value="">Todos los clientes</option>
          {empresas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Estado
        <select className={cls} name="estado" defaultValue={filters.estado}>
          <option value="">Todos</option>
          {Object.entries(cotizacionStatuses).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs">
        Orden
        <select className={cls} name="order" defaultValue={filters.order}>
          <option value="desc">Más recientes</option>
          <option value="asc">Más antiguas</option>
        </select>
      </label>
      <Button type="submit" variant="outline" className="min-h-11">
        Filtrar
      </Button>
    </form>
  );
}
