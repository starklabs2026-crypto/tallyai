"use client";

import { useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  format,
} from "date-fns";
import { CalendarDays } from "lucide-react";

type Preset = "thisMonth" | "lastMonth" | "thisQuarter" | "thisYear" | "custom";

interface DateRange {
  fromDate: string;
  toDate: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const PRESETS: { label: string; value: Preset }[] = [
  { label: "This Month", value: "thisMonth" },
  { label: "Last Month", value: "lastMonth" },
  { label: "This Quarter", value: "thisQuarter" },
  { label: "This Year", value: "thisYear" },
  { label: "Custom", value: "custom" },
];

function presetToRange(preset: Preset, now: Date): DateRange {
  switch (preset) {
    case "thisMonth":
      return {
        fromDate: format(startOfMonth(now), "yyyy-MM-dd"),
        toDate: format(endOfMonth(now), "yyyy-MM-dd"),
      };
    case "lastMonth": {
      const last = subMonths(now, 1);
      return {
        fromDate: format(startOfMonth(last), "yyyy-MM-dd"),
        toDate: format(endOfMonth(last), "yyyy-MM-dd"),
      };
    }
    case "thisQuarter":
      return {
        fromDate: format(startOfQuarter(now), "yyyy-MM-dd"),
        toDate: format(endOfQuarter(now), "yyyy-MM-dd"),
      };
    case "thisYear":
      return {
        fromDate: format(startOfYear(now), "yyyy-MM-dd"),
        toDate: format(endOfYear(now), "yyyy-MM-dd"),
      };
    case "custom":
      return {
        fromDate: format(startOfMonth(now), "yyyy-MM-dd"),
        toDate: format(endOfMonth(now), "yyyy-MM-dd"),
      };
  }
}

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [preset, setPreset] = useState<Preset>("thisMonth");
  const now = new Date();

  const handlePreset = (p: Preset) => {
    setPreset(p);
    if (p !== "custom") {
      onChange(presetToRange(p, now));
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CalendarDays className="w-4 h-4 text-slate-400" />
      <div className="flex gap-1">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => handlePreset(p.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              preset === p.value
                ? "bg-blue-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={value.fromDate}
            onChange={(e) => onChange({ ...value, fromDate: e.target.value })}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={value.toDate}
            onChange={(e) => onChange({ ...value, toDate: e.target.value })}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  );
}

export function getDefaultDateRange(): DateRange {
  const now = new Date();
  return {
    fromDate: format(startOfMonth(now), "yyyy-MM-dd"),
    toDate: format(endOfMonth(now), "yyyy-MM-dd"),
  };
}
