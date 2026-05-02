interface SummaryItem {
  label: string;
  value: string;
  highlight?: boolean;
}

export function ReportSummary({ items }: { items: SummaryItem[] }) {
  return (
    <div className="flex flex-wrap gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-white border border-slate-200 rounded-lg px-4 py-3 min-w-[140px]"
        >
          <p className="text-xs text-slate-500 mb-0.5">{item.label}</p>
          <p
            className={`text-base font-bold ${
              item.highlight ? "text-blue-600" : "text-slate-800"
            }`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
