import Link from "next/link";
export default function NotFound() {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Cotización no encontrada</h1>
      <Link href="/cotizaciones" className="underline">
        Volver al listado
      </Link>
    </section>
  );
}
