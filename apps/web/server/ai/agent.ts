import Anthropic from "@anthropic-ai/sdk";
import { getDebtorAging } from "./tools/getDebtorAging";
import { getPayables } from "./tools/getPayables";
import { getSalesReport } from "./tools/getSalesReport";
import { getProfitLoss } from "./tools/getProfitLoss";
import { getLedgerBalance } from "./tools/getLedgerBalance";
import { getKpiSummary } from "./tools/getKpiSummary";
import { getCashFlow } from "./tools/getCashFlow";

const tools: Anthropic.Tool[] = [
  {
    name: "get_debtor_aging",
    description:
      "Get party-wise debtor aging report — who owes money to the company and for how long. Returns buckets: 0-30, 31-60, 61-90, 91+ days.",
    input_schema: {
      type: "object" as const,
      properties: {
        asOfDate: {
          type: "string",
          description: "ISO date string (YYYY-MM-DD). Defaults to today.",
        },
      },
    },
  },
  {
    name: "get_payables",
    description:
      "Get what the company owes to vendors and creditors, with aging buckets and overdue flags.",
    input_schema: {
      type: "object" as const,
      properties: {
        asOfDate: {
          type: "string",
          description: "ISO date string (YYYY-MM-DD). Defaults to today.",
        },
      },
    },
  },
  {
    name: "get_sales_report",
    description: "Get sales data for a date range — total sales, top transactions, growth vs last month.",
    input_schema: {
      type: "object" as const,
      properties: {
        fromDate: {
          type: "string",
          description: "Start date (YYYY-MM-DD). Defaults to start of current month.",
        },
        toDate: {
          type: "string",
          description: "End date (YYYY-MM-DD). Defaults to end of current month.",
        },
      },
    },
  },
  {
    name: "get_profit_loss",
    description:
      "Get income, expenses, gross profit, net profit, and profit margin.",
    input_schema: {
      type: "object" as const,
      properties: {
        fromDate: {
          type: "string",
          description: "Start date (YYYY-MM-DD). Defaults to start of current month.",
        },
        toDate: {
          type: "string",
          description: "End date (YYYY-MM-DD). Defaults to end of current month.",
        },
      },
    },
  },
  {
    name: "get_kpi_summary",
    description:
      "Get a quick snapshot of all key business metrics: receivables, payables, monthly sales, cash balance, top debtors, sync status.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_ledger_balance",
    description:
      "Get the closing balance of a specific ledger account by name (supports partial/fuzzy match).",
    input_schema: {
      type: "object" as const,
      properties: {
        ledgerName: {
          type: "string",
          description: "Name or partial name of the ledger account.",
        },
      },
      required: ["ledgerName"],
    },
  },
  {
    name: "get_cash_flow",
    description:
      "Get daily cash inflow and outflow (receipts and payments) for a period.",
    input_schema: {
      type: "object" as const,
      properties: {
        fromDate: {
          type: "string",
          description: "Start date (YYYY-MM-DD). Defaults to start of current month.",
        },
        toDate: {
          type: "string",
          description: "End date (YYYY-MM-DD). Defaults to end of current month.",
        },
      },
    },
  },
];

type ToolInput = Record<string, string | undefined>;

async function executeTool(
  name: string,
  input: ToolInput,
  companyId: string
): Promise<string> {
  try {
    switch (name) {
      case "get_debtor_aging":
        return JSON.stringify(
          await getDebtorAging({ companyId, asOfDate: input.asOfDate })
        );
      case "get_payables":
        return JSON.stringify(
          await getPayables({ companyId, asOfDate: input.asOfDate })
        );
      case "get_sales_report":
        return JSON.stringify(
          await getSalesReport({
            companyId,
            fromDate: input.fromDate,
            toDate: input.toDate,
          })
        );
      case "get_profit_loss":
        return JSON.stringify(
          await getProfitLoss({
            companyId,
            fromDate: input.fromDate,
            toDate: input.toDate,
          })
        );
      case "get_kpi_summary":
        return JSON.stringify(await getKpiSummary({ companyId }));
      case "get_ledger_balance":
        return JSON.stringify(
          await getLedgerBalance({
            companyId,
            ledgerName: input.ledgerName ?? "",
          })
        );
      case "get_cash_flow":
        return JSON.stringify(
          await getCashFlow({
            companyId,
            fromDate: input.fromDate,
            toDate: input.toDate,
          })
        );
      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool execution failed";
    return JSON.stringify({ error: message });
  }
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function* runAgentStream(
  messages: ChatMessage[],
  companyId: string,
  companyName: string,
  lastSyncAt: Date | null
): AsyncGenerator<string> {
  const client = new Anthropic();
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const syncInfo = lastSyncAt
    ? `Last data sync: ${lastSyncAt.toLocaleString("en-IN")}`
    : "Data has never been synced — user may need to set up the Tally connector.";

  const systemPrompt = `You are a financial intelligence assistant for ${companyName}.
You have access to their live Tally Prime accounting data through tools.
Answer questions clearly, concisely, and with specific numbers.
Always mention the data date range when providing financial figures.
Format currency in Indian Rupee format using ₹ symbol with lakhs and crores notation (e.g., ₹2.5 Lakhs, ₹1.2 Crores).
Be helpful, professional, and insightful — go beyond just stating numbers by providing brief interpretation.
Current date: ${today}. ${syncInfo}`;

  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const currentMessages = [...anthropicMessages];
  const MAX_ITERATIONS = 10;
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      tools,
      messages: currentMessages,
    });

    // Yield text blocks
    for (const block of response.content) {
      if (block.type === "text" && block.text) {
        yield block.text;
      }
    }

    if (response.stop_reason !== "tool_use") break;

    // Signal tool use to frontend and execute
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type === "tool_use") {
        // Signal which tool is being used
        yield `\x00TOOL_USE\x00${block.name}\x00`;

        const result = await executeTool(
          block.name,
          block.input as ToolInput,
          companyId
        );

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        });
      }
    }

    currentMessages.push({ role: "assistant", content: response.content });
    currentMessages.push({ role: "user", content: toolResults });
  }
}
