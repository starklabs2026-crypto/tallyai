import { db } from "@/server/db";
import { differenceInDays } from "date-fns";

export async function getPayables({
  companyId,
  asOfDate,
}: {
  companyId: string;
  asOfDate?: string;
}) {
  const asOf = asOfDate ? new Date(asOfDate) : new Date();

  const bills = await db.outstandingBill.findMany({
    where: { companyId, type: "PAYABLE" },
    select: {
      billNumber: true,
      billDate: true,
      dueDate: true,
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
        overdue: false,
      });
    }
    const entry = partyMap.get(name)!;
    entry.totalOutstanding += pending;
    if (overdue) entry.overdue = true;
    if (ageDays <= 30) entry.bucket0to30 += pending;
    else if (ageDays <= 60) entry.bucket31to60 += pending;
    else if (ageDays <= 90) entry.bucket61to90 += pending;
    else entry.bucket91plus += pending;
  }

  return Array.from(partyMap.values())
    .sort((a, b) => b.totalOutstanding - a.totalOutstanding)
    .slice(0, 20);
}
