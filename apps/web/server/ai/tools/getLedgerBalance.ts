import { db } from "@/server/db";

export async function getLedgerBalance({
  companyId,
  ledgerName,
}: {
  companyId: string;
  ledgerName: string;
}) {
  const ledgers = await db.ledger.findMany({
    where: {
      companyId,
      name: { contains: ledgerName, mode: "insensitive" },
    },
    select: {
      name: true,
      group: true,
      nature: true,
      closingBalance: true,
      asOfDate: true,
    },
    take: 5,
  });

  if (ledgers.length === 0) {
    return { found: false, ledgerName, message: `No ledger found matching "${ledgerName}"` };
  }

  return {
    found: true,
    results: ledgers.map((l) => ({
      name: l.name,
      group: l.group,
      nature: l.nature,
      closingBalance: Number(l.closingBalance),
      asOfDate: l.asOfDate.toISOString(),
    })),
  };
}
