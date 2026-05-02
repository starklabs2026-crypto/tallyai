# TallyAI Tally Connector

Syncs your local Tally Prime data to the TallyAI platform automatically.

## Prerequisites

- **Node.js 18+** installed on the machine running Tally
- **Tally Prime** (any version) open with your company loaded
- **XML over HTTP** enabled in Tally (see Step 1 below)

## Setup

### Step 1 — Enable XML Server in Tally Prime

1. Open Tally Prime with your company
2. Go to **Gateway of Tally** (main screen)
3. Press **F12** (Configure) → **Advanced Configuration**
4. Find **"Enable TallyPrime as XML Server"** → set to **Yes**
5. Ensure **Port** is set to **9000** (or note the port for your `.env`)
6. Press **Enter** to save

> If you don't see this option, try: **Help → TDL & Add-On → TDL Configuration**

### Step 2 — Install the connector

```bash
# Clone the TallyAI repository (or download just this package)
git clone https://github.com/your-org/tallyai.git
cd tallyai/packages/tally-connector

# Install dependencies
npm install
```

### Step 3 — Configure environment

```bash
# Copy the example config
cp .env.example .env
```

Edit `.env` with your values:

```env
# Your TallyAI platform URL
PLATFORM_URL=https://your-app.railway.app

# From TallyAI dashboard: Settings → Connector
SYNC_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Sync interval in minutes (default: 15, minimum: 5)
SYNC_INTERVAL_MINUTES=15
```

**How to get your sync token:**
1. Log in to TallyAI
2. Go to **Settings → Connector**
3. Copy the sync token shown there

### Step 4 — Start the connector

```bash
# Development mode (auto-restart on file changes)
npm start

# Production mode (recommended for always-on)
npm run build
npm run start:prod
```

You should see:

```
╔═══════════════════════════════════╗
║     TallyAI Connector v1.0.0      ║
╚═══════════════════════════════════╝
Platform URL:    https://your-app.railway.app
Sync interval:   15 minutes

[01 May 2026, 10:30:00] Starting sync cycle...
  ✓ Ledgers: 142 records
  ✓ Vouchers: 89 records
  ✓ Outstanding bills: 23 records
  ✓ Stock items: 56 records
  Pushing to https://your-app.railway.app...
  ✅ Sync complete. Upserted 310 records.
  Next sync in 15 minutes.
```

## Running as a Background Service (Windows)

To run the connector automatically on Windows startup:

**Using Task Scheduler:**
1. Open Task Scheduler
2. Create a new task
3. Trigger: At log on
4. Action: `node C:\path\to\tally-connector\dist\index.js`
5. Start in: `C:\path\to\tally-connector`

**Using NSSM (Non-Sucking Service Manager):**
```cmd
nssm install TallyAIConnector "C:\Program Files\nodejs\node.exe"
nssm set TallyAIConnector AppParameters "dist\index.js"
nssm set TallyAIConnector AppDirectory "C:\path\to\tally-connector"
nssm start TallyAIConnector
```

## Troubleshooting

**"Tally Prime is offline"**  
→ Make sure Tally Prime is open with a company loaded  
→ Check that XML over HTTP is enabled (Step 1)  
→ Verify the port (default 9000) is correct in `.env`

**"Rate limited"**  
→ The platform only accepts 1 sync per 5 minutes. This is expected if you set `SYNC_INTERVAL_MINUTES=5` or below.

**"Invalid sync token" (401 error)**  
→ Check your `SYNC_TOKEN` in `.env` matches the token in TallyAI Settings → Connector  
→ If you regenerated the token in the dashboard, update `.env`

**Data not appearing in dashboard**  
→ Check the sync log in TallyAI Settings → Connector for errors  
→ Ensure Tally has the correct company open

## What data is synced?

| Data Type | Source | Frequency |
|-----------|--------|-----------|
| Ledger accounts & balances | Tally ledger list | Every sync |
| Vouchers (last 90 days) | Tally Day Book | Every sync |
| Outstanding receivables | Tally outstanding report | Every sync |
| Outstanding payables | Tally outstanding report | Every sync |
| Stock items | Tally Stock Summary | Every sync |

## Data Security

- The sync token is a secret. Do not share it or commit it to version control.
- All data is transmitted over HTTPS to your TallyAI platform.
- The connector only **reads** data from Tally — it never writes back.
