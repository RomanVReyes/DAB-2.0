"use client";
import { Button } from "@/components/ui/button";
import type { Catalogos } from "../types/cotizacion.types";
import { importe, subtotal } from "../lib/importes";

export type EditablePartida = {
  modo: import("../types/cotizacion.types").Modo;
  area?: string;
  key: string;
  id?: string;
  concepto_id: string;
  tarifa_id: string;
  nombre: string;
  unidad: string;
  cantidad: string;
  horas: string;
  precio: string;
};
export const factor = (p: EditablePartida) =>
  p.modo === "unidad" ? p.cantidad : p.modo === "hora" ? p.horas : "1";
export const fieldClass =
  "mt-1 min-h-11 w-full rounded-lg border bg-background px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:bg-muted";
export function PartidasEditor({
  partidas,
  onChange,
  catalogos,
  today,
  readOnly = false,
}: {
  partidas: EditablePartida[];
  onChange: (p: EditablePartida[]) => void;
  catalogos: Catalogos;
  today: string;
  readOnly?: boolean;
}) {
  const available = catalogos.conceptos.filter((c) => c.activo);
  function update(index: number, change: Partial<EditablePartida>) {
    onChange(partidas.map((p, i) => (i === index ? { ...p, ...change } : p)));
  }
  return (
    <section className="space-y-4" aria-labelledby="partidas-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="partidas-title" className="text-lg font-semibold">
          Partidas
        </h2>
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={partidas.length >= 100}
            onClick={() =>
              onChange([
                ...partidas,
                {
                  key: crypto.randomUUID(),
                  modo: "directo",
                  concepto_id: "",
                  tarifa_id: "",
                  nombre: "",
                  unidad: "",
                  cantidad: "1",
                  horas: "0",
                  precio: "0",
                },
              ])
            }
          >
            Agregar partida
          </Button>
        )}
      </div>
      {partidas.length === 0 && (
        <p className="rounded-xl border border-dashed p-6 text-sm">
          Agrega un concepto para comenzar tu presupuesto.
        </p>
      )}
      {partidas.map((p, index) => (
        <fieldset key={p.key} className="rounded-xl border bg-background p-4">
          <legend className="px-2 text-sm font-semibold">
            Partida {index + 1}
          </legend>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {!readOnly && !p.id && (
              <label className="text-sm">
                Área
                <select
                  className={fieldClass}
                  value={p.area ?? ""}
                  onChange={(e) =>
                    update(index, {
                      area: e.target.value,
                      concepto_id: "",
                      tarifa_id: "",
                      precio: "",
                      unidad: "",
                      nombre: "",
                    })
                  }
                >
                  <option value="">Todas las áreas</option>
                  {Array.from(
                    new Map(available.map((c) => [c.area_id, c.areas.nombre])),
                  ).map(([id, nombre]) => (
                    <option key={id} value={id}>
                      {nombre}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="text-sm lg:col-span-2">
              Concepto
              <select
                aria-label={`Concepto ${index + 1}`}
                required
                className={fieldClass}
                value={p.concepto_id}
                disabled={!!p.id}
                onChange={(e) => {
                  const c = available.find((c) => c.id === e.target.value);
                  const t = catalogos.tarifas.find(
                    (t) =>
                      t.concepto_id === c?.id &&
                      t.vigente_desde <= today &&
                      (!t.vigente_hasta || t.vigente_hasta >= today),
                  );
                  update(index, {
                    concepto_id: c?.id ?? "",
                    tarifa_id: t?.id ?? "",
                    nombre: c?.nombre ?? "",
                    unidad: c?.unidad ?? "",
                    precio: String(t?.precio ?? ""),
                    modo: /^horas?$/i.test(c?.unidad ?? "") ? "hora" : "unidad",
                  });
                }}
              >
                <option value="">Selecciona un concepto</option>
                {p.id ? (
                  <option value={p.concepto_id}>{p.nombre}</option>
                ) : (
                  available
                    .filter((c) => !p.area || c.area_id === p.area)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.areas.nombre} · {c.nombre}
                      </option>
                    ))
                )}
              </select>
            </label>
            <label className="text-sm">
              Cálculo
              <select
                className={fieldClass}
                value={p.modo}
                onChange={(e) =>
                  update(index, {
                    modo: e.target.value as EditablePartida["modo"],
                  })
                }
              >
                <option value="directo">Importe directo</option>
                <option value="hora">Por hora</option>
                <option value="unidad">Por unidad</option>
              </select>
            </label>
            <label className="text-sm">
              {p.modo === "directo"
                ? "Importe negociado"
                : p.modo === "hora"
                  ? "Precio por hora"
                  : "Precio por unidad"}
              <input
                className={fieldClass}
                type="number"
                min="0"
                max="1000000"
                step="0.01"
                required
                value={p.precio}
                onChange={(e) => update(index, { precio: e.target.value })}
              />
            </label>
            {p.modo === "unidad" && (
              <label className="text-sm">
                Cantidad {p.unidad && `(${p.unidad})`}
                <input
                  aria-label={`Cantidad ${index + 1}`}
                  className={fieldClass}
                  type="number"
                  min="0.01"
                  max="10000"
                  step="0.01"
                  required
                  value={p.cantidad}
                  onChange={(e) => update(index, { cantidad: e.target.value })}
                />
              </label>
            )}
            <label className="text-sm">
              Horas presupuestadas
              <input
                aria-label={`Horas presupuestadas ${index + 1}`}
                className={fieldClass}
                type="number"
                min={p.modo === "hora" ? "0.01" : "0"}
                max="10000"
                step="0.01"
                required
                value={p.horas}
                onChange={(e) => update(index, { horas: e.target.value })}
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span>
              {p.modo === "directo"
                ? "Importe directo"
                : (p.modo === "hora"
                    ? p.horas + " h"
                    : p.cantidad + " unidades") +
                  " × " +
                  importe(p.precio || 0)}
            </span>
            <span>
              Subtotal:{" "}
              <strong>{importe(subtotal(factor(p), p.precio))}</strong>
            </span>
            {!readOnly && (
              <Button
                type="button"
                variant="ghost"
                aria-label={`Eliminar partida ${index + 1}`}
                onClick={() => onChange(partidas.filter((_, i) => i !== index))}
              >
                Eliminar
              </Button>
            )}
          </div>
        </fieldset>
      ))}
      {!readOnly && (
        <p className="text-xs text-muted-foreground">
          Puedes editar la tarifa sugerida o capturar un importe directo.
        </p>
      )}
    </section>
  );
}
