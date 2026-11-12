import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Catalogos, Cotizacion, Detalle } from "../types/cotizacion.types";
import type { CotizacionInput } from "../schemas/cotizacion.schema";

export class CotizacionError extends Error {}
export async function getCatalogos(): Promise<Catalogos> {
  const db = await createClient();
  const results = await Promise.all([
    db.from("empresas").select("*").order("nombre"),
    db.from("solicitantes").select("*").order("nombre"),
    db.from("conceptos").select("*").order("nombre"),
    db.from("tarifas").select("*").order("vigente_desde", { ascending: false }),
    db.from("tipos_cotizacion").select("*").order("nombre"),
    db.from("sedes").select("*").order("nombre"),
  ]);
  if (results.some((r) => r.error))
    throw new CotizacionError("No fue posible cargar los catálogos.");
  const [empresas, solicitantes, conceptos, tarifas, tipos, sedes] =
    results.map((r) => r.data ?? []);
  return {
    empresas,
    solicitantes,
    conceptos,
    tarifas,
    tipos,
    sedes,
  } as Catalogos;
}
export type ListFilters = {
  q: string;
  empresa: string;
  estado: string;
  page: number;
  order: "asc" | "desc";
};
export async function listCotizaciones(filters: ListFilters) {
  const db = await createClient();
  let query = db
    .from("cotizaciones")
    .select(
      "id,folio,codigo,empresa_id,proyecto,estado,importe,horas,creado_en,empresas(nombre),solicitantes(nombre)",
      { count: "exact" },
    );
  if (filters.q) {
    const safe = filters.q.replace(/[^\p{L}\p{N}\s-]/gu, "").slice(0, 100);
    if (safe)
      query = query.or(`codigo.ilike.%${safe}%,proyecto.ilike.%${safe}%`);
  }
  if (filters.empresa) query = query.eq("empresa_id", filters.empresa);
  if (filters.estado) query = query.eq("estado", filters.estado);
  const { data, count, error } = await query
    .order("creado_en", { ascending: filters.order === "asc" })
    .order("id")
    .range((filters.page - 1) * 20, filters.page * 20 - 1);
  if (error)
    throw new CotizacionError("No fue posible consultar las cotizaciones.");
  return { rows: data as unknown as Cotizacion[], count: count ?? 0 };
}
export async function findCotizacion(id: string): Promise<Detalle | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("cotizaciones")
    .select(
      "*,empresas(nombre),solicitantes(nombre),partidas(*),cotizacion_historial(*)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new CotizacionError("No fue posible abrir la cotización.");
  if (!data) return null;
  const detail = data as Detalle;
  detail.partidas.sort((a, b) => a.orden - b.orden);
  detail.cotizacion_historial.sort((a, b) => b.version - a.version);
  return detail;
}
export async function saveCotizacion(input: CotizacionInput): Promise<string> {
  const db = await createClient();
  const { id, version, ...datos } = input;
  const { data, error } = await db.rpc("guardar_cotizacion", {
    p_datos: datos,
    p_id: id ?? null,
    p_version: version ?? null,
  });
  if (error) {
    if (error.code === "40001")
      throw new CotizacionError(
        "Otra persona modificó este borrador. Abre de nuevo la edición antes de guardar.",
      );
    if (error.code === "22023")
      throw new CotizacionError(
        "Revisa cliente, solicitante y partidas. Una tarifa pudo cambiar; actualiza el formulario.",
      );
    if (error.code === "42501")
      throw new CotizacionError(
        "No tienes permiso para guardar este borrador.",
      );
    throw new CotizacionError(
      "No se pudo guardar. Tus cambios siguen en el formulario; inténtalo nuevamente.",
    );
  }
  return data as string;
}
