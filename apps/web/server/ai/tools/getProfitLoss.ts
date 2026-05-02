import { db } from "@/server/db";
import { startOfMonth, endOfMonth } from "date-fns";

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

export async function getProfitLoss({
  companyId,
  fromDate,
  toDate,
}: {
  companyId: string;
  fromDate?: string;
  toDate?: string;
}) {
  const now = new Date();
  const _from = fromDate ? new Date(fromDate) : startOfMonth(now);
  const _to = toDate ? new Date(toDate) : endOfMonth(now);

  const ledgers = await db.ledger.findMany({
    where: { companyId },
    select: {
      name: true,
      group: true,
      nature: true,
      openingBalance: true,
      closingBalance: true,
    },
  });

  const incomeGroupMap = new Map<string, number>();
  const expenseGroupMap = new Map<string, number>();

  for (const l of ledgers) {
    const activity = Math.abs(
      Number(l.closingBalance) - Number(l.openingBalance)
    );
    const isIncome = INCOME_GROUPS.some((g) =>
      l.group.toLowerCase().includes(g.toLowerCase())
    );
    const isExpense = EXPENSE_GROUPS.some((g) =>
      l.group.toLowerCase().includes(g.toLowerCase())
    );

    if (isIncome && l.nature === "CREDIT") {
      incomeGroupMap.set(l.group, (incomeGroupMap.get(l.group) ?? 0) + activity);
    } else if (isExpense && l.nature === "DEBIT") {
      expenseGroupMap.set(l.group, (expenseGroupMap.get(l.group) ?? 0) + activity);
    }
  }

  const income = Array.from(incomeGroupMap.entries()).map(([group, amount]) => ({
    group,
    amount,
  }));
  const expenses = Array.from(expenseGroupMap.entries()).map(([group, amount]) => ({
    group,
    amount,
  }));

  const totalIncome = income.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  return {
    income: income.sort((a, b) => b.amount - a.amount),
    expenses: expenses.sort((a, b) => b.amount - a.amount),
    totalIncome,
    totalExpenses,
    netProfit,
    profitMarginPercent:
      totalIncome > 0 ? Math.round((netProfit / totalIncome) * 1000) / 10 : 0,
  };
}
