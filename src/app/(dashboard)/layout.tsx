
import type { ReactNode } from "react";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <main className="min-h-screen bg-muted/30">
      {children}
    </main>
  );
}
