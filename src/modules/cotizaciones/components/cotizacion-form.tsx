"use client";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Catalogos, Detalle } from "../types/cotizacion.types";
import { guardarCotizacionAction } from "../actions/cotizaciones.actions";
import {
  PartidasEditor,
  fieldClass,
  type EditablePartida,
} from "./partidas-editor";
import { CotizacionSummary } from "./cotizacion-summary";
import { subtotal, sumar } from "../lib/importes";

export function CotizacionForm({
  catalogos,
  initial,
  today,
}: {
  catalogos: Catalogos;
  initial?: Detalle;
  today: string;
}) {
  const [state, action, pending] = useActionState(guardarCotizacionAction, {});
  const [empresa, setEmpresa] = useState(initial?.empresa_id ?? "");
  const [solicitante, setSolicitante] = useState(initial?.solicitante_id ?? "");
  const [tipo, setTipo] = useState(
    initial?.tipo_id ?? catalogos.tipos.find((c) => c.activo)?.id ?? "",
  );
  const [sede, setSede] = useState(
    initial?.sede_id ?? catalogos.sedes.find((c) => c.activo)?.id ?? "",
  );
  const [proyecto, setProyecto] = useState(initial?.proyecto ?? "");
  const [especificaciones, setEspecificaciones] = useState(
    initial?.especificaciones ?? "",
  );
  const [partidas, setPartidas] = useState<EditablePartida[]>(
    initial?.partidas.map((p) => ({
      key: p.id,
      id: p.id,
      concepto_id: p.concepto_id,
      tarifa_id: p.tarifa_id,
      nombre: p.concepto_nombre,
      unidad: p.unidad,
      cantidad: String(p.cantidad),
      horas: String(p.horas),
      precio: String(p.precio_unitario),
    })) ?? [],
  );
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
      tarifa_id: p.tarifa_id,
      cantidad: p.cantidad,
      horas: p.horas,
    })),
  };
  return (
    <form action={action} className="space-y-6">
      {(!catalogos.empresas.some((c) => c.activo) ||
        !catalogos.conceptos.some((c) => c.activo) ||
        !catalogos.tipos.some((c) => c.activo) ||
        !catalogos.sedes.some((c) => c.activo)) && (
        <p
          role="status"
          className="rounded-xl border bg-background p-4 text-sm"
        >
          Aún no hay catálogos suficientes para cotizar. Solicita a
          Administración que configure empresas, solicitantes, conceptos,
          tarifas, tipos y sedes.
        </p>
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
      <fieldset disabled={pending} className="space-y-6">
        <Card>
          <CardContent className="grid gap-4 sm:grid-cols-2">
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
                  .filter((c) => c.empresa_id === empresa && c.activo)
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
              {initial
                ? "Empresa, tipo, sede y código se conservan. Para cambiar un concepto, elimina su partida y agrega otra."
                : "El folio y el código se asignan al guardar. Los prefijos de desarrollo son provisionales."}
            </p>
          </CardContent>
        </Card>
        <PartidasEditor
          partidas={partidas}
          onChange={setPartidas}
          catalogos={catalogos}
          today={today}
        />
        <CotizacionSummary
          total={sumar(partidas.map((p) => subtotal(p.cantidad, p.precio)))}
          horas={sumar(partidas.map((p) => p.horas))}
        />
        <div className="flex flex-wrap items-center gap-4">
          <Button
            type="submit"
            className="min-h-11 px-5"
            disabled={pending || partidas.length === 0}
          >
            {pending ? "Guardando…" : "Guardar borrador"}
          </Button>
          <Link
            className="text-sm underline"
            href={initial ? `/cotizaciones/${initial.id}` : "/cotizaciones"}
          >
            Cancelar
          </Link>
        </div>
      </fieldset>
    </form>
  );
}
