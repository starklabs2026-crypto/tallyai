import { sendTallyRequest } from "../tally-client";
import { parseTallyXml, parseTallyDate, parseAmount, safeString } from "../xml-parser";

export interface StockItemData {
  name: string;
  group?: string;
  unit?: string;
  openingQty: number;
  closingQty: number;
  rate: number;
  value: number;
  asOfDate: string;
}

const STOCK_REQUEST = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Stock Summary</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

export async function fetchStockItems(tallyUrl?: string): Promise<StockItemData[]> {
  const xml = await sendTallyRequest(STOCK_REQUEST, tallyUrl);
  const parsed = parseTallyXml(xml);
  const asOfDate = new Date().toISOString().split("T")[0]!;

  const envelope = parsed["ENVELOPE"] as Record<string, unknown> | undefined;
  const body = envelope?.["BODY"] as Record<string, unknown> | undefined;
  const data = body?.["DATA"] as Record<string, unknown> | undefined;
  const tallyMsg = data?.["TALLYMESSAGE"] as Record<string, unknown> | undefined;
  const stockList =
    (tallyMsg?.["STOCKITEM"] as Record<string, unknown>[] | undefined) ?? [];

  const results: StockItemData[] = [];

  for (const s of stockList) {
    const name = safeString(s["NAME"] ?? s["@_NAME"]);
    if (!name) continue;

    const group = safeString(s["PARENT"] ?? s["GROUP"]);
    const unit = safeString(s["BASEUNITS"] ?? s["UNITS"]);
    const closingQty = parseAmount(s["CLOSINGQTY"] as string | number | undefined);
    const openingQty = parseAmount(s["OPENINGQTY"] as string | number | undefined);
    const rate = parseAmount(s["RATE"] as string | number | undefined);
    const value = parseAmount(s["CLOSINGVALUE"] as string | number | undefined);

    results.push({
      name,
      group: group || undefined,
      unit: unit || undefined,
      openingQty: Math.abs(openingQty),
      closingQty: Math.abs(closingQty),
      rate: Math.abs(rate),
      value: Math.abs(value),
      asOfDate,
    });
  }

  return results;
}
