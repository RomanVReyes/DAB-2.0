
import { Suspense } from "react";

import { loginAction } from "@/modules/auth/actions/auth.actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

// Solamente este componente necesita
// consultar los parámetros de la URL.
async function LoginError({
  searchParams,
}: LoginPageProps) {
  const { error } = await searchParams;

  if (!error) {
    return null;
  }

  return (
    <p
      role="alert"
      className="mt-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm"
    >
      No fue posible iniciar sesión.
      Verifica tus credenciales e inténtalo nuevamente.
    </p>
  );
}

// La página principal ya no necesita
// consultar directamente searchParams.
export default function LoginPage({
  searchParams,
}: LoginPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-background p-8 shadow-sm">
        <div
          className="mb-8 h-1 w-20 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, #ffba00, #f77b00, #fb00c6)",
          }}
        />

        <p className="text-sm font-medium text-muted-foreground">
          Studio
        </p>

        <h1 className="mt-2 text-2xl font-semibold">
          Iniciar sesión
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Accede a DAB 2.0 con tu cuenta de trabajo.
        </p>

        {/* Contenido dependiente de la solicitud */}
        <Suspense fallback={null}>
          <LoginError searchParams={searchParams} />
        </Suspense>

        <form action={loginAction} className="mt-7 space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium"
            >
              Correo electrónico
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium"
            >
              Contraseña
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <button
            type="submit"
            className="h-11 w-full rounded-lg bg-foreground px-4 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Ingresar
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acceso exclusivo para personal autorizado.
        </p>
      </div>
    </main>
  );
}
