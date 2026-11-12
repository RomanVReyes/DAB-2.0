export const dashboardHome = "/inicio";

export const mainNavigation = [
  {
    label: "Cotizaciones",
    href: "/cotizaciones",
    permission: "cotizaciones.ver",
  },
  { label: "Project Monitor", href: "/proyectos", permission: "proyectos.ver" },
  { label: "Daily", href: "/daily", permission: "daily.ver" },
  { label: "Mi Espejo", href: "/espejo", permission: "espejo.ver" },
  { label: "Reportes", href: "/reportes", permission: "reportes.ver" },
] as const;

export function authorizedNavigation(permissions: readonly string[]) {
  return mainNavigation.filter((item) => permissions.includes(item.permission));
}

export function homeForPermissions(permissions: readonly string[]) {
  return authorizedNavigation(permissions)[0]?.href ?? "/sin-permiso";
}
