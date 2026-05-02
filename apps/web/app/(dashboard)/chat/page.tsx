"use client";

import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc-client";
import { Send, Trash2, Bot, User, Loader2, Zap } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  toolUsed?: string | null;
}

const toolLabels: Record<string, string> = {
  get_debtor_aging: "Checking debtor data...",
  get_payables: "Fetching payables...",
  get_sales_report: "Analyzing sales data...",
  get_profit_loss: "Computing P&L...",
  get_kpi_summary: "Loading KPI summary...",
  get_ledger_balance: "Looking up ledger...",
  get_cash_flow: "Analyzing cash flow...",
};

const SUGGESTED_QUESTIONS = [
  "Who are my top debtors?",
  "What's my cash position?",
  "How are sales trending this month?",
  "Which invoices are overdue?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTool, setCurrentTool] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: context } = trpc.chat.getCompanyContext.useQuery();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = async (content?: string) => {
    const text = content ?? input.trim();
    if (!text || isLoading) return;

    setInput("");
    const userMessage: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    setCurrentTool(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) throw new Error("Request failed");
      if (!response.body) throw new Error("No response body");

      const assistantMessage: Message = { role: "assistant", content: "" };
      setMessages((prev) => [...prev, assistantMessage]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Check for tool use signals (null byte delimited)
        const parts = buffer.split("\x00");
        for (let i = 0; i < parts.length - 1; i += 3) {
          if (parts[i] === "" && parts[i + 1] === "TOOL_USE" && parts[i + 2]) {
            const toolName = parts[i + 2];
            setCurrentTool(toolName);
            // Remove the signal from buffer
            buffer = parts.slice(i + 3).join("\x00");
            break;
          }
        }

        // Simpler check: look for \x00TOOL_USE\x00toolname\x00 pattern
        const toolMatch = buffer.match(/\x00TOOL_USE\x00([^\x00]+)\x00/);
        if (toolMatch) {
          setCurrentTool(toolMatch[1] ?? null);
          buffer = buffer.replace(toolMatch[0], "");
        }

        // Append remaining text to message
        const cleanBuffer = buffer.replace(/\x00[^\x00]*\x00/g, "");

        if (cleanBuffer && !toolMatch) {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: last.content + cleanBuffer,
              };
            }
            return updated;
          });
          buffer = "";
          setCurrentTool(null);
        }
      }

      // Flush remaining buffer
      if (buffer) {
        const cleanFinal = buffer.replace(/\x00[^\x00]*\x00/g, "");
        if (cleanFinal) {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: last.content + cleanFinal,
              };
            }
            return updated;
          });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An error occurred";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Sorry, I encountered an error: ${msg}. Please try again.`,
        },
      ]);
    } finally {
      setIsLoading(false);
      setCurrentTool(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem-3rem)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Financial Assistant</h1>
          <p className="text-slate-500 text-sm">
            Ask anything about {context?.companyName ?? "your business"} data
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
              <Bot className="w-7 h-7 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">
              Financial Intelligence
            </h2>
            <p className="text-slate-500 text-sm mb-6 max-w-xs">
              Ask me anything about your Tally data — debts, sales, cash flow, P&L and more.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => void handleSend(q)}
                  className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-full text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-3",
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            )}
          >
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                msg.role === "user"
                  ? "bg-indigo-500"
                  : "bg-slate-200"
              )}
            >
              {msg.role === "user" ? (
                <User className="w-3.5 h-3.5 text-white" />
              ) : (
                <Bot className="w-3.5 h-3.5 text-slate-600" />
              )}
            </div>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm",
                msg.role === "user"
                  ? "bg-indigo-500 text-white rounded-tr-sm"
                  : "bg-white border border-slate-200 text-slate-800 rounded-tl-sm"
              )}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm max-w-none prose-headings:text-slate-800 prose-p:text-slate-700 prose-strong:text-slate-800">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-1">
              <Bot className="w-3.5 h-3.5 text-slate-600" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3">
              {currentTool ? (
                <div className="flex items-center gap-2 text-sm text-blue-600">
                  <Zap className="w-3.5 h-3.5 animate-pulse" />
                  {toolLabels[currentTool] ?? "Working..."}
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-sm text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Claude is thinking...
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 border-t border-slate-200 pt-4">
        <div className="flex items-end gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your financial data... (Enter to send, Shift+Enter for new line)"
            disabled={isLoading}
            className="flex-1 resize-none text-sm text-slate-800 placeholder-slate-400 focus:outline-none disabled:opacity-50 max-h-32 overflow-y-auto"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || isLoading}
            className="flex-shrink-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-colors"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1.5 text-center">
          AI responses are based on your synced Tally data
        </p>
      </div>
    </div>
  );
}
