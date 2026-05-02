import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: true,
  parseAttributeValue: true,
  trimValues: true,
  isArray: (name) => {
    // Force these to always be arrays
    return [
      "LEDGER",
      "VOUCHER",
      "ALLLEDGERENTRIES.LIST",
      "LEDGERENTRIES.LIST",
      "STOCKITEM",
      "DSPACCNAME",
    ].includes(name);
  },
});

export function parseTallyXml(xml: string): Record<string, unknown> {
  try {
    return parser.parse(xml) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function parseTallyDate(dateStr: string | number | undefined): string {
  if (!dateStr) return new Date().toISOString();
  const str = String(dateStr).replace(/\D/g, "");
  if (str.length === 8) {
    // YYYYMMDD format
    const year = str.substring(0, 4);
    const month = str.substring(4, 6);
    const day = str.substring(6, 8);
    return `${year}-${month}-${day}`;
  }
  return new Date().toISOString();
}

export function parseAmount(val: string | number | undefined): number {
  if (val === undefined || val === null || val === "") return 0;
  const str = String(val).replace(/,/g, "").trim();
  // Tally stores negative amounts as "Dr" suffix for debit
  const isDebit = str.endsWith(" Dr");
  const isCredit = str.endsWith(" Cr");
  const numStr = str.replace(/ (Dr|Cr)$/, "").trim();
  const num = parseFloat(numStr) || 0;
  // For balances: Cr is positive (liability/income), Dr is negative in standard convention
  // But for amounts we just return absolute value — caller decides sign
  if (isDebit) return -Math.abs(num);
  if (isCredit) return Math.abs(num);
  return num;
}

export function safeString(val: unknown): string {
  if (val === undefined || val === null) return "";
  return String(val).trim();
}
