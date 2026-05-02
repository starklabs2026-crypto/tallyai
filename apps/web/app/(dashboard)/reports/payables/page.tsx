"use client";

import { useState } from "react";
import { format } from "date-fns";
import { trpc } from "@/lib/trpc-client";
import { formatINR, formatINRCompact } from "@/lib/utils";
import { EmptyState } from "@/components/reports/empty-state";
import { ExportCSVButton } from "@/components/reports/export-csv-button";
import { ReportSummary } from "@/components/reports/report-summary";
import { Search, AlertCircle } from "lucide-react";

export default function PayablesPage() {
  const [asOfDate, setAsOfDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [search, setSearch] = useState("");

  const { data, isLoading } = trpc.reports.getPayables.useQuery({ asOfDate });

  const filtered = (data ?? []).filter((d) =>
    d.partyName.toLowerCase().includes(search.toLowerCase())
  );

  const totalOutstanding = filtered.reduce((s, d) => s + d.totalOutstanding, 0);
  const overdueCount = filtered.filter((d) => d.overdue).length;

  const csvColumns = [
    { key: "partyName", header: "Party Name" },
    { key: "bucket0to30", header: "0-30 Days" },
    { key: "bucket31to60", header: "31-60 Days" },
    { key: "bucket61to90", header: "61-90 Days" },
    { key: "bucket91plus", header: "91+ Days" },
    { key: "totalOutstanding", header: "Total Payable" },
    { key: "overdue", header: "Overdue" },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payables</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            What your company owes to vendors and creditors
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-medium">As of</label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <ExportCSVButton
            data={filtered as Record<string, unknown>[]}
            columns={csvColumns}
            filename="payables"
          />
        </div>
      </div>

      {!isLoading && filtered.length > 0 && (
        <ReportSummary
          items={[
            {
              label: "Total Payable",
              value: formatINRCompact(totalOutstanding),
              highlight: true,
            },
            { label: "No. of Creditors", value: String(filtered.length) },
            { label: "Overdue Parties", value: String(overdueCount) },
          ]}
        />
      )}

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          placeholder="Search party..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState message="No payables data synced yet." />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                    Party Name
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-green-600">
                    0–30 Days
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-yellow-600">
                    31–60 Days
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-orange-600">
                    61–90 Days
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-red-600">
                    91+ Days
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-700">
                    Total
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.partyName}
                    className="border-b border-slate-50 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {row.partyName}
                    </td>
                    <td className="px-4 py-3 text-right text-green-700">
                      {row.bucket0to30 > 0 ? formatINR(row.bucket0to30) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-yellow-700">
                      {row.bucket31to60 > 0 ? formatINR(row.bucket31to60) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-orange-700">
                      {row.bucket61to90 > 0 ? formatINR(row.bucket61to90) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-red-700">
                      {row.bucket91plus > 0 ? formatINR(row.bucket91plus) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {formatINR(row.totalOutstanding)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {row.overdue && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3" />
                          Overdue
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200">
                  <td className="px-4 py-3 font-bold text-slate-700 text-xs uppercase">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">
                    {formatINR(filtered.reduce((s, d) => s + d.bucket0to30, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-yellow-700">
                    {formatINR(filtered.reduce((s, d) => s + d.bucket31to60, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-orange-700">
                    {formatINR(filtered.reduce((s, d) => s + d.bucket61to90, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red-700">
                    {formatINR(filtered.reduce((s, d) => s + d.bucket91plus, 0))}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    {formatINR(totalOutstanding)}
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
