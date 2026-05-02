"use client";

import { trpc } from "@/lib/trpc-client";
import { formatINR } from "@/lib/utils";
import { EmptyState } from "@/components/reports/empty-state";
import { ExportCSVButton } from "@/components/reports/export-csv-button";
import { CheckCircle2, XCircle } from "lucide-react";

export default function TrialBalancePage() {
  const { data, isLoading } = trpc.reports.getTrialBalance.useQuery({});

  const csvColumns = [
    { key: "name", header: "Ledger Name" },
    { key: "group", header: "Group" },
    { key: "debit", header: "Debit" },
    { key: "credit", header: "Credit" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Trial Balance</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            All ledger accounts with closing balances
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isLoading && data && (
            <div
              className={`flex items-center gap-1.5 text-sm font-medium ${
                data.balanced ? "text-green-600" : "text-red-600"
              }`}
            >
              {data.balanced ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              {data.balanced ? "Balanced" : "Out of balance!"}
            </div>
          )}
          <ExportCSVButton
            data={(data?.rows ?? []) as Record<string, unknown>[]}
            columns={csvColumns}
            filename="trial-balance"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-9 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ) : (data?.rows?.length ?? 0) === 0 ? (
            <EmptyState />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                    Ledger Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">
                    Group
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-blue-600">
                    Debit (Dr)
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-purple-600">
                    Credit (Cr)
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.rows.map((row, i) => (
                  <tr
                    key={`${row.name}-${i}`}
                    className="border-b border-slate-50 hover:bg-slate-50"
                  >
                    <td className="px-4 py-2.5 text-slate-800">{row.name}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{row.group}</td>
                    <td className="px-4 py-2.5 text-right text-blue-700">
                      {row.debit > 0 ? formatINR(row.debit) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-purple-700">
                      {row.credit > 0 ? formatINR(row.credit) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr
                  className={`border-t-2 ${
                    data?.balanced
                      ? "border-slate-200 bg-slate-50"
                      : "border-red-400 bg-red-50"
                  }`}
                >
                  <td colSpan={2} className="px-4 py-3 font-bold text-slate-700 text-xs uppercase">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">
                    {formatINR(data?.debitTotal ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-purple-700">
                    {formatINR(data?.creditTotal ?? 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
