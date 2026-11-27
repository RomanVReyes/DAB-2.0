"use server";
import { exigirPermiso } from "@/server/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
export async function incorporar(form: FormData) {
  await exigirPermiso("proyectos.crear");
  const db = await createClient();
  const { data, error } = await db.rpc("pm_incorporar", {
    origen: form.get("id"),
    tipo_proyecto: form.get("tipo"),
  });
  if (error) throw Error("No se pudo incorporar el proyecto.");
  revalidatePath("/proyectos");
  redirect("/proyectos/" + data);
}
export async function clasificar(form: FormData) {
  await exigirPermiso("proyectos.presupuesto_editar");
  const db = await createClient();
  const { error } = await db.rpc("pm_clasificar", {
    partida: form.get("partida"),
    departamento: form.get("departamento"),
    rubro_operativo: form.get("rubro"),
  });
  if (error) throw Error("No se pudo guardar la clasificación.");
  revalidatePath("/proyectos", "layout");
}
export async function actualizar(form: FormData) {
  await exigirPermiso("proyectos.editar");
  const db = await createClient();
  const { error } = await db.rpc("pm_actualizar", {
    proyecto: form.get("id"),
    nuevo_estado: form.get("estado"),
    nuevo_tipo: form.get("tipo"),
  });
  if (error) throw Error("No se pudo actualizar el proyecto.");
  revalidatePath("/proyectos", "layout");
}
