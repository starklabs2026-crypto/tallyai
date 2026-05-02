import type { LedgerData } from "./requests/ledgers";
import type { VoucherData } from "./requests/vouchers";
import type { PartyData, OutstandingBillData } from "./requests/parties";
import type { StockItemData } from "./requests/stock";

interface SyncPayload {
  ledgers: LedgerData[];
  vouchers: VoucherData[];
  parties: PartyData[];
  outstandingBills: OutstandingBillData[];
  stockItems: StockItemData[];
}

interface SyncResult {
  success: boolean;
  upserted: number;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pushToAPI(
  payload: SyncPayload,
  platformUrl: string,
  syncToken: string,
  retries = 3
): Promise<SyncResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(`${platformUrl}/api/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${syncToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 429) {
        const body = await response.json() as { error: string };
        throw new Error(`Rate limited: ${body.error}`);
      }

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`API error ${response.status}: ${body}`);
      }

      return await response.json() as SyncResult;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < retries) {
        console.log(`  Retry ${attempt}/${retries - 1} after 5s...`);
        await sleep(5000);
      }
    }
  }

  throw lastError ?? new Error("All retries failed");
}
