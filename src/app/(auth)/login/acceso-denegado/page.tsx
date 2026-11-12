
import { logoutAction } from "@/modules/auth/actions/auth.actions";

export default function AccesoDenegadoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <section className="w-full max-w-md rounded-xl border bg-background p-8 text-center">
        <h1 className="text-xl font-semibold">
          Acceso no habilitado
        </h1>

        <p className="mt-3 text-sm text-muted-foreground">
          Tu cuenta no tiene un perfil activo o un rol
          asignado dentro de DAB 2.0.
          Contacta a Administración.
        </p>

        <form action={logoutAction} className="mt-6">
          <button
            type="submit"
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cerrar sesión
          </button>
        </form>
      </section>
    </main>
  );
}
