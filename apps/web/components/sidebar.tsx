"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  MessageSquare,
  Settings,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Receipt,
  Scale,
  Droplets,
  FileText,
  Users,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

const reports = [
  { label: "Debtor Aging", href: "/reports/debtor-aging", icon: Users },
  { label: "Payables", href: "/reports/payables", icon: TrendingDown },
  { label: "Receivables", href: "/reports/receivables", icon: TrendingUp },
  { label: "Sales Register", href: "/reports/sales", icon: Receipt },
  { label: "Profit & Loss", href: "/reports/profit-loss", icon: DollarSign },
  { label: "Balance Sheet", href: "/reports/balance-sheet", icon: Scale },
  { label: "Trial Balance", href: "/reports/trial-balance", icon: FileText },
  { label: "Cash Flow", href: "/reports/cash-flow", icon: Droplets },
];

export function Sidebar() {
  const pathname = usePathname();
  const [reportsOpen, setReportsOpen] = useState(
    pathname.startsWith("/reports")
  );

  const isActive = (href: string) => pathname === href;
  const isReportsActive = pathname.startsWith("/reports");

  return (
    <aside className="w-64 bg-sidebar flex-shrink-0 flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">T</span>
          </div>
          <span className="text-sidebar-foreground text-lg font-bold">TallyAI</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            isActive("/")
              ? "bg-sidebar-accent text-sidebar-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </Link>

        {/* Reports accordion */}
        <div>
          <button
            onClick={() => setReportsOpen((o) => !o)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              isReportsActive
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
            )}
          >
            <BarChart3 className="w-4 h-4" />
            Reports
            <span className="ml-auto">
              {reportsOpen ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
          </button>

          {reportsOpen && (
            <div className="mt-1 ml-4 space-y-0.5 border-l border-sidebar-border pl-3">
              {reports.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors",
                    isActive(href)
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <Link
          href="/chat"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            isActive("/chat")
              ? "bg-sidebar-accent text-sidebar-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}
        >
          <MessageSquare className="w-4 h-4" />
          AI Chat
        </Link>

        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            pathname.startsWith("/settings")
              ? "bg-sidebar-accent text-sidebar-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}
        >
          <Settings className="w-4 h-4" />
          Settings
        </Link>
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <p className="text-sidebar-foreground/40 text-xs">v1.0.0</p>
      </div>
    </aside>
  );
}
