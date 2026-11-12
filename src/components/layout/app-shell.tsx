import type { ReactNode } from "react";
import Link from "next/link";

import { dashboardHome } from "@/config/navigation";
import { AppNavigation } from "./app-navigation";

export function AppShell({ children, permissions }: { children: ReactNode; permissions: string[] }) {
  return (
    <div className="flex min-h-dvh bg-muted/60">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-30 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground"
      >
        Saltar al contenido
      </a>

      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto border-r bg-background px-4 py-6 md:flex">
        <Link
          href={dashboardHome}
          className="studio-brand mx-3 self-start rounded-sm pb-2 text-2xl font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground"
        >
          Studio
        </Link>
        <p className="mt-8 mb-3 px-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          Operaciones
        </p>
        <AppNavigation permissions={permissions} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b bg-background">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 md:px-8">
            <div className="py-3">
              <p className="text-sm font-bold">DAB 2.0</p>
              <p className="text-xs text-muted-foreground">
                Sistema de gestión operativa
              </p>
            </div>
            <Link
              href={dashboardHome}
              className="studio-brand rounded-sm pb-1 text-base font-bold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-foreground md:hidden"
            >
              Studio
            </Link>
          </div>
          <div className="border-t px-4 py-2 md:hidden">
            <AppNavigation orientation="horizontal" permissions={permissions} />
          </div>
        </header>

        <main
          id="contenido"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 scroll-mt-52 px-4 py-8 md:scroll-mt-20 md:px-8 md:py-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
