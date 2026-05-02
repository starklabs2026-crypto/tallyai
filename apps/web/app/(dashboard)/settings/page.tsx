"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { toast } from "sonner";
import { Loader2, Save, ExternalLink } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const router = useRouter();
  const { data: settings, refetch } = trpc.company.getSettings.useQuery();
  const updateName = trpc.company.updateName.useMutation();

  const [companyName, setCompanyName] = useState("");

  // Initialize from settings
  const displayName = companyName || settings?.name || "";

  const handleSave = async () => {
    if (!displayName.trim()) return;
    try {
      await updateName.mutateAsync({ name: displayName.trim() });
      toast.success("Company name updated");
      void refetch();
      router.refresh();
    } catch {
      toast.error("Failed to update company name");
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Manage your company profile and preferences
        </p>
      </div>

      {/* Company Name */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">
          Company Profile
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Company Name
            </label>
            <input
              value={displayName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder={settings?.name ?? "Enter company name"}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => void handleSave()}
            disabled={updateName.isPending || !displayName.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {updateName.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Connector quick link */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-1">
              Tally Connector
            </h2>
            <p className="text-xs text-slate-500">
              Configure sync token and view sync history
            </p>
          </div>
          <Link
            href="/settings/connector"
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Configure
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="mt-3 text-xs text-slate-500">
          <span>Status: </span>
          <span
            className={
              settings?.syncStatus === "SYNCED"
                ? "text-green-600 font-medium"
                : settings?.syncStatus === "STALE"
                ? "text-yellow-600 font-medium"
                : "text-red-600 font-medium"
            }
          >
            {settings?.syncStatus ?? "NEVER"}
          </span>
          {settings?.lastSyncAt && (
            <span> — last synced {new Date(settings.lastSyncAt).toLocaleString("en-IN")}</span>
          )}
        </div>
      </div>
    </div>
  );
}
