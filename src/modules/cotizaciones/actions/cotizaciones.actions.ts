"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirPermiso } from "@/server/auth/permissions";
import { cotizacionSchema } from "../schemas/cotizacion.schema";
import { guardarBorrador } from "../server/cotizaciones.service";
import { CotizacionError } from "../server/cotizaciones.repository";
import type { ActionState } from "../types/cotizacion.types";

export async function guardarCotizacionAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  await exigirPermiso("cotizaciones.ver");
  let raw: unknown;
  try {
    raw = JSON.parse(String(form.get("datos")));
  } catch {
    return { error: "El formulario no es válido." };
  }
  const parsed = cotizacionSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string[]> = {};
    for (const issue of parsed.error.issues)
      (fields[issue.path.join(".")] ??= []).push(issue.message);
    return { error: "Revisa los campos indicados.", fields };
  }
  await exigirPermiso(
    parsed.data.id ? "cotizaciones.editar" : "cotizaciones.crear",
  );
  let id: string;
  try {
    id = await guardarBorrador(parsed.data);
  } catch (error) {
    if (error instanceof CotizacionError) return { error: error.message };
    throw error;
  }
  revalidatePath("/cotizaciones");
  revalidatePath(`/cotizaciones/${id}`);
  redirect(`/cotizaciones?guardada=${id}`);
}
