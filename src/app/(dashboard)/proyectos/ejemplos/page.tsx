import Link from "next/link";
import { Suspense } from "react";
import { exigirPermiso } from "@/server/auth/permissions";

const proyectos = [
  {
    codigo: "DEMO-001",
    nombre: "Lanzamiento de temporada",
    cliente: "Taller Horizonte",
    tipo: "Proyecto",
    partidas: [
      ["Film", "Preproducción", 8],
      ["Film", "Producción N2", 12],
      ["Film", "Postproducción", 18],
    ],
  },
  {
    codigo: "DEMO-002",
    nombre: "Señalización de sucursal",
    cliente: "Mercado Albor",
    tipo: "Proyecto",
    partidas: [
      ["Design", "Diseño", 12],
      ["TINT", "Instalación", 16],
      ["TINT", "Traslados", 4],
    ],
  },
  {
    codigo: "DEMO-003",
    nombre: "Calendario editorial",
    cliente: "Editorial Nube",
    tipo: "Iguala",
    partidas: [
      ["Social Media", "Comunicólogo", 10],
      ["Social Media", "Diseñador", 14],
      ["Social Media", "Mercadólogo", 6],
    ],
  },
] as const;
async function Ejemplos() {
  await exigirPermiso("proyectos.ver");
  return (
    <main className="space-y-5">
      <Link href="/proyectos" className="text-sm underline">
        ← Volver a Project Monitor
      </Link>
      <header>
        <h1 className="text-2xl font-semibold">Proyectos de ejemplo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Presupuestos ficticios para explorar el desglose por departamento. Los
          indicadores operativos usan únicamente proyectos incorporados.
        </p>
      </header>
      {proyectos.map((p) => (
        <details key={p.codigo} className="rounded-xl border bg-background p-5">
          <summary className="cursor-pointer">
            <strong>{p.nombre}</strong>
            <span className="ml-3 rounded-full bg-muted px-2 py-1 text-xs">
              {p.tipo}
            </span>
            <p className="mt-1 text-sm text-muted-foreground">
              {p.codigo} · {p.cliente} ·{" "}
              {p.partidas.reduce((a, r) => a + r[2], 0)} h presupuestadas
            </p>
          </summary>
          <table className="mt-4 w-full text-left text-sm">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th>Departamento</th>
                <th>Rubro</th>
                <th className="text-right">Horas</th>
              </tr>
            </thead>
            <tbody>
              {p.partidas.map(([d, r, h]) => (
                <tr key={r} className="border-b last:border-0">
                  <td className="py-2">{d}</td>
                  <td>{r}</td>
                  <td className="text-right">{h}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      ))}
    </main>
  );
}
export default function Page() {
  return (
    <Suspense fallback={<p>Cargando ejemplos…</p>}>
      <Ejemplos />
    </Suspense>
  );
}
