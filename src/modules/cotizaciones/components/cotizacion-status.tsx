import { cotizacionStatuses } from "../constants/cotizacion-statuses";
export function CotizacionStatus({ estado }: { estado: string }) {
  return (
    <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium">
      {cotizacionStatuses[estado as keyof typeof cotizacionStatuses] ?? estado}
    </span>
  );
}
