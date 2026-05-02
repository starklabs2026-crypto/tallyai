"use client";

import { signOut, useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc-client";
import { formatRelativeTime } from "@/lib/utils";
import { LogOut, RefreshCw, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function TopBar() {
  const { data: session } = useSession();
  const { data: settings } = trpc.company.getSettings.useQuery();

  const syncStatus = settings?.syncStatus ?? "NEVER";

  const syncBadgeClass = {
    SYNCED: "bg-green-100 text-green-700 border-green-200",
    STALE: "bg-yellow-100 text-yellow-700 border-yellow-200",
    NEVER: "bg-red-100 text-red-700 border-red-200",
  }[syncStatus];

  const syncLabel = {
    SYNCED: settings?.lastSyncAt
      ? `Synced ${formatRelativeTime(settings.lastSyncAt)}`
      : "Synced",
    STALE: "Data is stale",
    NEVER: "Never synced",
  }[syncStatus];

  return (
    <header className="h-14 border-b bg-white flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-slate-800">
          {settings?.name ?? session?.user?.name ?? "Dashboard"}
        </span>
        <span
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border",
            syncBadgeClass
          )}
        >
          <RefreshCw className="w-3 h-3" />
          {syncLabel}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-slate-600" />
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-700">
              {session?.user?.name}
            </p>
            <p className="text-xs text-slate-500">{session?.user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors px-2 py-1.5 rounded-md hover:bg-slate-100"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
