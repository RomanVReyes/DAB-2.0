
type ModulePlaceholderProps = {
  title: string;
  description: string;
};

export function ModulePlaceholder({
  title,
  description,
}: ModulePlaceholderProps) {
  return (
    <section className="mx-auto max-w-5xl px-6 py-10">
      <p className="text-sm font-medium text-muted-foreground">
        DAB 2.0
      </p>

      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {title}
      </h1>

      <p className="mt-3 text-muted-foreground">
        {description}
      </p>

      <div className="mt-8 rounded-xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Este módulo se encuentra en preparación.
        </p>
      </div>
    </section>
  );
}
