export function faltaEsquemaProyectos(error: { code?: string } | null) {
  return ["PGRST202", "PGRST205", "42P01", "42883"].includes(error?.code ?? "");
}

export function EsquemaProyectosPendiente() {
  return (
    <section className="space-y-3 rounded-xl border bg-background p-6">
      <h1 className="text-xl font-semibold">Project Monitor</h1>
      <p>
        El esquema de Project Monitor aún no está disponible en este entorno.
      </p>
      <p className="text-sm text-muted-foreground">
        Administración debe verificar la migración de Project Monitor.
      </p>
    </section>
  );
}
