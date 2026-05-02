"use client";

import { Download } from "lucide-react";
import { jsonToCsv, downloadCsv } from "@/lib/utils";

interface ExportCSVButtonProps {
  data: Record<string, unknown>[];
  columns: { key: string; header: string }[];
  filename: string;
}

export function ExportCSVButton({ data, columns, filename }: ExportCSVButtonProps) {
  const handleExport = () => {
    if (data.length === 0) return;
    const csv = jsonToCsv(data, columns);
    downloadCsv(csv, `${filename}-${new Date().toISOString().split("T")[0]}.csv`);
  };

  return (
    <button
      onClick={handleExport}
      disabled={data.length === 0}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <Download className="w-3.5 h-3.5" />
      Export CSV
    </button>
  );
}
