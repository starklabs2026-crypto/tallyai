import { sendTallyRequest } from "../tally-client";
import { parseTallyXml, parseTallyDate, parseAmount, safeString } from "../xml-parser";

export interface PartyData {
  name: string;
  group?: string;
  type: "DEBTOR" | "CREDITOR" | "BOTH";
  openingBalance: number;
  closingBalance: number;
  creditLimit?: number;
  creditDays?: number;
  asOfDate: string;
}

export interface OutstandingBillData {
  partyName: string;
  billNumber: string;
  billDate: string;
  dueDate?: string;
  amount: number;
  pendingAmount: number;
  type: "PAYABLE" | "RECEIVABLE";
}

const RECEIVABLES_REQUEST = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>BillOutstanding</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION ISMODIFY="No" ISFIXED="No" ISOPTION="No" ISINTERNAL="No" NAME="BillOutstanding">
            <TYPE>LedgerVouchers</TYPE>
            <BELONGSTO>Sundry Debtors</BELONGSTO>
            <FETCH>Name, BillDate, Amount, PendingAmount, BillCreditPeriod, VoucherTypeName</FETCH>
            <FILTER>IsOutstanding</FILTER>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="IsOutstanding">$PendingAmount != 0</SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

const PAYABLES_REQUEST = `<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Collection</TYPE>
    <ID>BillOutstandingPayable</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
      <TDL>
        <TDLMESSAGE>
          <COLLECTION ISMODIFY="No" ISFIXED="No" ISOPTION="No" ISINTERNAL="No" NAME="BillOutstandingPayable">
            <TYPE>LedgerVouchers</TYPE>
            <BELONGSTO>Sundry Creditors</BELONGSTO>
            <FETCH>Name, BillDate, Amount, PendingAmount, BillCreditPeriod, VoucherTypeName</FETCH>
            <FILTER>IsOutstanding</FILTER>
          </COLLECTION>
          <SYSTEM TYPE="Formulae" NAME="IsOutstanding">$PendingAmount != 0</SYSTEM>
        </TDLMESSAGE>
      </TDL>
    </DESC>
  </BODY>
</ENVELOPE>`;

function parseBills(
  xml: string,
  type: "PAYABLE" | "RECEIVABLE"
): OutstandingBillData[] {
  const parsed = parseTallyXml(xml);
  const asOfDate = new Date().toISOString().split("T")[0]!;

  const envelope = parsed["ENVELOPE"] as Record<string, unknown> | undefined;
  const body = envelope?.["BODY"] as Record<string, unknown> | undefined;
  const data = body?.["DATA"] as Record<string, unknown> | undefined;
  const tallyMsg = data?.["TALLYMESSAGE"] as Record<string, unknown> | undefined;

  // Tally outstanding format varies — try both DSPACCNAME and generic
  const rows =
    (tallyMsg?.["DSPACCNAME"] as Record<string, unknown>[] | undefined) ??
    (tallyMsg?.["LEDGER"] as Record<string, unknown>[] | undefined) ??
    [];

  const bills: OutstandingBillData[] = [];

  for (const row of rows) {
    const partyName = safeString(row["NAME"] ?? row["LEDGERNAME"] ?? row["@_NAME"]);
    if (!partyName) continue;

    // Bills can be nested under DSPBILLALLOCATIONLIST or similar
    const billList =
      (row["DSPBILLALLOCATIONLIST"] as Record<string, unknown>[] | undefined) ??
      (row["BILLALLOCATIONS.LIST"] as Record<string, unknown>[] | undefined) ??
      [];

    if (billList.length === 0) {
      // Treat the row itself as a bill
      const amount = Math.abs(parseAmount(row["AMOUNT"] as string | number | undefined));
      if (amount > 0) {
        const billDate = parseTallyDate(row["DATE"] as string | undefined ?? asOfDate);
        bills.push({
          partyName,
          billNumber: safeString(row["BILLNO"] ?? row["NAME"]) || `${partyName}-1`,
          billDate,
          dueDate: parseTallyDate(row["DUEDATE"] as string | undefined) || undefined,
          amount,
          pendingAmount: amount,
          type,
        });
      }
      continue;
    }

    for (const bill of billList) {
      const billNumber = safeString(bill["BILLNO"] ?? bill["NAME"]);
      const amount = Math.abs(parseAmount(bill["AMOUNT"] as string | number | undefined));
      if (!billNumber || amount === 0) continue;

      const billDate = parseTallyDate(
        (bill["BILLDATE"] ?? bill["DATE"]) as string | undefined
      );
      const dueDate = parseTallyDate(
        (bill["DUEDATE"] ?? bill["BILLDATE"]) as string | undefined
      );

      bills.push({
        partyName,
        billNumber,
        billDate,
        dueDate: dueDate || undefined,
        amount,
        pendingAmount: Math.abs(
          parseAmount(bill["PENDINGAMOUNT"] as string | number | undefined)
        ) || amount,
        type,
      });
    }
  }

  return bills;
}

export async function fetchOutstandingBills(
  tallyUrl?: string
): Promise<OutstandingBillData[]> {
  const [receivablesXml, payablesXml] = await Promise.all([
    sendTallyRequest(RECEIVABLES_REQUEST, tallyUrl),
    sendTallyRequest(PAYABLES_REQUEST, tallyUrl),
  ]);

  const receivables = parseBills(receivablesXml, "RECEIVABLE");
  const payables = parseBills(payablesXml, "PAYABLE");

  return [...receivables, ...payables];
}

export async function fetchParties(tallyUrl?: string): Promise<PartyData[]> {
  // Extract unique parties from outstanding bills
  const bills = await fetchOutstandingBills(tallyUrl);
  const asOfDate = new Date().toISOString().split("T")[0]!;

  const partyMap = new Map<string, PartyData>();

  for (const bill of bills) {
    const existing = partyMap.get(bill.partyName);
    const type = bill.type === "RECEIVABLE" ? "DEBTOR" : "CREDITOR";

    if (existing) {
      // If party appears in both receivables and payables, mark as BOTH
      if (existing.type !== type) {
        existing.type = "BOTH";
      }
      existing.closingBalance += bill.pendingAmount;
    } else {
      partyMap.set(bill.partyName, {
        name: bill.partyName,
        type,
        openingBalance: 0,
        closingBalance: bill.pendingAmount,
        asOfDate,
      });
    }
  }

  return Array.from(partyMap.values());
}
