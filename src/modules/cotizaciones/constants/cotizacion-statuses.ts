export const cotizacionStatuses = {
  borrador: "Borrador",
  pendiente: "Pendiente de Aprobación",
  pausa: "En pausa",
  aprobada: "Aprobada",
  aprobada_po: "Aprobada con PO",
  aprobada_sin_po: "Aprobada sin PO",
  rechazada: "No Aprobada",
  facturada: "Facturado",
  pagada: "PAGADA",
  patrocinio: "PATROCINIO",
  cancelada: "Cancelada",
} as const;
export const abiertos = ["borrador", "pendiente", "pausa"];
export const aprobados = ["aprobada", "aprobada_po", "aprobada_sin_po"];
export function destinos(estado: string) {
  if (abiertos.includes(estado))
    return [...abiertos, ...aprobados, "rechazada", "patrocinio", "cancelada"];
  if (estado === "patrocinio")
    return [estado, ...aprobados, "rechazada", "cancelada"];
  if (aprobados.includes(estado))
    return [...new Set([estado, "aprobada_po", "facturada"])];
  return estado === "facturada" ? [estado, "pagada"] : [estado];
}
export const etiqueta = (estado: string) =>
  cotizacionStatuses[estado as keyof typeof cotizacionStatuses] ?? estado;
