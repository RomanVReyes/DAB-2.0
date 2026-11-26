"use client";
import { useActionState, useState } from "react";
import { useUnsavedChanges } from "./use-unsaved-changes";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Catalogos, Detalle } from "../types/cotizacion.types";
import { guardarCotizacionAction } from "../actions/cotizaciones.actions";
import {
  PartidasEditor,
  fieldClass,
  factor,
  type EditablePartida,
} from "./partidas-editor";
import { CotizacionSummary } from "./cotizacion-summary";
import { subtotal, sumar } from "../lib/importes";

export function CotizacionForm({
  catalogos,
  initial,
  copia,
  today,
  readOnly = false,
}: {
  catalogos: Catalogos;
  initial?: Detalle;
  copia?: Detalle;
  today: string;
  readOnly?: boolean;
}) {
  const [state, action, pending] = useActionState(guardarCotizacionAction, {});
  const base = initial ?? copia;
  const [empresa, setEmpresa] = useState(base?.empresa_id ?? "");
  const [solicitante, setSolicitante] = useState(base?.solicitante_id ?? "");
  const [tipo, setTipo] = useState(
    base?.tipo_id ?? catalogos.tipos.find((c) => c.activo)?.id ?? "",
  );
  const [sede, setSede] = useState(
    base?.sede_id ?? catalogos.sedes.find((c) => c.activo)?.id ?? "",
  );
  const [proyecto, setProyecto] = useState(base?.proyecto ?? "");
  const [especificaciones, setEspecificaciones] = useState(
    base?.especificaciones ?? "",
  );
  const [partidas, setPartidas] = useState<EditablePartida[]>(
    base?.partidas.map((p) => ({
      key: p.id,
      id: copia ? undefined : p.id,
      concepto_id: p.concepto_id,
      tarifa_id: p.tarifa_id ?? "",
      modo: p.modo,
      nombre: p.concepto_nombre,
      unidad: p.unidad,
      cantidad: String(p.cantidad),
      horas: String(p.horas),
      precio: String(p.precio_unitario),
    })) ?? [],
  );
  const grupos = new Map<string, string[]>();
  for (const p of partidas) {
    if (!p.concepto_id) continue;
    const area =
      catalogos.conceptos.find((c) => c.id === p.concepto_id)?.areas.nombre ??
      "Otros conceptos";
    const subtotales = grupos.get(area) ?? [];
    subtotales.push(subtotal(factor(p), p.precio));
    grupos.set(area, subtotales);
  }
  const data = {
    id: initial?.id,
    version: initial?.version,
    empresa_id: empresa,
    solicitante_id: solicitante,
    tipo_id: tipo,
    sede_id: sede,
    proyecto,
    especificaciones,
    partidas: partidas.map((p) => ({
      id: p.id,
      concepto_id: p.concepto_id,
      tarifa_id: p.tarifa_id || undefined,
      modo: p.modo,
      precio: p.precio,
      cantidad: factor(p),
      horas: p.horas,
    })),
  };
  const [original] = useState(JSON.stringify(data));
  const dirty = original !== JSON.stringify(data);
  useUnsavedChanges(dirty && !pending);
  return (
    <form action={action} className="space-y-6">
      {!readOnly &&
        (!catalogos.empresas.some((c) => c.activo) ||
          !catalogos.conceptos.some((c) => c.activo) ||
          !catalogos.tipos.some((c) => c.activo) ||
          !catalogos.sedes.some((c) => c.activo)) && (
          <p
            role="status"
            className="rounded-xl border bg-background p-4 text-sm"
          >
            Aún no hay catálogos suficientes para cotizar. Solicita a
            Administración que configure empresas, solicitantes, conceptos,
            tipos y sedes.
          </p>
        )}
      {!readOnly && (
        <div className="flex flex-wrap justify-end items-center gap-4">
          <Button
            type="submit"
            className="min-h-11 bg-[#b6331b] px-5 text-white hover:bg-[#962914]"
            disabled={pending || partidas.length === 0}
          >
            {pending
              ? "Guardando…"
              : initial && initial.estado !== "borrador"
                ? "Guardar cambios"
                : "Guardar borrador"}
          </Button>
          <Link
            className="rounded-lg border px-4 py-2 text-sm"
            href={initial ? `/cotizaciones/${initial.id}` : "/cotizaciones"}
          >
            Cancelar
          </Link>
        </div>
      )}
      <input type="hidden" name="datos" value={JSON.stringify(data)} />
      {state.error && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm"
        >
          <p className="font-semibold">{state.error}</p>
          {state.fields && (
            <ul className="mt-2 list-disc pl-5">
              {Object.entries(state.fields).map(([key, messages]) => (
                <li key={key}>
                  {key.startsWith("partidas.")
                    ? `Partida ${Number(key.split(".")[1]) + 1}: `
                    : ""}
                  {messages.join(" ")}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <fieldset
        disabled={pending || readOnly}
        className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(13rem,24%)]"
      >
        <div className="min-w-0 space-y-5">
          <Card>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <h2 className="font-semibold sm:col-span-2">Datos generales</h2>
              <label className="text-sm">
                Empresa
                <select
                  className={fieldClass}
                  required
                  disabled={!!initial}
                  value={empresa}
                  onChange={(e) => {
                    setEmpresa(e.target.value);
                    setSolicitante("");
                  }}
                >
                  <option value="">Selecciona una empresa</option>
                  {catalogos.empresas
                    .filter((c) => c.activo || c.id === empresa)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-sm">
                Solicitante
                <select
                  className={fieldClass}
                  required
                  value={solicitante}
                  onChange={(e) => setSolicitante(e.target.value)}
                >
                  <option value="">Selecciona un solicitante</option>
                  {catalogos.solicitantes
                    .filter(
                      (c) =>
                        c.empresa_id === empresa &&
                        (c.activo || c.id === solicitante),
                    )
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-sm">
                Tipo
                <select
                  className={fieldClass}
                  disabled={!!initial}
                  required
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                >
                  {catalogos.tipos
                    .filter((c) => c.activo || c.id === tipo)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-sm">
                Sede
                <select
                  className={fieldClass}
                  disabled={!!initial}
                  required
                  value={sede}
                  onChange={(e) => setSede(e.target.value)}
                >
                  {catalogos.sedes
                    .filter((c) => c.activo || c.id === sede)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-sm sm:col-span-2">
                Nombre del proyecto
                <input
                  className={fieldClass}
                  maxLength={200}
                  required
                  value={proyecto}
                  onChange={(e) => setProyecto(e.target.value)}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                Especificaciones
                <textarea
                  className={fieldClass}
                  rows={4}
                  maxLength={5000}
                  value={especificaciones}
                  onChange={(e) => setEspecificaciones(e.target.value)}
                />
              </label>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                {readOnly
                  ? initial?.bloqueado_en
                    ? "Presupuesto bloqueado."
                    : "Vista de consulta."
                  : initial
                    ? "Empresa, tipo, sede y código se conservan. Para cambiar un concepto, elimina su partida y agrega otra."
                    : "El folio y el código se asignan al guardar. Los prefijos de desarrollo son provisionales."}
              </p>
            </CardContent>
          </Card>
          <PartidasEditor
            partidas={partidas}
            onChange={setPartidas}
            catalogos={catalogos}
            readOnly={readOnly}
            today={today}
          />
        </div>
        <aside className="lg:sticky lg:top-20">
          <CotizacionSummary
            areas={Array.from(grupos, ([nombre, valores]) => ({
              nombre,
              importe: sumar(valores),
            }))}
            total={sumar(partidas.map((p) => subtotal(factor(p), p.precio)))}
            horas={sumar(partidas.map((p) => p.horas))}
          />
        </aside>
      </fieldset>
    </form>
  );
}
