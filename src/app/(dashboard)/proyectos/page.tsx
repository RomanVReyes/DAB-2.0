import {
  EsquemaProyectosPendiente,
  faltaEsquemaProyectos,
} from "@/modules/proyectos/esquema-pendiente";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { exigirPermiso, hasPermission } from "@/server/auth/permissions";
import { incorporar } from "@/modules/proyectos/actions";
import { Button } from "@/components/ui/button";
type Props = { searchParams: Promise<Record<string, string | undefined>> };
async function Lista({ searchParams }: Props) {
  await exigirPermiso("proyectos.ver");
  const db = await createClient(),
    f = await searchParams;
  const crear = await hasPermission("proyectos.crear");
  const page = Math.min(100000, Math.max(1, parseInt(f.page || "1") || 1));
  let query = db
    .from("proyectos")
    .select(
      "id,codigo,nombre,cliente,tipo,estado,aprobado_en,proyecto_partidas(horas)" +
        (f.depto ? ",proyecto_departamentos!inner(departamento_id)" : ""),
      { count: "exact" },
    );
  const term = (f.q || "").replace(/[^\p{L}\p{N}\s-]/gu, "").slice(0, 100);
  if (term)
    query = query.or(
      ["codigo", "cliente", "nombre"]
        .map((k) => k + ".ilike.%" + term + "%")
        .join(","),
    );
  if (f.estado) query = query.eq("estado", f.estado);
  if (f.tipo) query = query.eq("tipo", f.tipo);
  if (f.depto && /^[\da-f-]{36}$/i.test(f.depto))
    query = query.eq("proyecto_departamentos.departamento_id", f.depto);
  if (f.mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(f.mes)) {
    const next = new Date(f.mes + "-01T00:00:00Z");
    next.setUTCMonth(next.getUTCMonth() + 1);
    query = query
      .gte("aprobado_en", f.mes + "-01")
      .lt("aprobado_en", next.toISOString());
  }
  const [list, depts, pending, aprobadas] = await Promise.all([
    query
      .order(f.orden === "codigo" ? "codigo" : "aprobado_en", {
        ascending: f.orden === "codigo",
      })
      .order("id")
      .range((page - 1) * 20, page * 20 - 1),
    db.from("departamentos_operativos").select("id,nombre").order("nombre"),
    crear
      ? db.rpc("pm_pendientes")
      : Promise.resolve({ data: [], error: null }),
    crear && (await hasPermission("cotizaciones.ver"))
      ? db
          .from("cotizaciones")
          .select("id,codigo,proyecto,cotizacion_documentos!left(id)")
          .not("aprobado_en", "is", null)
          .in("cotizacion_documentos.tipo", ["aprobacion", "po"])
          .is("cotizacion_documentos", null)
          .order("aprobado_en", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if ([list.error, depts.error, pending.error].some(faltaEsquemaProyectos))
    return <EsquemaProyectosPendiente />;
  if (list.error || pending.error || depts.error || aprobadas.error)
    throw Error("No se pudo consultar Project Monitor.");
  const rows = list.data as unknown as {
    id: string;
    codigo: string;
    nombre: string;
    cliente: string;
    estado: string;
    tipo: string;
    proyecto_partidas: { horas: number }[];
  }[];
  const tipos = ["proyecto", "iguala", "patrocinio", "interno"];
  const link = (p: number) =>
    "?" +
    new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(f).filter(
          (x): x is [string, string] => typeof x[1] === "string",
        ),
      ),
      page: String(p),
    });
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Project Monitor</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta el presupuesto de horas y organiza las partidas por
            departamento.
          </p>
        </div>
        <Link
          className="rounded-lg border bg-background px-4 py-2 text-sm font-medium"
          href="/proyectos/ejemplos"
        >
          Ver proyectos de ejemplo
        </Link>
      </header>
      <dl className="grid gap-3 sm:grid-cols-3">
        {[
          ["Proyectos en la selección", list.count],
          ...(crear
            ? [
                ["Listos para incorporar", pending.data?.length],
                ["Por documentar", aprobadas.data?.length],
              ]
            : []),
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border bg-background p-4">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="text-xl font-bold">{value}</dd>
          </div>
        ))}
      </dl>
      <form className="flex flex-wrap items-end gap-3 rounded-xl border bg-background p-4">
        <label className="flex flex-col gap-1 text-xs">
          Mes de aprobación (UTC)
          <input
            className="min-h-11 rounded-lg border bg-background px-3 text-sm"
            type="month"
            name="mes"
            defaultValue={f.mes}
          />
        </label>
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs">
          Buscar proyecto
          <input
            className="min-h-11 rounded-lg border bg-background px-3 text-sm"
            name="q"
            defaultValue={f.q}
            placeholder="Código, cliente o proyecto"
          />
        </label>
        {Object.entries({
          tipo: tipos,
          estado: ["activo", "en pausa", "cerrado"],
          orden: ["reciente", "codigo"],
        }).map(([k, v]) => (
          <label key={k} className="flex flex-col gap-1 text-xs capitalize">
            {k}
            <select
              className="min-h-11 rounded-lg border bg-background px-3 text-sm"
              name={k}
              defaultValue={f[k]}
            >
              {k !== "orden" && <option value="">Todos</option>}
              {v.map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
        ))}
        <label className="flex flex-col gap-1 text-xs">
          Departamento
          <select
            className="min-h-11 rounded-lg border bg-background px-3 text-sm"
            name="depto"
            defaultValue={f.depto}
          >
            <option value="">Todos</option>
            {depts.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" className="min-h-11" variant="outline">
          Filtrar
        </Button>
      </form>
      {crear && !!aprobadas.data?.length && (
        <section className="rounded-xl border bg-background p-4">
          <h2 className="font-semibold">Aprobadas por documentar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Adjunta la aprobación escrita o la PO. Después podrás incorporar el
            proyecto con su presupuesto aprobado.
          </p>
          <ul className="mt-3 divide-y">
            {aprobadas.data.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap justify-between gap-3 py-3 text-sm"
              >
                <span>
                  <strong>{c.proyecto}</strong> · {c.codigo}
                </span>
                <Link
                  className="underline"
                  href={"/cotizaciones/" + c.id + "#seguimiento"}
                >
                  Registrar evidencia
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <h2 className="text-lg font-semibold">Proyectos operativos</h2>
      <ul className="divide-y rounded-xl border bg-background">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap justify-between gap-2 p-4">
            <div>
              <Link
                className="font-semibold underline"
                href={"/proyectos/" + r.id}
              >
                {r.codigo} · {r.nombre}
              </Link>
              <p className="text-xs text-muted-foreground">{r.cliente}</p>
            </div>
            <p>
              {r.tipo} ·{" "}
              <span className="rounded-full bg-muted px-2 py-1 text-xs">
                {r.estado}
              </span>{" "}
              ·{" "}
              {r.proyecto_partidas.reduce(
                (s, p) => s + Math.round(Number(p.horas) * 100),
                0,
              ) / 100}{" "}
              h
            </p>
          </li>
        ))}
      </ul>
      {!rows.length && (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <strong>No hay proyectos para esta selección</strong>
          <p className="mt-1 text-sm text-muted-foreground">
            Revisa los filtros o las cotizaciones pendientes de incorporación.
          </p>
        </div>
      )}
      <nav className="flex gap-4">
        {page > 1 && <Link href={link(page - 1)}>Anterior</Link>}Página {page}
        {page * 20 < (list.count ?? 0) && (
          <Link href={link(page + 1)}>Siguiente</Link>
        )}
      </nav>
      {crear && (
        <section className="space-y-3">
          <h2 className="font-semibold">Pendientes de incorporación</h2>
          {!pending.data?.length && (
            <p>No hay cotizaciones con aprobación y evidencia pendientes.</p>
          )}
          {pending.data?.map(
            (p: { id: string; codigo: string; nombre: string }) => (
              <form
                key={p.id}
                action={incorporar}
                className="flex flex-wrap items-center gap-3 rounded-xl border bg-background p-4"
              >
                <input type="hidden" name="id" value={p.id} />
                {p.codigo} · {p.nombre}
                <select aria-label="Tipo de proyecto" name="tipo">
                  {tipos.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <Button type="submit">Incorporar</Button>
              </form>
            ),
          )}
        </section>
      )}
    </div>
  );
}
export default function Page(props: Props) {
  return (
    <Suspense fallback={<p>Cargando proyectos…</p>}>
      <Lista {...props} />
    </Suspense>
  );
}
