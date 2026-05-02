import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";
import { startOfMonth, endOfMonth, subMonths } from "date-fns";

export const dashboardRouter = createTRPCRouter({
  getKPIs: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.session.user.companyId;
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
      recentVouchers,
    ] = await Promise.all([
      ctx.db.company.findUnique({
        where: { id: companyId },
        select: { lastSyncAt: true },
      }),

      ctx.db.outstandingBill.aggregate({
        where: { companyId, type: "RECEIVABLE" },
        _sum: { pendingAmount: true },
      }),

      ctx.db.outstandingBill.aggregate({
        where: { companyId, type: "PAYABLE" },
        _sum: { pendingAmount: true },
      }),

      ctx.db.outstandingBill.aggregate({
        where: {
          companyId,
          type: "RECEIVABLE",
          dueDate: { lt: now },
        },
        _sum: { pendingAmount: true },
      }),

      ctx.db.voucher.aggregate({
        where: {
          companyId,
          voucherType: "SALES",
          date: {
            gte: startOfMonth(now),
            lte: endOfMonth(now),
          },
        },
        _sum: { amount: true },
      }),

      ctx.db.voucher.aggregate({
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

      ctx.db.ledger.findMany({
        where: {
          companyId,
          OR: [
            { name: { contains: "cash", mode: "insensitive" } },
            { name: { contains: "bank", mode: "insensitive" } },
          ],
        },
        select: { name: true, closingBalance: true, nature: true },
      }),

      ctx.db.outstandingBill.groupBy({
        by: ["partyId"],
        where: { companyId, type: "RECEIVABLE" },
        _sum: { pendingAmount: true },
        orderBy: { _sum: { pendingAmount: "desc" } },
        take: 5,
      }),

      ctx.db.voucher.findMany({
        where: { companyId },
        orderBy: { date: "desc" },
        take: 10,
        select: {
          id: true,
          voucherNumber: true,
          date: true,
          voucherType: true,
          partyName: true,
          amount: true,
          narration: true,
        },
      }),
    ]);

    // Resolve top debtor party names
    const topDebtorPartyIds = topDebtorsRaw.map((d) => d.partyId);
    const topDebtorParties = await ctx.db.party.findMany({
      where: { id: { in: topDebtorPartyIds } },
      select: { id: true, name: true },
    });

    const topDebtors = topDebtorsRaw.map((d) => {
      const party = topDebtorParties.find((p) => p.id === d.partyId);
      return {
        name: party?.name ?? "Unknown",
        amount: Number(d._sum.pendingAmount ?? 0),
      };
    });

    const monthlySalesTotal = Number(monthSalesAgg._sum.amount ?? 0);
    const lastMonthSalesTotal = Number(lastMonthSalesAgg._sum.amount ?? 0);
    const salesGrowthPercent =
      lastMonthSalesTotal > 0
        ? ((monthlySalesTotal - lastMonthSalesTotal) / lastMonthSalesTotal) * 100
        : 0;

    // Cash balance: sum of DEBIT nature cash/bank ledgers minus CREDIT
    const cashBalance = cashLedgers.reduce((acc, l) => {
      const bal = Number(l.closingBalance);
      return acc + (l.nature === "DEBIT" ? bal : -bal);
    }, 0);

    let syncStatus: "SYNCED" | "STALE" | "NEVER" = "NEVER";
    if (company?.lastSyncAt) {
      const hoursDiff =
        (Date.now() - company.lastSyncAt.getTime()) / (1000 * 60 * 60);
      syncStatus = hoursDiff > 2 ? "STALE" : "SYNCED";
    }

    return {
      totalReceivables: Number(receivablesAgg._sum.pendingAmount ?? 0),
      totalPayables: Number(payablesAgg._sum.pendingAmount ?? 0),
      overdueReceivables: Number(overdueAgg._sum.pendingAmount ?? 0),
      monthlySalesTotal,
      lastMonthSalesTotal,
      salesGrowthPercent: Math.round(salesGrowthPercent * 10) / 10,
      cashBalance,
      topDebtors,
      recentVouchers: recentVouchers.map((v) => ({
        ...v,
        amount: Number(v.amount),
      })),
      lastSyncAt: company?.lastSyncAt ?? null,
      syncStatus,
    };
  }),

  getMonthlySales: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.session.user.companyId;
    const now = new Date();

    const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));

    const results = await Promise.all(
      months.map(async (month) => {
        const agg = await ctx.db.voucher.aggregate({
          where: {
            companyId,
            voucherType: "SALES",
            date: {
              gte: startOfMonth(month),
              lte: endOfMonth(month),
            },
          },
          _sum: { amount: true },
        });
        return {
          month: month.toLocaleString("en-IN", { month: "short", year: "2-digit" }),
          sales: Number(agg._sum.amount ?? 0),
        };
      })
    );

    return results;
  }),
});
