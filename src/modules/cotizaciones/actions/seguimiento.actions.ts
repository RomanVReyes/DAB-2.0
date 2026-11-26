"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { exigirPermiso } from "@/server/auth/permissions";
import type { ActionState } from "../types/cotizacion.types";

export async function seguimientoAction(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  await exigirPermiso("cotizaciones.ver");
  await exigirPermiso("cotizaciones.seguimiento");
  const id = String(form.get("id")),
    version = Number(form.get("version"));
  if (
    !z.uuid().safeParse(id).success ||
    !Number.isInteger(version) ||
    version < 1
  )
    return { error: "Identificador o versión inválidos." };
  const db = await createClient();
  const datos: Record<string, string> = {};
  const tipo = form.get("tipo");
  if (tipo) {
    if (!["po", "aprobacion", "factura", "pago"].includes(String(tipo)))
      return { error: "Tipo de documento inválido." };
    const file = form.get("archivo"),
      link = String(form.get("enlace") || "").trim();
    if (file instanceof File && file.size) {
      if (
        link ||
        file.type !== "application/pdf" ||
        file.size > 5242880 ||
        (await file.slice(0, 5).text()) !== "%PDF-"
      )
        return {
          error: "Selecciona un PDF de hasta 5 MB o un enlace de Drive.",
        };
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) return { error: "Inicia sesión para continuar." };
      const path = [
        id,
        user.id,
        version,
        tipo,
        crypto.randomUUID() + ".pdf",
      ].join("/");
      const { error } = await db.storage
        .from("cotizaciones-po")
        .upload(path, file, { contentType: "application/pdf" });
      if (error)
        return {
          error:
            "No se registró el PDF. Actualiza la cotización y vuelve a intentarlo.",
        };
      datos.tipo = String(tipo);
      datos.objeto = path;
    } else {
      if (
        !/^https:\/\/drive\.google\.com\/(file\/d\/[\w-]+(\/(view|preview|edit))?\/?(\?[\w=%&.+-]+)?|open\?id=[\w-]+(&[\w=%&.+-]+)?)$/.test(
          link,
        ) ||
        link.length > 2000
      )
        return {
          error: "Introduce el enlace HTTPS de un archivo de Google Drive.",
        };
      datos.tipo = String(tipo);
      datos.enlace = link;
    }
  } else {
    for (const key of ["estado", "numero_po", "motivo"])
      datos[key] = String(form.get(key) || "");
  }
  const { error } = await db.rpc("seguir_cotizacion", {
    p_id: id,
    p_version: version,
    p_datos: datos,
  });
  if (error && datos.objeto)
    await db.storage.from("cotizaciones-po").remove([datos.objeto]);
  if (error)
    return {
      error:
        error.code === "40001"
          ? "Otra persona guardó cambios. Actualiza antes de continuar."
          : error.code === "22023"
            ? error.message
            : "No se pudo guardar el seguimiento.",
    };
  revalidatePath("/cotizaciones");
  revalidatePath("/cotizaciones/" + id);
  return {};
}
