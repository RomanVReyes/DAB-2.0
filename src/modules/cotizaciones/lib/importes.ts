import Decimal from "decimal.js";

// Misma regla técnica que round(numeric, 2) en PostgreSQL para valores positivos.
export function subtotal(
  cantidad: string | number,
  precio: string | number,
): string {
  return new Decimal(cantidad || 0)
    .times(precio || 0)
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toFixed(2);
}
export function sumar(valores: (string | number)[]): string {
  return valores
    .reduce<Decimal>((s, v) => s.plus(v || 0), new Decimal(0))
    .toFixed(2);
}
export function importe(value: string | number): string {
  const [integer, fraction] = new Decimal(value).toFixed(2).split(".");
  return `${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}.${fraction}`;
}
