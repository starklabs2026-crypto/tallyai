import { sendTallyRequest } from "../tally-client";
import { parseTallyXml, parseTallyDate, parseAmount, safeString } from "../xml-parser";

export interface LedgerData {
  name: string;
  group: string;
  openingBalance: number;
  closingBalance: number;
  nature: "DEBIT" | "CREDIT";
  asOfDate: string;
}

const LEDGER_REQUEST = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>List of Ledgers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

export async function fetchLedgers(tallyUrl?: string): Promise<LedgerData[]> {
  const xml = await sendTallyRequest(LEDGER_REQUEST, tallyUrl);
  const parsed = parseTallyXml(xml);
  const asOfDate = new Date().toISOString().split("T")[0]!;

  const envelope = parsed["ENVELOPE"] as Record<string, unknown> | undefined;
  const body = envelope?.["BODY"] as Record<string, unknown> | undefined;
  const data = body?.["DATA"] as Record<string, unknown> | undefined;
  const tallyMsg = data?.["TALLYMESSAGE"] as Record<string, unknown> | undefined;
  const ledgerList =
    (tallyMsg?.["LEDGER"] as Record<string, unknown>[] | undefined) ?? [];

  const results: LedgerData[] = [];

  for (const l of ledgerList) {
    const name = safeString(l["NAME"] ?? l["@_NAME"]);
    if (!name) continue;

    const group = safeString(l["PARENT"] ?? l["GROUP"]) || "Unknown";
    const closingRaw = parseAmount(l["CLOSINGBALANCE"] as string | number | undefined);
    const openingRaw = parseAmount(l["OPENINGBALANCE"] as string | number | undefined);

    // Determine nature from amount sign or explicit field
    const nature: "DEBIT" | "CREDIT" = closingRaw < 0 ? "CREDIT" : "DEBIT";

    results.push({
      name,
      group,
      openingBalance: Math.abs(openingRaw),
      closingBalance: Math.abs(closingRaw),
      nature,
      asOfDate,
    });
  }

  return results;
}
