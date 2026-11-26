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
    db
      .from("conceptos")
      .select("*,areas!inner(nombre,activo)")
      .eq("areas.activo", true)
      .order("nombre"),
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
  mes: string;
  q: string;
  empresa: string;
  estado: string;
  page: number;
  order: "asc" | "desc";
};
export async function listCotizaciones(filters: ListFilters) {
  const db = await createClient();
  const { data, error } = await db.rpc("cotizaciones_periodo", {
    p_mes: filters.mes + "-01",
    p_buscar: filters.q,
    p_empresa: filters.empresa || null,
    p_estado: filters.estado,
    p_pagina: filters.page,
    p_asc: filters.order === "asc",
  });
  if (error) throw new CotizacionError("No fue posible consultar el periodo.");
  return data as {
    rows: Cotizacion[];
    count: number;
    cotizado: number;
    pendientes: number;
    aprobado: number;
    facturado: number;
    cobrado: number;
  };
}
export async function findCotizacion(id: string): Promise<Detalle | null> {
  const db = await createClient();
  const { data, error } = await db
    .from("cotizaciones")
    .select(
      "*,empresas(nombre),solicitantes(nombre),partidas(*),cotizacion_historial(*),cotizacion_documentos(*)",
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
