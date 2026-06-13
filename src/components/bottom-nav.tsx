import { Link, useRouterState } from "@tanstack/react-router";
import { LogOut, TableProperties, Trophy, User } from "lucide-react";

import { cn } from "#/lib/utils";
import { authClient } from "#/lib/auth/auth-client";

const tabs = [
  { to: "/matches", label: "Partidos", icon: TableProperties },
  { to: "/leaderboard", label: "Tabla", icon: Trophy },
  { to: "/profile", label: "Perfil", icon: User },
] as const;

export function BottomNav({ showLogout = false }: { showLogout?: boolean }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.to;

          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={cn(
                "flex min-w-16 flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              {tab.label}
            </Link>
          );
        })}
        {showLogout ? (
          <button
            type="button"
            className="flex min-w-16 flex-col items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => authClient.signOut()}
          >
            <LogOut className="size-5" />
            Salir
          </button>
        ) : null}
      </div>
    </nav>
  );
}
