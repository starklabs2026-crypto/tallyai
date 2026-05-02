"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";
import {
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Terminal,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_COLORS = {
  SUCCESS: "bg-green-100 text-green-700 border-green-200",
  PARTIAL: "bg-yellow-100 text-yellow-700 border-yellow-200",
  FAILED: "bg-red-100 text-red-700 border-red-200",
};

export default function ConnectorPage() {
  const [showToken, setShowToken] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);

  const { data: settings, refetch } = trpc.company.getSettings.useQuery();
  const { data: syncHistory } = trpc.company.getSyncHistory.useQuery();
  const regenerate = trpc.company.regenerateSyncToken.useMutation();

  const token = settings?.syncToken ?? "";
  const maskedToken = token
    ? token.substring(0, 8) + "-●●●●-●●●●-●●●●-" + token.slice(-4)
    : "Loading...";

  const handleCopy = async () => {
    if (!token) return;
    await navigator.clipboard.writeText(token);
    toast.success("Sync token copied!");
  };

  const handleRegenerate = async () => {
    if (!confirmRegen) {
      setConfirmRegen(true);
      return;
    }
    try {
      await regenerate.mutateAsync();
      toast.success("New sync token generated. Update your connector .env file.");
      setConfirmRegen(false);
      void refetch();
    } catch {
      toast.error("Failed to regenerate token");
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tally Connector</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Connect your local Tally Prime installation to TallyAI
        </p>
      </div>

      {/* Sync Token */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Sync Token</h2>
        <p className="text-xs text-slate-500 mb-4">
          This token authenticates your Tally connector. Keep it secret.
        </p>
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 font-mono text-sm text-slate-700 mb-3">
          <span className="flex-1 truncate">
            {showToken ? token : maskedToken}
          </span>
          <button
            onClick={() => setShowToken((s) => !s)}
            className="text-slate-400 hover:text-slate-600"
          >
            {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void handleCopy()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy
          </button>
          <button
            onClick={() => void handleRegenerate()}
            disabled={regenerate.isPending}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
              confirmRegen
                ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
                : "text-slate-600 border-slate-200 hover:bg-slate-50"
            )}
          >
            {regenerate.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            {confirmRegen ? "Confirm — this will break existing connector!" : "Regenerate"}
          </button>
          {confirmRegen && (
            <button
              onClick={() => setConfirmRegen(false)}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-500" />
          Setup Instructions
        </h2>
        <ol className="space-y-4 text-sm text-slate-600">
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
              1
            </span>
            <div>
              <p className="font-medium text-slate-700">
                Enable XML over HTTP in Tally Prime
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Open Tally Prime → Press{" "}
                <kbd className="px-1 py-0.5 bg-slate-100 rounded text-xs font-mono">
                  F12
                </kbd>{" "}
                → Advanced Configuration → Enable{" "}
                <strong>TallyPrime as XML Server</strong> → Set port to{" "}
                <code className="bg-slate-100 px-1 rounded font-mono">9000</code>
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
              2
            </span>
            <div>
              <p className="font-medium text-slate-700">Download the connector</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Download the tally-connector package from the{" "}
                <a href="#" className="text-blue-600 hover:underline">
                  releases page
                </a>
                , or clone the monorepo and navigate to{" "}
                <code className="bg-slate-100 px-1 rounded font-mono text-xs">
                  packages/tally-connector
                </code>
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
              3
            </span>
            <div>
              <p className="font-medium text-slate-700">Configure the .env file</p>
              <div className="mt-1 bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono">
                <p className="text-slate-400"># .env</p>
                <p>
                  PLATFORM_URL=
                  <span className="text-green-400">
                    {typeof window !== "undefined" ? window.location.origin : "https://your-app.railway.app"}
                  </span>
                </p>
                <p>
                  SYNC_TOKEN=
                  <span className="text-yellow-400">
                    {showToken ? token : "your-sync-token-from-above"}
                  </span>
                </p>
                <p>
                  SYNC_INTERVAL_MINUTES=
                  <span className="text-blue-400">15</span>
                </p>
              </div>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
              4
            </span>
            <div>
              <p className="font-medium text-slate-700">Start the connector</p>
              <div className="mt-1 bg-slate-900 text-slate-100 rounded-lg p-3 text-xs font-mono">
                <p className="text-slate-400"># Install dependencies</p>
                <p>npm install</p>
                <p className="mt-1 text-slate-400"># Start (with hot-reload)</p>
                <p>npm start</p>
                <p className="mt-1 text-slate-400"># Or build and run</p>
                <p>npm run build && npm run start:prod</p>
              </div>
            </div>
          </li>
        </ol>
      </div>

      {/* Sync Status & History */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-700">Sync Status</h2>
          <div className="flex items-center gap-1.5">
            {settings?.syncStatus === "SYNCED" ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : settings?.syncStatus === "STALE" ? (
              <Clock className="w-4 h-4 text-yellow-500" />
            ) : (
              <XCircle className="w-4 h-4 text-red-500" />
            )}
            <span
              className={cn(
                "text-sm font-medium",
                settings?.syncStatus === "SYNCED"
                  ? "text-green-600"
                  : settings?.syncStatus === "STALE"
                  ? "text-yellow-600"
                  : "text-red-600"
              )}
            >
              {settings?.syncStatus ?? "NEVER"}
            </span>
          </div>
        </div>
        {settings?.lastSyncAt && (
          <p className="text-xs text-slate-500 mb-4">
            Last sync: {formatDateTime(settings.lastSyncAt)}
          </p>
        )}

        <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
          Recent Sync History
        </h3>
        {!syncHistory || syncHistory.length === 0 ? (
          <p className="text-xs text-slate-400">No sync history yet</p>
        ) : (
          <div className="space-y-1.5">
            {syncHistory.map((log) => (
              <div
                key={log.id}
                className="flex items-center gap-3 text-xs"
              >
                <span
                  className={cn(
                    "inline-flex px-2 py-0.5 rounded-full border font-medium text-xs",
                    STATUS_COLORS[log.status]
                  )}
                >
                  {log.status}
                </span>
                <span className="text-slate-500">
                  {formatDateTime(log.syncedAt)}
                </span>
                <span className="text-slate-600 font-medium">
                  {log.recordsUpserted} records
                </span>
                {log.error && (
                  <span className="text-red-500 truncate max-w-[200px]">
                    {log.error}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
