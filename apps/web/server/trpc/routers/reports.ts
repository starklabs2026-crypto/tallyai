import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";
import { z } from "zod";
import { differenceInDays, startOfDay, startOfMonth, endOfMonth, subMonths } from "date-fns";

const INCOME_GROUPS = [
  "Sales Accounts",
  "Income",
  "Other Income",
  "Indirect Income",
  "Direct Income",
  "Revenue",
];
const EXPENSE_GROUPS = [
  "Purchase Accounts",
  "Expenses",
  "Indirect Expenses",
  "Direct Expenses",
  "Duties & Taxes",
  "Manufacturing Expenses",
];
const FIXED_ASSET_GROUPS = ["Fixed Assets", "Capital Work In Progress", "Investments"];

export const reportsRouter = createTRPCRouter({
  getDebtorAging: protectedProcedure
    .input(z.object({ asOfDate: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId;
      const asOf = input.asOfDate ? new Date(input.asOfDate) : new Date();

      const bills = await ctx.db.outstandingBill.findMany({
        where: { companyId, type: "RECEIVABLE" },
        select: {
          billNumber: true,
          billDate: true,
          dueDate: true,
          amount: true,
          pendingAmount: true,
          party: { select: { name: true } },
        },
      });

      const partyMap = new Map<
        string,
        {
          partyName: string;
          bucket0to30: number;
          bucket31to60: number;
          bucket61to90: number;
          bucket91plus: number;
          totalOutstanding: number;
          oldestBillDate: Date | null;
        }
      >();

      for (const bill of bills) {
        const name = bill.party.name;
        const ageDays = differenceInDays(asOf, bill.billDate);
        const pending = Number(bill.pendingAmount);

        if (!partyMap.has(name)) {
          partyMap.set(name, {
            partyName: name,
            bucket0to30: 0,
            bucket31to60: 0,
            bucket61to90: 0,
            bucket91plus: 0,
            totalOutstanding: 0,
            oldestBillDate: null,
          });
        }
        const entry = partyMap.get(name)!;
        entry.totalOutstanding += pending;
        if (!entry.oldestBillDate || bill.billDate < entry.oldestBillDate) {
          entry.oldestBillDate = bill.billDate;
        }
        if (ageDays <= 30) entry.bucket0to30 += pending;
        else if (ageDays <= 60) entry.bucket31to60 += pending;
        else if (ageDays <= 90) entry.bucket61to90 += pending;
        else entry.bucket91plus += pending;
      }

      return Array.from(partyMap.values()).sort(
        (a, b) => b.totalOutstanding - a.totalOutstanding
      );
    }),

  getPayables: protectedProcedure
    .input(z.object({ asOfDate: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId;
      const asOf = input.asOfDate ? new Date(input.asOfDate) : new Date();

      const bills = await ctx.db.outstandingBill.findMany({
        where: { companyId, type: "PAYABLE" },
        select: {
          billNumber: true,
          billDate: true,
          dueDate: true,
          amount: true,
          pendingAmount: true,
          party: { select: { name: true } },
        },
      });

      const partyMap = new Map<
        string,
        {
          partyName: string;
          bucket0to30: number;
          bucket31to60: number;
          bucket61to90: number;
          bucket91plus: number;
          totalOutstanding: number;
          oldestBillDate: Date | null;
          overdue: boolean;
        }
      >();

      for (const bill of bills) {
        const name = bill.party.name;
        const ageDays = differenceInDays(asOf, bill.billDate);
        const pending = Number(bill.pendingAmount);
        const overdue = bill.dueDate ? bill.dueDate < asOf : false;

        if (!partyMap.has(name)) {
          partyMap.set(name, {
            partyName: name,
            bucket0to30: 0,
            bucket31to60: 0,
            bucket61to90: 0,
            bucket91plus: 0,
            totalOutstanding: 0,
            oldestBillDate: null,
            overdue: false,
          });
        }
        const entry = partyMap.get(name)!;
        entry.totalOutstanding += pending;
        if (overdue) entry.overdue = true;
        if (!entry.oldestBillDate || bill.billDate < entry.oldestBillDate) {
          entry.oldestBillDate = bill.billDate;
        }
        if (ageDays <= 30) entry.bucket0to30 += pending;
        else if (ageDays <= 60) entry.bucket31to60 += pending;
        else if (ageDays <= 90) entry.bucket61to90 += pending;
        else entry.bucket91plus += pending;
      }

      return Array.from(partyMap.values()).sort(
        (a, b) => b.totalOutstanding - a.totalOutstanding
      );
    }),

  getSalesRegister: protectedProcedure
    .input(
      z.object({
        fromDate: z.string(),
        toDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId;

      const vouchers = await ctx.db.voucher.findMany({
        where: {
          companyId,
          voucherType: "SALES",
          date: {
            gte: new Date(input.fromDate),
            lte: new Date(input.toDate),
          },
        },
        orderBy: { date: "asc" },
        select: {
          id: true,
          voucherNumber: true,
          date: true,
          partyName: true,
          amount: true,
          narration: true,
        },
      });

      const items = vouchers.map((v) => ({
        ...v,
        amount: Number(v.amount),
      }));

      const total = items.reduce((sum, v) => sum + v.amount, 0);
      const count = items.length;
      const avg = count > 0 ? total / count : 0;

      // Daily breakdown for chart
      const dailyMap = new Map<string, number>();
      for (const v of items) {
        const key = startOfDay(v.date).toISOString();
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + v.amount);
      }
      const dailyBreakdown = Array.from(dailyMap.entries()).map(([date, amount]) => ({
        date,
        amount,
      }));

      // Growth vs last month
      const now = new Date();
      const lastMonthAgg = await ctx.db.voucher.aggregate({
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
      const growthPercent =
        lastMonthTotal > 0
          ? Math.round(((total - lastMonthTotal) / lastMonthTotal) * 1000) / 10
          : 0;

      return { items, total, count, avgTransaction: avg, dailyBreakdown, lastMonthTotal, growthPercent };
    }),

  getProfitLoss: protectedProcedure
    .input(
      z.object({
        fromDate: z.string(),
        toDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId;

      const ledgers = await ctx.db.ledger.findMany({
        where: { companyId },
        select: {
          name: true,
          group: true,
          nature: true,
          openingBalance: true,
          closingBalance: true,
        },
      });

      const income: { group: string; amount: number }[] = [];
      const expenses: { group: string; amount: number }[] = [];

      const incomeGroupMap = new Map<string, number>();
      const expenseGroupMap = new Map<string, number>();

      for (const ledger of ledgers) {
        const activity = Math.abs(
          Number(ledger.closingBalance) - Number(ledger.openingBalance)
        );

        const isIncome = INCOME_GROUPS.some((g) =>
          ledger.group.toLowerCase().includes(g.toLowerCase())
        );
        const isExpense = EXPENSE_GROUPS.some((g) =>
          ledger.group.toLowerCase().includes(g.toLowerCase())
        );

        if (isIncome && ledger.nature === "CREDIT") {
          incomeGroupMap.set(
            ledger.group,
            (incomeGroupMap.get(ledger.group) ?? 0) + activity
          );
        } else if (isExpense && ledger.nature === "DEBIT") {
          expenseGroupMap.set(
            ledger.group,
            (expenseGroupMap.get(ledger.group) ?? 0) + activity
          );
        }
      }

      incomeGroupMap.forEach((amount, group) => income.push({ group, amount }));
      expenseGroupMap.forEach((amount, group) => expenses.push({ group, amount }));

      const totalIncome = income.reduce((s, i) => s + i.amount, 0);
      const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
      const grossProfit = totalIncome - expenses
        .filter((e) =>
          e.group.toLowerCase().includes("purchase") ||
          e.group.toLowerCase().includes("direct")
        )
        .reduce((s, e) => s + e.amount, 0);
      const netProfit = totalIncome - totalExpenses;
      const profitMarginPercent = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

      return {
        income: income.sort((a, b) => b.amount - a.amount),
        expenses: expenses.sort((a, b) => b.amount - a.amount),
        totalIncome,
        totalExpenses,
        grossProfit,
        netProfit,
        profitMarginPercent: Math.round(profitMarginPercent * 10) / 10,
      };
    }),

  getBalanceSheet: protectedProcedure
    .input(z.object({ asOfDate: z.string().optional() }))
    .query(async ({ ctx }) => {
      const companyId = ctx.session.user.companyId;

      const ledgers = await ctx.db.ledger.findMany({
        where: { companyId },
        select: {
          name: true,
          group: true,
          nature: true,
          closingBalance: true,
        },
      });

      const fixedAssets: { name: string; group: string; amount: number }[] = [];
      const currentAssets: { name: string; group: string; amount: number }[] = [];
      const capital: { name: string; group: string; amount: number }[] = [];
      const longTermLiabilities: { name: string; group: string; amount: number }[] = [];
      const currentLiabilities: { name: string; group: string; amount: number }[] = [];

      for (const l of ledgers) {
        const amount = Number(l.closingBalance);
        const entry = { name: l.name, group: l.group, amount };

        if (l.nature === "DEBIT") {
          const isFixed = FIXED_ASSET_GROUPS.some((g) =>
            l.group.toLowerCase().includes(g.toLowerCase())
          );
          if (isFixed) fixedAssets.push(entry);
          else currentAssets.push(entry);
        } else {
          const isCapital = l.group.toLowerCase().includes("capital") ||
            l.group.toLowerCase().includes("reserve");
          const isLongTerm = l.group.toLowerCase().includes("loan") ||
            l.group.toLowerCase().includes("long term");

          if (isCapital) capital.push(entry);
          else if (isLongTerm) longTermLiabilities.push(entry);
          else currentLiabilities.push(entry);
        }
      }

      const totalAssets =
        fixedAssets.reduce((s, i) => s + i.amount, 0) +
        currentAssets.reduce((s, i) => s + i.amount, 0);
      const totalLiabilities =
        capital.reduce((s, i) => s + i.amount, 0) +
        longTermLiabilities.reduce((s, i) => s + i.amount, 0) +
        currentLiabilities.reduce((s, i) => s + i.amount, 0);

      return {
        assets: { fixed: fixedAssets, current: currentAssets },
        liabilities: {
          capital,
          longTerm: longTermLiabilities,
          current: currentLiabilities,
        },
        totalAssets,
        totalLiabilities,
      };
    }),

  getTrialBalance: protectedProcedure
    .input(z.object({ asOfDate: z.string().optional() }))
    .query(async ({ ctx }) => {
      const companyId = ctx.session.user.companyId;

      const ledgers = await ctx.db.ledger.findMany({
        where: { companyId },
        select: {
          name: true,
          group: true,
          nature: true,
          closingBalance: true,
        },
        orderBy: { group: "asc" },
      });

      const rows = ledgers.map((l) => ({
        name: l.name,
        group: l.group,
        debit: l.nature === "DEBIT" ? Number(l.closingBalance) : 0,
        credit: l.nature === "CREDIT" ? Number(l.closingBalance) : 0,
      }));

      const debitTotal = rows.reduce((s, r) => s + r.debit, 0);
      const creditTotal = rows.reduce((s, r) => s + r.credit, 0);
      const balanced = Math.abs(debitTotal - creditTotal) < 0.01;

      return { rows, debitTotal, creditTotal, balanced };
    }),

  getCashFlow: protectedProcedure
    .input(
      z.object({
        fromDate: z.string(),
        toDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId;

      const vouchers = await ctx.db.voucher.findMany({
        where: {
          companyId,
          voucherType: { in: ["RECEIPT", "PAYMENT"] },
          date: {
            gte: new Date(input.fromDate),
            lte: new Date(input.toDate),
          },
        },
        orderBy: { date: "asc" },
        select: {
          date: true,
          voucherType: true,
          amount: true,
        },
      });

      const dailyMap = new Map<
        string,
        { date: string; cashIn: number; cashOut: number }
      >();

      for (const v of vouchers) {
        const key = startOfDay(v.date).toISOString();
        if (!dailyMap.has(key)) {
          dailyMap.set(key, { date: key, cashIn: 0, cashOut: 0 });
        }
        const entry = dailyMap.get(key)!;
        if (v.voucherType === "RECEIPT") entry.cashIn += Number(v.amount);
        else entry.cashOut += Number(v.amount);
      }

      let runningBalance = 0;
      const rows = Array.from(dailyMap.values()).map((d) => {
        const net = d.cashIn - d.cashOut;
        runningBalance += net;
        return { ...d, net, runningBalance };
      });

      const totalCashIn = rows.reduce((s, r) => s + r.cashIn, 0);
      const totalCashOut = rows.reduce((s, r) => s + r.cashOut, 0);

      return { rows, totalCashIn, totalCashOut, netFlow: totalCashIn - totalCashOut };
    }),

  getReceivables: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.session.user.companyId;
    const now = new Date();

    const bills = await ctx.db.outstandingBill.findMany({
      where: { companyId, type: "RECEIVABLE" },
      orderBy: { billDate: "asc" },
      select: {
        id: true,
        billNumber: true,
        billDate: true,
        dueDate: true,
        amount: true,
        pendingAmount: true,
        party: { select: { name: true } },
      },
    });

    return bills
      .map((b) => ({
        id: b.id,
        partyName: b.party.name,
        billNumber: b.billNumber,
        billDate: b.billDate,
        dueDate: b.dueDate,
        amount: Number(b.amount),
        pendingAmount: Number(b.pendingAmount),
        ageDays: differenceInDays(now, b.billDate),
        overdue: b.dueDate ? b.dueDate < now : false,
      }))
      .sort((a, b) => b.ageDays - a.ageDays);
  }),
});
