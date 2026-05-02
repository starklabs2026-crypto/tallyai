"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { formatINRCompact, formatINR, formatDate } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"];

const VOUCHER_TYPE_COLORS: Record<string, string> = {
  SALES: "bg-green-100 text-green-700",
  PURCHASE: "bg-blue-100 text-blue-700",
  RECEIPT: "bg-teal-100 text-teal-700",
  PAYMENT: "bg-red-100 text-red-700",
  JOURNAL: "bg-purple-100 text-purple-700",
  CONTRA: "bg-slate-100 text-slate-700",
};

function KpiSkeleton() {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-32 mb-3" />
      <div className="h-8 bg-slate-200 rounded w-24 mb-2" />
      <div className="h-3 bg-slate-200 rounded w-20" />
    </div>
  );
}

export default function DashboardPage() {
  const { data: kpis, isLoading: kpisLoading } = trpc.dashboard.getKPIs.useQuery();
  const { data: monthlySales, isLoading: salesLoading } =
    trpc.dashboard.getMonthlySales.useQuery();

  const showSyncAlert = kpis?.syncStatus === "STALE" || kpis?.syncStatus === "NEVER";

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Financial overview at a glance
        </p>
      </div>

      {/* Sync Alert */}
      {showSyncAlert && !kpisLoading && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              {kpis?.syncStatus === "NEVER"
                ? "No data synced yet"
                : "Data is outdated"}
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {kpis?.syncStatus === "NEVER"
                ? "Connect your Tally Prime installation to start syncing financial data."
                : "Your last sync was more than 2 hours ago. Check your connector is running."}
            </p>
          </div>
          <Link
            href="/settings/connector"
            className="text-xs font-medium text-amber-700 hover:text-amber-900 underline flex-shrink-0"
          >
            {kpis?.syncStatus === "NEVER" ? "Set up connector" : "Check connector"}
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpisLoading ? (
          <>
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
            <KpiSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              title="Total Receivables"
              value={formatINRCompact(kpis?.totalReceivables ?? 0)}
              subtitle={
                kpis?.overdueReceivables
                  ? `${formatINRCompact(kpis.overdueReceivables)} overdue`
                  : "All current"
              }
              subtitleColor={
                (kpis?.overdueReceivables ?? 0) > 0 ? "text-red-500" : "text-green-500"
              }
              icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
            />
            <KpiCard
              title="Total Payables"
              value={formatINRCompact(kpis?.totalPayables ?? 0)}
              subtitle="Amount owed to vendors"
              icon={<TrendingDown className="w-5 h-5 text-orange-500" />}
            />
            <KpiCard
              title="Monthly Sales"
              value={formatINRCompact(kpis?.monthlySalesTotal ?? 0)}
              subtitle={
                kpis?.salesGrowthPercent !== undefined
                  ? `${kpis.salesGrowthPercent > 0 ? "+" : ""}${kpis.salesGrowthPercent}% vs last month`
                  : "This month"
              }
              subtitleColor={
                (kpis?.salesGrowthPercent ?? 0) >= 0
                  ? "text-green-500"
                  : "text-red-500"
              }
              trendIcon={
                (kpis?.salesGrowthPercent ?? 0) >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />
                )
              }
              icon={<RefreshCw className="w-5 h-5 text-green-500" />}
            />
            <KpiCard
              title="Cash Balance"
              value={formatINRCompact(kpis?.cashBalance ?? 0)}
              subtitle="Cash & bank accounts"
              icon={<span className="text-lg">₹</span>}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Sales Bar Chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            Sales — Last 6 Months
          </h2>
          {salesLoading ? (
            <div className="h-48 bg-slate-100 rounded animate-pulse" />
          ) : (monthlySales?.length ?? 0) === 0 ? (
            <EmptyChartState />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlySales} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v: number) => formatINRCompact(v)}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(v: number) => [formatINR(v), "Sales"]}
                  contentStyle={{
                    fontSize: 12,
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                  }}
                />
                <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Debtors Donut */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            Top 5 Debtors
          </h2>
          {kpisLoading ? (
            <div className="h-48 bg-slate-100 rounded animate-pulse" />
          ) : (kpis?.topDebtors?.length ?? 0) === 0 ? (
            <EmptyChartState />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={kpis?.topDebtors}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={40}
                >
                  {kpis?.topDebtors.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number) => [formatINR(v), "Outstanding"]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend
                  formatter={(value) =>
                    value.length > 16 ? value.substring(0, 16) + "…" : value
                  }
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Vouchers */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-700">
            Recent Transactions
          </h2>
        </div>
        {kpisLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (kpis?.recentVouchers?.length ?? 0) === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            No transactions synced yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500">
                  <th className="text-left px-5 py-3 font-medium">Date</th>
                  <th className="text-left px-3 py-3 font-medium">Type</th>
                  <th className="text-left px-3 py-3 font-medium">Voucher #</th>
                  <th className="text-left px-3 py-3 font-medium">Party</th>
                  <th className="text-right px-5 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {kpis?.recentVouchers.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-5 py-3 text-slate-600">
                      {formatDate(v.date)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={cn(
                          "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                          VOUCHER_TYPE_COLORS[v.voucherType] ??
                            "bg-slate-100 text-slate-600"
                        )}
                      >
                        {v.voucherType}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600 font-mono text-xs">
                      {v.voucherNumber}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {v.partyName ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-medium text-slate-800">
                      {formatINR(v.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
  subtitleColor = "text-slate-400",
  icon,
  trendIcon,
}: {
  title: string;
  value: string;
  subtitle?: string;
  subtitleColor?: string;
  icon?: React.ReactNode;
  trendIcon?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 hover:border-slate-300 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          {title}
        </p>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {subtitle && (
        <div className="flex items-center gap-0.5 mt-1.5">
          {trendIcon}
          <p className={cn("text-xs", subtitleColor)}>{subtitle}</p>
        </div>
      )}
    </div>
  );
}

function EmptyChartState() {
  return (
    <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
      No data available
    </div>
  );
}
