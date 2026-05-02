import { db } from "@/server/db";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function getSalesReport({
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
      voucherType: "SALES",
      date: { gte: from, lte: to },
    },
    orderBy: { date: "desc" },
    select: {
      voucherNumber: true,
      date: true,
      partyName: true,
      amount: true,
      narration: true,
    },
    take: 50,
  });

  const items = vouchers.map((v) => ({
    ...v,
    amount: Number(v.amount),
  }));

  const total = items.reduce((s, v) => s + v.amount, 0);

  // Last month for comparison
  const lastMonthAgg = await db.voucher.aggregate({
    where: {
      companyId,
      voucherType: "SALES",
      date: {
        gte: startOfMonth(subMonths(now, 1)),
        lte: endOfMonth(subMonths(now, 1)),
      },
    },
    _sum: { amount: true },
  });
  const lastMonthTotal = Number(lastMonthAgg._sum.amount ?? 0);

  return {
    fromDate: from.toISOString(),
    toDate: to.toISOString(),
    items,
    total,
    count: items.length,
    lastMonthTotal,
    growthPercent:
      lastMonthTotal > 0
        ? Math.round(((total - lastMonthTotal) / lastMonthTotal) * 1000) / 10
        : 0,
  };
}
