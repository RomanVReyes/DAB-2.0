import { z } from "zod";

const decimal = z
  .string()
  .regex(/^\d{1,5}(\.\d{1,2})?$/, "Usa un número con máximo dos decimales.")
  .refine((v) => Number(v) <= 10000, "El máximo es 10,000.");
export const partidaSchema = z.object({
  id: z.uuid().optional(),
  concepto_id: z.uuid("Selecciona un concepto."),
  tarifa_id: z.uuid("Selecciona una tarifa vigente."),
  cantidad: decimal.refine(
    (v) => Number(v) > 0,
    "La cantidad debe ser mayor que cero.",
  ),
  horas: decimal,
});
export const cotizacionSchema = z
  .object({
    id: z.uuid().optional(),
    version: z.number().int().positive().optional(),
    empresa_id: z.uuid("Selecciona una empresa."),
    solicitante_id: z.uuid("Selecciona un solicitante."),
    tipo_id: z.uuid("Selecciona un tipo."),
    sede_id: z.uuid("Selecciona una sede."),
    proyecto: z
      .string()
      .trim()
      .min(1, "Escribe el nombre del proyecto.")
      .max(200),
    especificaciones: z.string().max(5000),
    partidas: z
      .array(partidaSchema)
      .min(1, "Agrega al menos una partida.")
      .max(100),
  })
  .refine((v) => !v.id || !!v.version, {
    message: "Falta la versión del borrador.",
    path: ["version"],
  });
export type CotizacionInput = z.infer<typeof cotizacionSchema>;
