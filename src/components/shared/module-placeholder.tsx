
type ModulePlaceholderProps = {
  title: string;
  description: string;
};

export function ModulePlaceholder({
  title,
  description,
}: ModulePlaceholderProps) {
  return (
    <section className="max-w-5xl">
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
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
