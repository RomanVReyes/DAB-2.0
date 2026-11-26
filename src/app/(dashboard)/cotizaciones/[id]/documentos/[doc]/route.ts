import { createClient } from "@/lib/supabase/server";
import { exigirPermiso } from "@/server/auth/permissions";
import { z } from "zod";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string; doc: string }> },
) {
  await exigirPermiso("cotizaciones.ver");
  const { id, doc } = await params;
  const missing = () => new Response(null, { status: 404 });
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(doc).success)
    return missing();
  const db = await createClient();
  const { data } = await db
    .from("cotizacion_documentos")
    .select("enlace,objeto")
    .eq("id", doc)
    .eq("cotizacion_id", id)
    .maybeSingle();
  if (!data) return missing();
  if (data.enlace) return Response.redirect(data.enlace, 302);
  const file = await db.storage.from("cotizaciones-po").download(data.objeto);
  if (
    !file.data ||
    file.data.size > 5242880 ||
    (await file.data.slice(0, 5).text()) !== "%PDF-"
  )
    return missing();
  return new Response(file.data, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=documento.pdf",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
