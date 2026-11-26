import { Suspense, type ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { requireAppUser } from "@/server/auth/require-app-user";
import { obtenerPermisosUsuario } from "@/server/auth/permissions";
import { logoutAction } from "@/modules/auth/actions/auth.actions";

type DashboardLayoutProps = {
  children: ReactNode;
};

// Este componente consulta los datos del usuario.
async function ProtectedDashboard({ children }: DashboardLayoutProps) {
  const usuario = await requireAppUser();
  const permissions = await obtenerPermisosUsuario();

  return (
    <AppShell
      permissions={permissions}
      account={
        <details className="relative text-right text-sm">
          <summary className="cursor-pointer rounded-lg px-3 py-2 font-semibold">
            {usuario.nombre} · {usuario.roles}
          </summary>
          <div className="absolute right-0 mt-1 rounded-lg border bg-background p-4 shadow-md">
            <p>{usuario.email}</p>
            <form action={logoutAction}>
              <button className="mt-3 underline">Cerrar sesión</button>
            </form>
          </div>
        </details>
      }
    >
      {children}
    </AppShell>
  );
}

// El layout proporciona un estado de carga.
export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-muted/40">
          <p role="status" className="text-sm text-muted-foreground">
            Verificando acceso a DAB 2.0...
          </p>
        </main>
      }
    >
      <ProtectedDashboard>{children}</ProtectedDashboard>
    </Suspense>
  );
}
