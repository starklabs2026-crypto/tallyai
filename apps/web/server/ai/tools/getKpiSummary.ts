import { db } from "@/server/db";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export async function getKpiSummary({ companyId }: { companyId: string }) {
  const now = new Date();

  const [
    company,
    receivablesAgg,
    payablesAgg,
    overdueAgg,
    monthSalesAgg,
    lastMonthSalesAgg,
    cashLedgers,
    topDebtorsRaw,
  ] = await Promise.all([
    db.company.findUnique({
      where: { id: companyId },
      select: { lastSyncAt: true },
    }),
    db.outstandingBill.aggregate({
      where: { companyId, type: "RECEIVABLE" },
      _sum: { pendingAmount: true },
    }),
    db.outstandingBill.aggregate({
      where: { companyId, type: "PAYABLE" },
      _sum: { pendingAmount: true },
    }),
    db.outstandingBill.aggregate({
      where: { companyId, type: "RECEIVABLE", dueDate: { lt: now } },
      _sum: { pendingAmount: true },
    }),
    db.voucher.aggregate({
      where: {
        companyId,
        voucherType: "SALES",
        date: { gte: startOfMonth(now), lte: endOfMonth(now) },
      },
      _sum: { amount: true },
    }),
    db.voucher.aggregate({
      where: {
        companyId,
        voucherType: "SALES",
        date: {
          gte: startOfMonth(subMonths(now, 1)),
          lte: endOfMonth(subMonths(now, 1)),
        },
      },
      _sum: { amount: true },
    }),
    db.ledger.findMany({
      where: {
        companyId,
        OR: [
          { name: { contains: "cash", mode: "insensitive" } },
          { name: { contains: "bank", mode: "insensitive" } },
        ],
      },
      select: { name: true, closingBalance: true, nature: true },
    }),
    db.outstandingBill.groupBy({
      by: ["partyId"],
      where: { companyId, type: "RECEIVABLE" },
      _sum: { pendingAmount: true },
      orderBy: { _sum: { pendingAmount: "desc" } },
      take: 5,
    }),
  ]);

  const topDebtorPartyIds = topDebtorsRaw.map((d) => d.partyId);
  const topDebtorParties = await db.party.findMany({
    where: { id: { in: topDebtorPartyIds } },
    select: { id: true, name: true },
  });

  const topDebtors = topDebtorsRaw.map((d) => ({
    name: topDebtorParties.find((p) => p.id === d.partyId)?.name ?? "Unknown",
    amount: Number(d._sum.pendingAmount ?? 0),
  }));

  const cashBalance = cashLedgers.reduce((acc, l) => {
    const bal = Number(l.closingBalance);
    return acc + (l.nature === "DEBIT" ? bal : -bal);
  }, 0);

  const monthlySales = Number(monthSalesAgg._sum.amount ?? 0);
  const lastMonthSales = Number(lastMonthSalesAgg._sum.amount ?? 0);

  let syncStatus: "SYNCED" | "STALE" | "NEVER" = "NEVER";
  if (company?.lastSyncAt) {
    const hoursDiff = (Date.now() - company.lastSyncAt.getTime()) / (1000 * 60 * 60);
    syncStatus = hoursDiff > 2 ? "STALE" : "SYNCED";
  }

  return {
    totalReceivables: Number(receivablesAgg._sum.pendingAmount ?? 0),
    totalPayables: Number(payablesAgg._sum.pendingAmount ?? 0),
    overdueReceivables: Number(overdueAgg._sum.pendingAmount ?? 0),
    monthlySales,
    lastMonthSales,
    salesGrowthPercent:
      lastMonthSales > 0
        ? Math.round(((monthlySales - lastMonthSales) / lastMonthSales) * 1000) / 10
        : 0,
    cashBalance,
    topDebtors,
    lastSyncAt: company?.lastSyncAt?.toISOString() ?? null,
    syncStatus,
  };
}
