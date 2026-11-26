import { Card, CardContent } from "@/components/ui/card";
import { importe } from "../lib/importes";
export function CotizacionSummary({
  total,
  areas,
  horas,
}: {
  areas: { nombre: string; importe: string }[];
  total: string | number;
  horas: string | number;
}) {
  return (
    <Card>
      <CardContent className="space-y-3" aria-live="polite">
        <h2 className="font-semibold">Resumen del presupuesto</h2>
        {areas.map((a) => (
          <p key={a.nombre} className="flex justify-between gap-3 text-sm">
            <span>{a.nombre}</span>
            <span>{importe(a.importe)}</span>
          </p>
        ))}
        <p className="flex justify-between gap-4">
          <span>Horas presupuestadas</span>
          <strong>{importe(horas)}</strong>
        </p>
        <p className="flex flex-wrap justify-between gap-4 border-t pt-3">
          <span>Importe preliminar</span>
          <strong className="text-xl">{importe(total)}</strong>
        </p>
        <p className="text-xs text-muted-foreground">
          Importes sin impuestos ni descuentos.
        </p>
      </CardContent>
    </Card>
  );
}
