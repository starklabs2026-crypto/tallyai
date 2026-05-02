"use client";

import { trpc } from "@/lib/trpc-client";
import { formatINR, formatINRCompact } from "@/lib/utils";
import { EmptyState } from "@/components/reports/empty-state";

export default function BalanceSheetPage() {
  const { data, isLoading } = trpc.reports.getBalanceSheet.useQuery({});

  const hasData =
    (data?.assets?.fixed?.length ?? 0) > 0 ||
    (data?.assets?.current?.length ?? 0) > 0 ||
    (data?.liabilities?.capital?.length ?? 0) > 0;

  function LedgerRow({ name, amount }: { name: string; amount: number }) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50">
        <span className="text-sm text-slate-700">{name}</span>
        <span className="text-sm font-medium text-slate-800">{formatINR(amount)}</span>
      </div>
    );
  }

  function SectionHeader({ title }: { title: string }) {
    return (
      <div className="px-4 py-2 bg-slate-50 border-y border-slate-100">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {title}
        </span>
      </div>
    );
  }

  function SectionTotal({ label, amount }: { label: string; amount: number }) {
    return (
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-t border-slate-200">
        <span className="text-sm font-bold text-slate-700">{label}</span>
        <span className="text-sm font-bold text-slate-900">{formatINR(amount)}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Balance Sheet</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Assets and liabilities as of today
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-6">
          {[0, 1].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="h-8 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      ) : !hasData ? (
        <div className="bg-white rounded-xl border border-slate-200">
          <EmptyState />
        </div>
      ) : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-500 uppercase font-medium mb-1">Total Assets</p>
              <p className="text-2xl font-bold text-blue-700">{formatINRCompact(data?.totalAssets ?? 0)}</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-xs text-purple-500 uppercase font-medium mb-1">Total Liabilities</p>
              <p className="text-2xl font-bold text-purple-700">{formatINRCompact(data?.totalLiabilities ?? 0)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assets */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-4 border-b border-slate-100 bg-blue-50">
                <h2 className="font-semibold text-blue-700">Assets</h2>
              </div>
              {(data?.assets?.fixed?.length ?? 0) > 0 && (
                <>
                  <SectionHeader title="Fixed Assets" />
                  {data?.assets?.fixed?.map((l) => (
                    <LedgerRow key={l.name} name={l.name} amount={l.amount} />
                  ))}
                  <SectionTotal
                    label="Total Fixed Assets"
                    amount={data?.assets?.fixed?.reduce((s, l) => s + l.amount, 0) ?? 0}
                  />
                </>
              )}
              {(data?.assets?.current?.length ?? 0) > 0 && (
                <>
                  <SectionHeader title="Current Assets" />
                  {data?.assets?.current?.map((l) => (
                    <LedgerRow key={l.name} name={l.name} amount={l.amount} />
                  ))}
                  <SectionTotal
                    label="Total Current Assets"
                    amount={data?.assets?.current?.reduce((s, l) => s + l.amount, 0) ?? 0}
                  />
                </>
              )}
            </div>

            {/* Liabilities */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-4 border-b border-slate-100 bg-purple-50">
                <h2 className="font-semibold text-purple-700">Liabilities & Equity</h2>
              </div>
              {(data?.liabilities?.capital?.length ?? 0) > 0 && (
                <>
                  <SectionHeader title="Capital & Reserves" />
                  {data?.liabilities?.capital?.map((l) => (
                    <LedgerRow key={l.name} name={l.name} amount={l.amount} />
                  ))}
                  <SectionTotal
                    label="Total Capital"
                    amount={data?.liabilities?.capital?.reduce((s, l) => s + l.amount, 0) ?? 0}
                  />
                </>
              )}
              {(data?.liabilities?.longTerm?.length ?? 0) > 0 && (
                <>
                  <SectionHeader title="Long-term Liabilities" />
                  {data?.liabilities?.longTerm?.map((l) => (
                    <LedgerRow key={l.name} name={l.name} amount={l.amount} />
                  ))}
                  <SectionTotal
                    label="Total Long-term"
                    amount={data?.liabilities?.longTerm?.reduce((s, l) => s + l.amount, 0) ?? 0}
                  />
                </>
              )}
              {(data?.liabilities?.current?.length ?? 0) > 0 && (
                <>
                  <SectionHeader title="Current Liabilities" />
                  {data?.liabilities?.current?.map((l) => (
                    <LedgerRow key={l.name} name={l.name} amount={l.amount} />
                  ))}
                  <SectionTotal
                    label="Total Current Liabilities"
                    amount={data?.liabilities?.current?.reduce((s, l) => s + l.amount, 0) ?? 0}
                  />
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
