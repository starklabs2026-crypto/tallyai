import "dotenv/config";
import { z } from "zod";
import { fetchLedgers } from "./requests/ledgers";
import { fetchVouchers } from "./requests/vouchers";
import { fetchParties, fetchOutstandingBills } from "./requests/parties";
import { fetchStockItems } from "./requests/stock";
import { pushToAPI } from "./sync";
import { TallyOfflineError } from "./tally-client";

// Validate config from environment
const configSchema = z.object({
  PLATFORM_URL: z.string().url("PLATFORM_URL must be a valid URL"),
  SYNC_TOKEN: z.string().min(1, "SYNC_TOKEN is required"),
  SYNC_INTERVAL_MINUTES: z.coerce.number().min(1).max(60).default(15),
  TALLY_URL: z.string().url().default("http://localhost:9000"),
});

const configResult = configSchema.safeParse(process.env);
if (!configResult.success) {
  console.error("❌ Configuration error:");
  configResult.error.errors.forEach((e) => {
    console.error(`  ${e.path.join(".")}: ${e.message}`);
  });
  console.error("\nCreate a .env file based on .env.example and fill in your values.");
  process.exit(1);
}

const config = configResult.data;

console.log("╔═══════════════════════════════════╗");
console.log("║     TallyAI Connector v1.0.0      ║");
console.log("╚═══════════════════════════════════╝");
console.log(`Platform URL:    ${config.PLATFORM_URL}`);
console.log(`Tally URL:       ${config.TALLY_URL}`);
console.log(`Sync interval:   ${config.SYNC_INTERVAL_MINUTES} minutes`);
console.log(`Token prefix:    ${config.SYNC_TOKEN.substring(0, 8)}...`);
console.log("");

async function syncCycle(): Promise<void> {
  const timestamp = new Date().toLocaleString("en-IN");
  console.log(`[${timestamp}] Starting sync cycle...`);

  try {
    // Fetch all data types in parallel (best effort — individual failures don't block others)
    const [ledgersResult, vouchersResult, partiesResult, billsResult, stockResult] =
      await Promise.allSettled([
        fetchLedgers(config.TALLY_URL),
        fetchVouchers(config.TALLY_URL),
        fetchParties(config.TALLY_URL),
        fetchOutstandingBills(config.TALLY_URL),
        fetchStockItems(config.TALLY_URL),
      ]);

    // Check if Tally is offline (any of the core requests failed with TallyOfflineError)
    for (const result of [ledgersResult, vouchersResult]) {
      if (
        result.status === "rejected" &&
        result.reason instanceof TallyOfflineError
      ) {
        console.log(`  ⚠ Tally Prime is offline. Will retry in ${config.SYNC_INTERVAL_MINUTES} minutes.`);
        return;
      }
    }

    const ledgers = ledgersResult.status === "fulfilled" ? ledgersResult.value : [];
    const vouchers = vouchersResult.status === "fulfilled" ? vouchersResult.value : [];
    const parties = partiesResult.status === "fulfilled" ? partiesResult.value : [];
    const outstandingBills = billsResult.status === "fulfilled" ? billsResult.value : [];
    const stockItems = stockResult.status === "fulfilled" ? stockResult.value : [];

    if (ledgersResult.status === "rejected") {
      console.log(`  ⚠ Ledgers: ${(ledgersResult.reason as Error).message}`);
    } else {
      console.log(`  ✓ Ledgers: ${ledgers.length} records`);
    }
    if (vouchersResult.status === "rejected") {
      console.log(`  ⚠ Vouchers: ${(vouchersResult.reason as Error).message}`);
    } else {
      console.log(`  ✓ Vouchers: ${vouchers.length} records`);
    }
    if (billsResult.status === "rejected") {
      console.log(`  ⚠ Outstanding bills: ${(billsResult.reason as Error).message}`);
    } else {
      console.log(`  ✓ Outstanding bills: ${outstandingBills.length} records`);
    }
    console.log(`  ✓ Stock items: ${stockItems.length} records`);

    console.log(`  Pushing to ${config.PLATFORM_URL}...`);
    const result = await pushToAPI(
      { ledgers, vouchers, parties, outstandingBills, stockItems },
      config.PLATFORM_URL,
      config.SYNC_TOKEN
    );

    console.log(`  ✅ Sync complete. Upserted ${result.upserted} records.`);
  } catch (err) {
    if (err instanceof TallyOfflineError) {
      console.log(`  ⚠ Tally Prime is offline. Will retry in ${config.SYNC_INTERVAL_MINUTES} minutes.`);
    } else {
      console.error(`  ❌ Sync failed:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`  Next sync in ${config.SYNC_INTERVAL_MINUTES} minutes.\n`);
}

// Run first cycle immediately
void syncCycle();

// Then on interval
const intervalMs = config.SYNC_INTERVAL_MINUTES * 60 * 1000;
setInterval(() => void syncCycle(), intervalMs);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\nConnector stopped.");
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log("\nConnector stopped.");
  process.exit(0);
});
