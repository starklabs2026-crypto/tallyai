"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatINR, formatINRCompact } from "@/lib/utils";
import {
  DateRangePicker,
  getDefaultDateRange,
} from "@/components/reports/date-range-picker";
import { EmptyState } from "@/components/reports/empty-state";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function ProfitLossPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange());

  const { data, isLoading } = trpc.reports.getProfitLoss.useQuery({
    fromDate: dateRange.fromDate,
    toDate: dateRange.toDate,
  });

  const hasData =
    (data?.income?.length ?? 0) > 0 || (data?.expenses?.length ?? 0) > 0;

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profit & Loss</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Income and expenses for the selected period
        </p>
      </div>

      <DateRangePicker value={dateRange} onChange={setDateRange} />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      ) : !hasData ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState />
        </div>
      ) : (
        <>
          {/* Net Profit highlight */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs text-slate-500 uppercase font-medium mb-1">
                Total Income
              </p>
              <p className="text-2xl font-bold text-green-600">
                {formatINRCompact(data?.totalIncome ?? 0)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs text-slate-500 uppercase font-medium mb-1">
                Total Expenses
              </p>
              <p className="text-2xl font-bold text-red-500">
                {formatINRCompact(data?.totalExpenses ?? 0)}
              </p>
            </div>
            <div
              className={`rounded-xl border p-5 ${
                (data?.netProfit ?? 0) >= 0
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <p className="text-xs text-slate-500 uppercase font-medium mb-1 flex items-center gap-1">
                {(data?.netProfit ?? 0) >= 0 ? (
                  <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                )}
                Net Profit
              </p>
              <p
                className={`text-2xl font-bold ${
                  (data?.netProfit ?? 0) >= 0 ? "text-green-700" : "text-red-600"
                }`}
              >
                {formatINRCompact(data?.netProfit ?? 0)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Margin: {data?.profitMarginPercent ?? 0}%
              </p>
            </div>
          </div>

          {/* Two-column Income vs Expenses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Income */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="px-5 py-4 border-b border-slate-100 bg-green-50 rounded-t-xl">
                <h2 className="text-sm font-semibold text-green-700">
                  Income
                </h2>
              </div>
              <div className="divide-y divide-slate-50">
                {(data?.income ?? []).map((item) => (
                  <div
                    key={item.group}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <span className="text-sm text-slate-700">{item.group}</span>
                    <span className="text-sm font-medium text-green-700">
                      {formatINR(item.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-5 py-3 bg-green-50">
                  <span className="text-sm font-bold text-slate-700">
                    Total Income
                  </span>
                  <span className="text-sm font-bold text-green-700">
                    {formatINR(data?.totalIncome ?? 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Expenses */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="px-5 py-4 border-b border-slate-100 bg-red-50 rounded-t-xl">
                <h2 className="text-sm font-semibold text-red-600">
                  Expenses
                </h2>
              </div>
              <div className="divide-y divide-slate-50">
                {(data?.expenses ?? []).map((item) => (
                  <div
                    key={item.group}
                    className="flex items-center justify-between px-5 py-3"
                  >
                    <span className="text-sm text-slate-700">{item.group}</span>
                    <span className="text-sm font-medium text-red-600">
                      {formatINR(item.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between px-5 py-3 bg-red-50">
                  <span className="text-sm font-bold text-slate-700">
                    Total Expenses
                  </span>
                  <span className="text-sm font-bold text-red-600">
                    {formatINR(data?.totalExpenses ?? 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
