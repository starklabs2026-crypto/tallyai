"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { formatINR, formatINRCompact, formatDate } from "@/lib/utils";
import {
  DateRangePicker,
  getDefaultDateRange,
} from "@/components/reports/date-range-picker";
import { EmptyState } from "@/components/reports/empty-state";
import { ExportCSVButton } from "@/components/reports/export-csv-button";
import { ReportSummary } from "@/components/reports/report-summary";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

export default function SalesRegisterPage() {
  const [dateRange, setDateRange] = useState(getDefaultDateRange());

  const { data, isLoading } = trpc.reports.getSalesRegister.useQuery({
    fromDate: dateRange.fromDate,
    toDate: dateRange.toDate,
  });

  const csvColumns = [
    { key: "date", header: "Date" },
    { key: "voucherNumber", header: "Voucher #" },
    { key: "partyName", header: "Party" },
    { key: "amount", header: "Amount" },
    { key: "narration", header: "Narration" },
  ];

  const tableData = (data?.items ?? []).map((v) => ({
    ...v,
    date: formatDate(v.date),
  }));

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales Register</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            All sales transactions in the selected period
          </p>
        </div>
        <ExportCSVButton
          data={tableData as Record<string, unknown>[]}
          columns={csvColumns}
          filename="sales-register"
        />
      </div>

      <DateRangePicker value={dateRange} onChange={setDateRange} />

      {!isLoading && data && (
        <ReportSummary
          items={[
            {
              label: "Total Sales",
              value: formatINRCompact(data.total),
              highlight: true,
            },
            { label: "Transactions", value: String(data.count) },
            { label: "Avg. Transaction", value: formatINR(data.avgTransaction) },
            {
              label: "vs Last Month",
              value:
                data.growthPercent !== undefined
                  ? `${data.growthPercent > 0 ? "+" : ""}${data.growthPercent}%`
                  : "—",
            },
          ]}
        />
      )}

      {/* Daily trend chart */}
      {!isLoading && (data?.dailyBreakdown?.length ?? 0) > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">
            Daily Sales Trend
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={data?.dailyBreakdown.map((d) => ({
                ...d,
                dateLabel: format(new Date(d.date), "dd MMM"),
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
                formatter={(v: number) => [formatINR(v), "Sales"]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
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
          ) : (data?.items?.length ?? 0) === 0 ? (
            <EmptyState message="No sales transactions in this period." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                    Voucher #
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                    Party
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">
                    Amount
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                    Narration
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-slate-50 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(v.date)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {v.voucherNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {v.partyName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatINR(v.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-[200px]">
                      {v.narration ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td
                    colSpan={3}
                    className="px-4 py-3 font-bold text-slate-700 text-xs uppercase"
                  >
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    {formatINR(data?.total ?? 0)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
