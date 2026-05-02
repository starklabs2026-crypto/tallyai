"use client";

import { trpc } from "@/lib/trpc-client";
import { formatINR, formatINRCompact, formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/reports/empty-state";
import { ExportCSVButton } from "@/components/reports/export-csv-button";
import { ReportSummary } from "@/components/reports/report-summary";
import { cn } from "@/lib/utils";

function ageBadgeClass(ageDays: number): string {
  if (ageDays <= 30) return "bg-green-50 text-green-700";
  if (ageDays <= 60) return "bg-yellow-50 text-yellow-700";
  if (ageDays <= 90) return "bg-orange-50 text-orange-700";
  return "bg-red-50 text-red-700";
}

export default function ReceivablesPage() {
  const { data, isLoading } = trpc.reports.getReceivables.useQuery();

  const totalPending = (data ?? []).reduce((s, b) => s + b.pendingAmount, 0);
  const overdueCount = (data ?? []).filter((b) => b.overdue).length;

  const csvColumns = [
    { key: "partyName", header: "Party" },
    { key: "billNumber", header: "Bill #" },
    { key: "billDate", header: "Bill Date" },
    { key: "dueDate", header: "Due Date" },
    { key: "amount", header: "Amount" },
    { key: "pendingAmount", header: "Pending" },
    { key: "ageDays", header: "Age (Days)" },
  ];

  const tableData = (data ?? []).map((b) => ({
    ...b,
    billDate: formatDate(b.billDate),
    dueDate: formatDate(b.dueDate),
  }));

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Receivables</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            All outstanding bills to be collected
          </p>
        </div>
        <ExportCSVButton
          data={tableData as Record<string, unknown>[]}
          columns={csvColumns}
          filename="receivables"
        />
      </div>

      {!isLoading && (data?.length ?? 0) > 0 && (
        <ReportSummary
          items={[
            {
              label: "Total Pending",
              value: formatINRCompact(totalPending),
              highlight: true,
            },
            { label: "Bills", value: String(data?.length ?? 0) },
            { label: "Overdue", value: String(overdueCount) },
          ]}
        />
      )}

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (data?.length ?? 0) === 0 ? (
            <EmptyState />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Party</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Bill #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Bill Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Due Date</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Amount</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500">Pending</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">Age</th>
                </tr>
              </thead>
              <tbody>
                {data?.map((b) => (
                  <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{b.partyName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{b.billNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(b.billDate)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(b.dueDate)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{formatINR(b.amount)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatINR(b.pendingAmount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-medium", ageBadgeClass(b.ageDays))}>
                        {b.ageDays}d
                      </span>
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
