import {
  EsquemaProyectosPendiente,
  faltaEsquemaProyectos,
} from "@/modules/proyectos/esquema-pendiente";
import { consumo } from "@/modules/proyectos/consumo";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { exigirPermiso, hasPermission } from "@/server/auth/permissions";
import { clasificar, actualizar } from "@/modules/proyectos/actions";
import { Button } from "@/components/ui/button";
type Props = { params: Promise<{ id: string }> };
async function Detalle({ params }: Props) {
  await exigirPermiso("proyectos.ver");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const db = await createClient();
  const [result, depts, editar, comercial] = await Promise.all([
    db
      .from("proyectos")
      .select("*,proyecto_partidas(*),proyecto_auditoria(evento,creado_en)")
      .eq("id", id)
      .maybeSingle(),
    db.from("departamentos_operativos").select("id,nombre"),
    hasPermission("proyectos.presupuesto_editar"),
    hasPermission("cotizaciones.ver"),
  ]);
  if ([result.error, depts.error].some(faltaEsquemaProyectos))
    return <EsquemaProyectosPendiente />;
  if (result.error || depts.error) throw Error("Error al abrir proyecto");
  const p = result.data;
  if (!p) notFound();
  const partidas = p.proyecto_partidas as {
    id: string;
    orden: number;
    area: string;
    concepto: string;
    horas: number;
    departamento_id: string | null;
    rubro: string | null;
  }[];
  const total =
    partidas.reduce((s, r) => s + Math.round(Number(r.horas) * 100), 0) / 100;
  return (
    <article className="space-y-5">
      <Link href="/proyectos" className="text-sm underline">
        ← Volver a proyectos
      </Link>
      <header>
        <h1 className="text-2xl font-semibold">{p.nombre}</h1>
        <p>
          {p.cliente} · {p.tipo} · {p.estado}
        </p>
      </header>
      {(await hasPermission("proyectos.editar")) && (
        <form
          action={actualizar}
          className="flex flex-wrap items-end gap-3 rounded-xl border bg-background p-4"
        >
          <input type="hidden" name="id" value={id} />
          <label className="flex flex-col gap-1 text-xs">
            Estado{" "}
            <select
              className="min-h-11 rounded-lg border bg-background px-3 text-sm"
              name="estado"
              defaultValue={p.estado}
            >
              {["activo", "en pausa", "cerrado"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            Tipo{" "}
            <select
              className="min-h-11 rounded-lg border bg-background px-3 text-sm"
              name="tipo"
              defaultValue={p.tipo}
            >
              {["proyecto", "iguala", "interno", "patrocinio"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <Button type="submit">Guardar seguimiento</Button>
        </form>
      )}
      <section className="rounded-xl border bg-background p-5">
        <h2 className="font-semibold">Presupuesto aprobado</h2>
        <p>
          {comercial ? (
            <Link href={"/cotizaciones/" + id} className="underline">
              {p.codigo}
            </Link>
          ) : (
            p.codigo
          )}{" "}
          · Versión {p.version_aprobada}
        </p>
        <p>{total ? total + " h presupuestadas" : "Sin presupuesto"}</p>
        <p>
          {consumo(total, null).alerta}. El consumo y el saldo estarán
          disponibles al confirmar horas en Daily.
        </p>
      </section>
      <section>
        <h2 className="font-semibold">Departamentos y horas</h2>
        {partidas
          .sort((a, b) => a.orden - b.orden)
          .map((r) => (
            <div
              className="mt-2 rounded-xl border bg-background p-4"
              key={r.id}
            >
              <strong>
                {r.concepto} · {r.horas} h
              </strong>
              <p>Área comercial · {r.area}</p>
              <p>
                {depts.data?.find((d) => d.id === r.departamento_id)?.nombre ??
                  "Pendiente de clasificación"}{" "}
                {r.rubro}
              </p>
              {editar && (
                <form action={clasificar} className="mt-3 flex flex-wrap gap-3">
                  <input type="hidden" name="partida" value={r.id} />
                  <select
                    className="min-h-11 rounded-lg border bg-background px-3 text-sm"
                    required
                    aria-label="Departamento operativo"
                    name="departamento"
                    defaultValue={r.departamento_id ?? ""}
                  >
                    <option value="">Departamento</option>
                    {depts.data?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    maxLength={100}
                    name="rubro"
                    aria-label="Rubro operativo"
                    className="min-h-11 rounded-lg border bg-background px-3 text-sm"
                    placeholder="Rubro operativo"
                    defaultValue={r.rubro ?? ""}
                  />
                  <Button type="submit">Guardar clasificación</Button>
                </form>
              )}
            </div>
          ))}
      </section>
      <section className="rounded-xl border bg-background p-5">
        <h2 className="mb-3 font-semibold">Historial</h2>
        {(p.proyecto_auditoria as { evento: string; creado_en: string }[])
          .sort((a, b) => b.creado_en.localeCompare(a.creado_en))
          .map((e, i) => (
            <p key={i}>
              {new Date(e.creado_en).toLocaleString("es-MX", {
                timeZone: "America/Tijuana",
              })}{" "}
              · {e.evento}
            </p>
          ))}
      </section>
    </article>
  );
}
export default function Page(props: Props) {
  return (
    <Suspense fallback={<p>Cargando proyecto…</p>}>
      <Detalle {...props} />
    </Suspense>
  );
}
