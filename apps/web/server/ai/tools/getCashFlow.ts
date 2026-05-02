import { db } from "@/server/db";
import { startOfMonth, endOfMonth, startOfDay } from "date-fns";

export async function getCashFlow({
  companyId,
  fromDate,
  toDate,
}: {
  companyId: string;
  fromDate?: string;
  toDate?: string;
}) {
  const now = new Date();
  const from = fromDate ? new Date(fromDate) : startOfMonth(now);
  const to = toDate ? new Date(toDate) : endOfMonth(now);

  const vouchers = await db.voucher.findMany({
    where: {
      companyId,
      voucherType: { in: ["RECEIPT", "PAYMENT"] },
      date: { gte: from, lte: to },
    },
    orderBy: { date: "asc" },
    select: { date: true, voucherType: true, amount: true },
  });

  const dailyMap = new Map<string, { date: string; cashIn: number; cashOut: number }>();

  for (const v of vouchers) {
    const key = startOfDay(v.date).toISOString();
    if (!dailyMap.has(key)) dailyMap.set(key, { date: key, cashIn: 0, cashOut: 0 });
    const entry = dailyMap.get(key)!;
    if (v.voucherType === "RECEIPT") entry.cashIn += Number(v.amount);
    else entry.cashOut += Number(v.amount);
  }

  let running = 0;
  const rows = Array.from(dailyMap.values()).map((d) => {
    const net = d.cashIn - d.cashOut;
    running += net;
    return { ...d, net, runningBalance: running };
  });

  return {
    fromDate: from.toISOString(),
    toDate: to.toISOString(),
    rows,
    totalCashIn: rows.reduce((s, r) => s + r.cashIn, 0),
    totalCashOut: rows.reduce((s, r) => s + r.cashOut, 0),
    netFlow: rows.reduce((s, r) => s + r.net, 0),
  };
}
