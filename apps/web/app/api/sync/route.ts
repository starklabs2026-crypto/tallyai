import { NextRequest } from "next/server";
import { db } from "@/server/db";
import { z } from "zod";
import { BillType, LedgerNature, PartyType, SyncStatus, VoucherType, Prisma } from "@prisma/client";
import { differenceInMinutes } from "date-fns";

const ledgerSchema = z.object({
  name: z.string(),
  group: z.string(),
  openingBalance: z.number().default(0),
  closingBalance: z.number().default(0),
  nature: z.enum(["DEBIT", "CREDIT"]),
  asOfDate: z.string(),
});

const voucherSchema = z.object({
  voucherNumber: z.string(),
  date: z.string(),
  voucherType: z.enum(["SALES", "PURCHASE", "RECEIPT", "PAYMENT", "JOURNAL", "CONTRA"]),
  narration: z.string().optional().nullable(),
  amount: z.number(),
  partyName: z.string().optional().nullable(),
  ledgerEntries: z.array(z.unknown()).default([]),
});

const partySchema = z.object({
  name: z.string(),
  group: z.string().optional().nullable(),
  type: z.enum(["DEBTOR", "CREDITOR", "BOTH"]),
  openingBalance: z.number().default(0),
  closingBalance: z.number().default(0),
  creditLimit: z.number().optional().nullable(),
  creditDays: z.number().optional().nullable(),
  asOfDate: z.string(),
});

const outstandingBillSchema = z.object({
  partyName: z.string(),
  billNumber: z.string(),
  billDate: z.string(),
  dueDate: z.string().optional().nullable(),
  amount: z.number(),
  pendingAmount: z.number(),
  type: z.enum(["PAYABLE", "RECEIVABLE"]),
});

const stockItemSchema = z.object({
  name: z.string(),
  group: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  openingQty: z.number().default(0),
  closingQty: z.number().default(0),
  rate: z.number().default(0),
  value: z.number().default(0),
  asOfDate: z.string(),
});

const syncBodySchema = z.object({
  ledgers: z.array(ledgerSchema).default([]),
  vouchers: z.array(voucherSchema).default([]),
  parties: z.array(partySchema).default([]),
  outstandingBills: z.array(outstandingBillSchema).default([]),
  stockItems: z.array(stockItemSchema).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return Response.json({ error: "Missing authorization" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const company = await db.company.findUnique({
      where: { syncToken: token },
      select: { id: true, lastSyncAt: true },
    });

    if (!company) {
      return Response.json({ error: "Invalid sync token" }, { status: 401 });
    }

    // Rate limit: 1 request per 5 minutes per company
    if (company.lastSyncAt) {
      const minutesAgo = differenceInMinutes(new Date(), company.lastSyncAt);
      if (minutesAgo < 5) {
        return Response.json(
          { error: `Rate limit: wait ${5 - minutesAgo} more minutes` },
          { status: 429 }
        );
      }
    }

    const rawBody = await req.json() as unknown;
    const parsed = syncBodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { ledgers, vouchers, parties, outstandingBills, stockItems } = parsed.data;
    const companyId = company.id;
    let totalUpserted = 0;

    await db.$transaction(async (tx) => {
      // 1. Upsert ledgers
      for (const l of ledgers) {
        await tx.ledger.upsert({
          where: { companyId_name: { companyId, name: l.name } },
          create: {
            companyId,
            name: l.name,
            group: l.group,
            openingBalance: l.openingBalance,
            closingBalance: l.closingBalance,
            nature: l.nature as LedgerNature,
            asOfDate: new Date(l.asOfDate),
          },
          update: {
            group: l.group,
            openingBalance: l.openingBalance,
            closingBalance: l.closingBalance,
            nature: l.nature as LedgerNature,
            asOfDate: new Date(l.asOfDate),
          },
        });
      }
      totalUpserted += ledgers.length;

      // 2. Upsert vouchers
      for (const v of vouchers) {
        await tx.voucher.upsert({
          where: { companyId_voucherNumber: { companyId, voucherNumber: v.voucherNumber } },
          create: {
            companyId,
            voucherNumber: v.voucherNumber,
            date: new Date(v.date),
            voucherType: v.voucherType as VoucherType,
            narration: v.narration,
            amount: v.amount,
            partyName: v.partyName,
            ledgerEntries: v.ledgerEntries as Prisma.InputJsonValue,
          },
          update: {
            date: new Date(v.date),
            voucherType: v.voucherType as VoucherType,
            narration: v.narration,
            amount: v.amount,
            partyName: v.partyName,
            ledgerEntries: v.ledgerEntries as Prisma.InputJsonValue,
          },
        });
      }
      totalUpserted += vouchers.length;

      // 3. Upsert parties (must happen before outstanding bills)
      for (const p of parties) {
        await tx.party.upsert({
          where: { companyId_name: { companyId, name: p.name } },
          create: {
            companyId,
            name: p.name,
            group: p.group,
            type: p.type as PartyType,
            openingBalance: p.openingBalance,
            closingBalance: p.closingBalance,
            creditLimit: p.creditLimit,
            creditDays: p.creditDays,
            asOfDate: new Date(p.asOfDate),
          },
          update: {
            group: p.group,
            type: p.type as PartyType,
            openingBalance: p.openingBalance,
            closingBalance: p.closingBalance,
            creditLimit: p.creditLimit,
            creditDays: p.creditDays,
            asOfDate: new Date(p.asOfDate),
          },
        });
      }
      totalUpserted += parties.length;

      // 4. Upsert outstanding bills (resolve partyId by name)
      for (const b of outstandingBills) {
        const party = await tx.party.findUnique({
          where: { companyId_name: { companyId, name: b.partyName } },
          select: { id: true },
        });

        // Auto-create party if not found (debtors/creditors may not be in parties list)
        let partyId: string;
        if (!party) {
          const newParty = await tx.party.upsert({
            where: { companyId_name: { companyId, name: b.partyName } },
            create: {
              companyId,
              name: b.partyName,
              type: b.type === "RECEIVABLE" ? "DEBTOR" : "CREDITOR",
              openingBalance: 0,
              closingBalance: b.pendingAmount,
              asOfDate: new Date(b.billDate),
            },
            update: {},
          });
          partyId = newParty.id;
        } else {
          partyId = party.id;
        }

        await tx.outstandingBill.upsert({
          where: {
            companyId_billNumber_type: {
              companyId,
              billNumber: b.billNumber,
              type: b.type as BillType,
            },
          },
          create: {
            companyId,
            partyId,
            billNumber: b.billNumber,
            billDate: new Date(b.billDate),
            dueDate: b.dueDate ? new Date(b.dueDate) : null,
            amount: b.amount,
            pendingAmount: b.pendingAmount,
            type: b.type as BillType,
          },
          update: {
            partyId,
            billDate: new Date(b.billDate),
            dueDate: b.dueDate ? new Date(b.dueDate) : null,
            amount: b.amount,
            pendingAmount: b.pendingAmount,
          },
        });
      }
      totalUpserted += outstandingBills.length;

      // 5. Upsert stock items
      for (const s of stockItems) {
        await tx.stockItem.upsert({
          where: { companyId_name: { companyId, name: s.name } },
          create: {
            companyId,
            name: s.name,
            group: s.group,
            unit: s.unit,
            openingQty: s.openingQty,
            closingQty: s.closingQty,
            rate: s.rate,
            value: s.value,
            asOfDate: new Date(s.asOfDate),
          },
          update: {
            group: s.group,
            unit: s.unit,
            openingQty: s.openingQty,
            closingQty: s.closingQty,
            rate: s.rate,
            value: s.value,
            asOfDate: new Date(s.asOfDate),
          },
        });
      }
      totalUpserted += stockItems.length;

      // 6. Update company lastSyncAt
      await tx.company.update({
        where: { id: companyId },
        data: { lastSyncAt: new Date() },
      });

      // 7. Create sync log
      await tx.syncLog.create({
        data: {
          companyId,
          status: SyncStatus.SUCCESS,
          recordsUpserted: totalUpserted,
        },
      });
    });

    return Response.json({ success: true, upserted: totalUpserted });
  } catch (error) {
    console.error("Sync error:", error);

    const errMsg = error instanceof Error ? error.message : "Unknown error";

    // Try to log the failure (best-effort — may fail if company lookup failed)
    try {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const company = await db.company.findUnique({
          where: { syncToken: token },
          select: { id: true },
        });
        if (company) {
          await db.syncLog.create({
            data: {
              companyId: company.id,
              status: SyncStatus.FAILED,
              recordsUpserted: 0,
              error: errMsg,
            },
          });
        }
      }
    } catch {
      // ignore logging failure
    }

    return Response.json({ error: "Sync failed", message: errMsg }, { status: 500 });
  }
}
