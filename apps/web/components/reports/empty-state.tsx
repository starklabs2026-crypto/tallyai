import Link from "next/link";
import { Database } from "lucide-react";

export function EmptyState({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
        <Database className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="text-slate-700 font-semibold mb-1">No data synced yet</h3>
      <p className="text-slate-400 text-sm max-w-xs mb-4">
        {message ??
          "Connect your Tally Prime installation to start seeing financial data here."}
      </p>
      <Link
        href="/settings/connector"
        className="text-sm font-medium text-blue-600 hover:underline"
      >
        Set up Tally connector →
      </Link>
    </div>
  );
}
