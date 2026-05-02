"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatINR, formatINRCompact } from "@/lib/utils";
import {
  DateRangePicker,
  getDefaultDateRange,
} from "@/components/reports/date-range-picker";
import { EmptyState } from "@/components/reports/empty-state";
import { ReportSummary } from "@/components/reports/report-summary";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format } from "date-fns";

export default function CashFlowPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange());

  const { data, isLoading } = trpc.reports.getCashFlow.useQuery({
    fromDate: dateRange.fromDate,
    toDate: dateRange.toDate,
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cash Flow</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Daily cash inflows and outflows
        </p>
      </div>

      <DateRangePicker value={dateRange} onChange={setDateRange} />

      {!isLoading && data && (
        <ReportSummary
          items={[
            {
              label: "Total Cash In",
              value: formatINRCompact(data.totalCashIn),
              highlight: true,
            },
            { label: "Total Cash Out", value: formatINRCompact(data.totalCashOut) },
            {
              label: "Net Flow",
              value: formatINRCompact(data.netFlow),
            },
          ]}
        />
      )}

      {/* Chart */}
      {!isLoading && (data?.rows?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            Daily Cash Movement
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={data?.rows.map((r) => ({
                ...r,
                dateLabel: format(new Date(r.date), "dd MMM"),
              }))}
              margin={{ top: 0, right: 0, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
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
                formatter={(v: number, name: string) => [formatINR(v), name]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="cashIn" name="Cash In" fill="#22c55e" radius={[2, 2, 0, 0]} />
              <Bar dataKey="cashOut" name="Cash Out" fill="#ef4444" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (data?.rows?.length ?? 0) === 0 ? (
            <EmptyState message="No cash transactions (receipts/payments) in this period." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Date</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-green-600">Cash In</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-red-600">Cash Out</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600">Net</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-700">Running Balance</th>
                </tr>
              </thead>
              <tbody>
                {data?.rows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">
                      {format(new Date(row.date), "dd MMM yyyy")}
                    </td>
                    <td className="px-4 py-3 text-right text-green-700">
                      {row.cashIn > 0 ? formatINR(row.cashIn) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      {row.cashOut > 0 ? formatINR(row.cashOut) : "—"}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${row.net >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {formatINR(row.net)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatINR(row.runningBalance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
