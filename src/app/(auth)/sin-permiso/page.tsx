import Link from "next/link";
import { logoutAction } from "@/modules/auth/actions/auth.actions";

export default function SinPermisoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-md rounded-xl border bg-background p-8 text-center">
        <h1 className="text-2xl font-semibold">Acceso restringido</h1>

        <p className="mt-3 text-sm text-muted-foreground">
          No tienes autorización para acceder a esta sección de DAB 2.0.
        </p>

        <Link
          href="/inicio"
          className="mt-6 inline-flex rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Ir a mis módulos disponibles
        </Link>
        <form action={logoutAction} className="mt-4">
          <button type="submit" className="text-sm underline">
            Cerrar sesión
          </button>
        </form>
      </div>
    </main>
  );
}
