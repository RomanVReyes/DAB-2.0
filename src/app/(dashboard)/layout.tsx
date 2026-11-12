
import { Suspense, type ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireAppUser } from "@/server/auth/require-app-user";
import { obtenerPermisosUsuario } from "@/server/auth/permissions";
import { logoutAction } from "@/modules/auth/actions/auth.actions";

type DashboardLayoutProps = {
  children: ReactNode;
};

// Este componente consulta los datos del usuario.
async function ProtectedDashboard({
  children,
}: DashboardLayoutProps) {
  const usuario = await requireAppUser();
  const permissions = await obtenerPermisosUsuario();

  return (
    <AppShell permissions={permissions}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {usuario.nombre}
          </p>

          <p className="text-xs text-muted-foreground">
            {usuario.email}
          </p>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cerrar sesión
          </button>
        </form>
      </div>

      {children}
    </AppShell>
  );
}

// El layout proporciona un estado de carga.
export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-muted/40">
          <p
            role="status"
            className="text-sm text-muted-foreground"
          >
            Verificando acceso a DAB 2.0...
          </p>
        </main>
      }
    >
      <ProtectedDashboard>
        {children}
      </ProtectedDashboard>
    </Suspense>
  );
}
