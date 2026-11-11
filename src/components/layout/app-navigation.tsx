"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { mainNavigation } from "@/config/navigation";
import { cn } from "@/lib/utils";

type AppNavigationProps = {
  orientation?: "vertical" | "horizontal";
};

export function AppNavigation({
  orientation = "vertical",
}: AppNavigationProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        "gap-1",
        orientation === "vertical"
          ? "flex flex-col"
          : "grid grid-cols-2 sm:flex sm:flex-wrap",
      )}
    >
      {mainNavigation.map(({ href, label }) => {
        const isCurrentPage = pathname === href;
        const isActive = isCurrentPage || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? (isCurrentPage ? "page" : "location") : undefined}
            className={cn(
              "flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-muted",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
