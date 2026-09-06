"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  projetos: "Projetos",
  usuarios: "Usuários",
  relatorios: "Relatórios",
};

export default function Header() {
  const { data: session } = useSession();
  const pathname = usePathname();

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs = segments.map((segment, index) => ({
    label: routeLabels[segment] || segment,
    href: "/" + segments.slice(0, index + 1).join("/"),
    isLast: index === segments.length - 1,
  }));

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-2 text-sm">
        <nav className="flex items-center gap-1.5">
          <span className="text-muted">Início</span>
          {breadcrumbs.map((crumb) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              <svg
                className="w-4 h-4 text-muted"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span
                className={
                  crumb.isLast
                    ? "font-medium text-foreground"
                    : "text-muted"
                }
              >
                {crumb.label}
              </span>
            </span>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative group">
          <button className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary-dark font-semibold text-sm">
              {session?.user?.nome?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-foreground">
                {session?.user?.nome || "Usuário"}
              </p>
              <p className="text-xs text-muted">
                {session?.user?.papelSistema || "user"}
              </p>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
