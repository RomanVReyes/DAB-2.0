"use client";
import { useState, useActionState } from "react";
import type { Detalle } from "../types/cotizacion.types";
import { abiertos, destinos, etiqueta } from "../constants/cotizacion-statuses";
import { seguimientoAction } from "../actions/seguimiento.actions";
import { fieldClass } from "./partidas-editor";
import { useUnsavedChanges } from "./use-unsaved-changes";
import { Button } from "@/components/ui/button";
export function Seguimiento({
  cot,
  permitido,
}: {
  cot: Detalle;
  permitido: boolean;
}) {
  const [estado, setEstado] = useState(cot.estado),
    [resultado, action, pending] = useActionState(seguimientoAction, {});
  const [po, setPo] = useState(cot.numero_po),
    [motivo, setMotivo] = useState(cot.motivo);
  const [documentoModificado, setDocumentoModificado] = useState(false);
  const seguimientoModificado =
    estado !== cot.estado || po !== cot.numero_po || motivo !== cot.motivo;
  useUnsavedChanges((documentoModificado || seguimientoModificado) && !pending);
  const revision = (
    <>
      <input type="hidden" name="id" value={cot.id} />
      <input type="hidden" name="version" value={cot.version} />
    </>
  );
  return (
    <section
      id="seguimiento"
      className="space-y-4 rounded-xl border bg-background p-5"
    >
      <h2 className="font-semibold">Seguimiento</h2>
      {[
        "aprobada",
        "aprobada_po",
        "aprobada_sin_po",
        "facturada",
        "pagada",
      ].includes(cot.estado) && (
        <p className="rounded-lg bg-muted p-3 text-sm">
          {cot.cotizacion_documentos.some((d) =>
            ["aprobacion", "po"].includes(d.tipo),
          )
            ? "Project Monitor dispone de la evidencia para la incorporación."
            : "Project Monitor · Por documentar. Registra aquí la aprobación escrita o la PO para habilitar la incorporación."}
        </p>
      )}
      {resultado.error && <p role="alert">{resultado.error}</p>}
      {permitido ? (
        <form
          action={action}
          onSubmit={(e) => {
            if (
              documentoModificado &&
              !window.confirm(
                "¿Guardar el seguimiento y descartar el documento sin registrar?",
              )
            ) {
              e.preventDefault();
              return;
            }
            if (
              estado !== cot.estado &&
              !abiertos.includes(estado) &&
              !window.confirm(
                cot.bloqueado_en
                  ? "¿Confirmar el cambio a " +
                      etiqueta(estado) +
                      "? El presupuesto seguirá bloqueado."
                  : "¿Confirmar el cambio de estado? El cliente, proyecto, horas e importes quedarán bloqueados.",
              )
            )
              e.preventDefault();
          }}
        >
          {revision}
          <fieldset disabled={pending} className="grid gap-3 sm:grid-cols-2">
            <label>
              Estado
              <select
                name="estado"
                className={fieldClass}
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              >
                {destinos(cot.estado).map((s) => (
                  <option value={s} key={s}>
                    {etiqueta(s)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Número de PO
              <input
                className={fieldClass}
                name="numero_po"
                maxLength={120}
                value={po}
                onChange={(e) => setPo(e.target.value)}
              />
            </label>
            {["cancelada", "rechazada"].includes(estado) && (
              <label>
                Motivo
                <textarea
                  required
                  className={fieldClass}
                  name="motivo"
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  maxLength={2000}
                />
              </label>
            )}
            <Button className="self-end" type="submit">
              Guardar seguimiento
            </Button>
          </fieldset>
        </form>
      ) : (
        <p>
          {etiqueta(cot.estado)} · PO {cot.numero_po || "pendiente"}{" "}
          {cot.motivo}
        </p>
      )}
      <h3 className="border-t pt-4 font-semibold">Documentos</h3>
      <p className="text-sm">
        {cot.cotizacion_documentos.some((d) => d.tipo === "po")
          ? "PO registrada"
          : "Falta el documento de PO"}
      </p>
      <ul className="space-y-2 text-sm">
        {cot.cotizacion_documentos.map((d) => (
          <li key={d.id}>
            <a
              className="underline"
              href={"/cotizaciones/" + cot.id + "/documentos/" + d.id}
              target="_blank"
              rel="noreferrer"
            >
              Abrir {d.tipo}
            </a>{" "}
            · {d.usuario_nombre} ·{" "}
            {new Date(d.creado_en).toLocaleString("es-MX", {
              timeZone: "America/Tijuana",
            })}
          </li>
        ))}
      </ul>
      {permitido && (
        <form
          action={action}
          onChange={() => setDocumentoModificado(true)}
          onSubmit={(e) => {
            if (
              seguimientoModificado &&
              !window.confirm(
                "¿Registrar el documento y descartar los cambios de seguimiento sin guardar?",
              )
            )
              e.preventDefault();
          }}
        >
          {revision}
          <fieldset disabled={pending} className="grid gap-3 sm:grid-cols-2">
            <label>
              Documento
              <select className={fieldClass} name="tipo">
                <option value="po">PO</option>
                <option value="aprobacion">Aprobación escrita</option>
                <option value="factura">Factura</option>
                <option value="pago">Evidencia de pago</option>
              </select>
            </label>
            <label>
              PDF (hasta 5 MB)
              <input
                className={fieldClass}
                name="archivo"
                type="file"
                accept="application/pdf"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.setCustomValidity(
                    file &&
                      (file.size > 5242880 || file.type !== "application/pdf")
                      ? "Selecciona un PDF de hasta 5 MB."
                      : "",
                  );
                }}
              />
            </label>
            <label>
              O enlace al archivo en Drive
              <input className={fieldClass} type="url" name="enlace" />
            </label>
            <Button type="submit" className="self-end" variant="outline">
              Registrar documento
            </Button>
          </fieldset>
        </form>
      )}
    </section>
  );
}
