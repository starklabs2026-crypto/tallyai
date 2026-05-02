import { sendTallyRequest } from "../tally-client";
import { parseTallyXml, parseTallyDate, parseAmount, safeString } from "../xml-parser";
import { format, subDays } from "date-fns";

export interface VoucherData {
  voucherNumber: string;
  date: string;
  voucherType: "SALES" | "PURCHASE" | "RECEIPT" | "PAYMENT" | "JOURNAL" | "CONTRA";
  narration?: string;
  amount: number;
  partyName?: string;
  ledgerEntries: unknown[];
}

const VOUCHER_TYPE_MAP: Record<string, VoucherData["voucherType"]> = {
  "Sales": "SALES",
  "Purchase": "PURCHASE",
  "Receipt": "RECEIPT",
  "Payment": "PAYMENT",
  "Journal": "JOURNAL",
  "Contra": "CONTRA",
};

function buildDaybookRequest(fromDate: string, toDate: string): string {
  return `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Day Book</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVFROMDATE>${fromDate}</SVFROMDATE>
        <SVTODATE>${toDate}</SVTODATE>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;
}

export async function fetchVouchers(tallyUrl?: string, daysBack = 90): Promise<VoucherData[]> {
  const toDate = format(new Date(), "yyyyMMdd");
  const fromDate = format(subDays(new Date(), daysBack), "yyyyMMdd");

  const xml = await sendTallyRequest(buildDaybookRequest(fromDate, toDate), tallyUrl);
  const parsed = parseTallyXml(xml);

  const envelope = parsed["ENVELOPE"] as Record<string, unknown> | undefined;
  const body = envelope?.["BODY"] as Record<string, unknown> | undefined;
  const data = body?.["DATA"] as Record<string, unknown> | undefined;
  const tallyMsg = data?.["TALLYMESSAGE"] as Record<string, unknown> | undefined;
  const voucherList =
    (tallyMsg?.["VOUCHER"] as Record<string, unknown>[] | undefined) ?? [];

  const results: VoucherData[] = [];

  for (const v of voucherList) {
    const voucherNumber = safeString(v["VOUCHERNUMBER"] ?? v["ALTEREDON"]) ||
      `V-${Date.now()}`;
    const dateStr = safeString(v["DATE"]);
    const typeName = safeString(v["VOUCHERTYPENAME"]);
    const narration = safeString(v["NARRATION"] ?? v["BASICNARRATION"]);
    const partyName = safeString(v["PARTYLEDGERNAME"]);

    const voucherType = VOUCHER_TYPE_MAP[typeName];
    if (!voucherType) continue; // Skip unknown types

    const amount = Math.abs(parseAmount(v["AMOUNT"] as string | number | undefined));

    // Parse ledger entries
    const ledgerEntries = ((v["ALLLEDGERENTRIES.LIST"] ??
      v["LEDGERENTRIES.LIST"]) as Record<string, unknown>[] | undefined) ?? [];

    results.push({
      voucherNumber,
      date: parseTallyDate(dateStr),
      voucherType,
      narration: narration || undefined,
      amount,
      partyName: partyName || undefined,
      ledgerEntries,
    });
  }

  return results;
}
