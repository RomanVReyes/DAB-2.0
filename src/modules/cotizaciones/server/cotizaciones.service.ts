import "server-only";
import { exigirPermiso } from "@/server/auth/permissions";
import {
  cotizacionSchema,
  type CotizacionInput,
} from "../schemas/cotizacion.schema";
import { saveCotizacion } from "./cotizaciones.repository";

export async function guardarBorrador(input: CotizacionInput) {
  await exigirPermiso("cotizaciones.ver");
  await exigirPermiso(input.id ? "cotizaciones.editar" : "cotizaciones.crear");
  return saveCotizacion(cotizacionSchema.parse(input));
}
