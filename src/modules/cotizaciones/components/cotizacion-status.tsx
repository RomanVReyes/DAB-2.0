import { cotizacionStatuses } from "../constants/cotizacion-statuses";
export function CotizacionStatus({ estado }: { estado: string }) {
  return (
    <span
      className={
        "inline-flex rounded-full px-3 py-1 text-xs font-medium " +
        (estado.startsWith("aprobada")
          ? "bg-blue-100 text-blue-900"
          : estado === "pagada" || estado === "facturada"
            ? "bg-green-100 text-green-900"
            : estado === "rechazada" || estado === "cancelada"
              ? "bg-red-100 text-red-900"
              : estado === "pendiente"
                ? "bg-amber-100 text-amber-900"
                : "bg-muted")
      }
    >
      {cotizacionStatuses[estado as keyof typeof cotizacionStatuses] ?? estado}
    </span>
  );
}
