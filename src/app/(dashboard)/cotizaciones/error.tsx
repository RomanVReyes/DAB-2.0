"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="space-y-4 rounded-xl border bg-background p-6">
      <h1 className="text-xl font-semibold">No pudimos cargar Cotizaciones</h1>
      <p>
        Inténtalo de nuevo. Si el problema continúa, contacta a Administración.
      </p>
      <Button onClick={reset}>Reintentar</Button>
    </section>
  );
}
