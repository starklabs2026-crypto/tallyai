# TallyAI

AI-powered financial intelligence layer for **Tally Prime**. Connects your Tally Prime company to a web dashboard with KPIs, reports, and an AI chat assistant that answers questions about your accounting data.

🌐 **Live app:** https://web-production-735cd.up.railway.app/

---

## Setup Guide for Non-Technical Users

This guide walks you through running the Tally connector on your computer so your Tally Prime data syncs to the TallyAI dashboard.

### What you need before starting

- A Windows PC with **Tally Prime** already installed and a company opened
- Internet connection
- Your **TallyAI account email + password** (ask the admin to create one for you)

---

### Step 1 — Turn on Tally's XML server (one-time setup in Tally)

1. Open Tally Prime and load the company.
2. Press **F1** on the keyboard.
3. Click **Settings**.
4. Click **Connectivity**.
5. Click **Client/Server configuration**.
6. Set:
   - **TallyPrime acts as** → `Both`
   - **Enable ODBC** → `Yes`
   - **Port** → `9000`
7. Press **Ctrl + A** to save.
8. **Keep Tally Prime open** with the company loaded. (If you close Tally, sync stops working.)

---

### Step 2 — Install Node.js (one-time)

1. Open browser → go to **https://nodejs.org**
2. Click the big green **LTS** button to download.
3. Run the downloaded `.msi` file.
4. Click **Next → Next → Next → Install** (accept defaults, don't tick anything extra).
5. Click **Finish**.

---

### Step 3 — Download the connector (one-time)

1. Go to: **https://github.com/starklabs2026-crypto/tallyai**
2. Click the green **Code** button → **Download ZIP**.
3. Open Downloads folder, **right-click** the zip → **Extract All** → click **Extract**.
4. Remember where it's extracted — e.g., `C:\Users\<your-name>\Downloads\tallyai-main`

---

### Step 4 — Get your connection token (one-time)

1. Open browser → **https://web-production-735cd.up.railway.app/**
2. Log in with your email + password.
3. Click **Settings** in the sidebar → **Connector**.
4. Click **Generate Token** (or copy the existing one).
5. Keep this tab open — you'll need to copy that token in a moment.

---

### Step 5 — Configure the connector (one-time)

1. Open **File Explorer** → go to the extracted folder → open `packages` → open `tally-connector`.
2. Find a file named **`.env.example`**. Right-click it → **Copy**, then right-click empty space → **Paste**. Rename the copy to **`.env`** (yes, just `.env` with a dot in front, no other name).
3. **Right-click** `.env` → **Open with → Notepad**.
4. Replace the contents with:
   ```
   TALLYAI_API_URL=https://web-production-735cd.up.railway.app
   TALLYAI_TOKEN=PASTE_TOKEN_FROM_WEBSITE_HERE
   TALLY_URL=http://localhost:9000
   SYNC_INTERVAL_MINUTES=30
   ```
5. Replace `PASTE_TOKEN_FROM_WEBSITE_HERE` with the token from Step 4.
6. **File → Save**, then close Notepad.

---

### Step 6 — Start the connector

1. Go back to the **main** extracted folder (`tallyai-main`, the top one).
2. In the address bar at the top of File Explorer, **click once** (it'll turn into editable text), type **`cmd`**, and press **Enter**. A black window opens.
3. In that black window, **type exactly** (or copy-paste with right-click):
   ```
   npm install
   ```
   Press **Enter**. Wait 2–5 minutes. It will print lots of text — that's fine.
4. When it's done, type:
   ```
   npm run start --workspace=packages/tally-connector
   ```
   Press **Enter**.
5. You should see: `✅ Connected to Tally` and `Sync complete`.
6. **Leave that black window open.** Closing it stops the sync.

---

### Step 7 — Daily use

Every time you restart your PC:

1. Open Tally Prime, load the company.
2. Open the **tallyai-main** folder.
3. Click in the address bar, type `cmd`, press Enter.
4. Type:
   ```
   npm run start --workspace=packages/tally-connector
   ```
5. Press Enter. Leave window open.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npm not recognized` | Node.js didn't install correctly. Restart PC and redo Step 2. |
| `Cannot connect to Tally` | Tally isn't open, or Step 1 wasn't saved. Redo Step 1 with Tally open. |
| `401 Unauthorized` | Token is wrong. Go back to Step 4, copy a fresh token, paste into `.env`, restart Step 6.4. |
| Sync runs but dashboard shows nothing | Make sure the company in Tally has actual ledgers/vouchers, not an empty company. |

---

## Architecture (for developers)

- **`apps/web`** — Next.js 14 + tRPC + Prisma + NextAuth. Hosted on Railway.
- **`packages/tally-connector`** — Node.js agent that runs on the customer's PC, queries Tally Prime over XML (port 9000), and pushes data to the web app.
- **AI chat** — OpenAI `gpt-4o` with function calling (debtor aging, payables, P&L, cash flow, KPI summary, etc.).
- **Database** — PostgreSQL on Railway.

### Required environment variables (web app)

```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=https://your-domain
OPENAI_API_KEY=sk-...
```
