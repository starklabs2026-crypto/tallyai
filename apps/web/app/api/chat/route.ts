import { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { runAgentStream, type ChatMessage } from "@/server/ai/agent";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = (await req.json()) as { messages: ChatMessage[] };
  if (!Array.isArray(messages)) {
    return new Response("Invalid body", { status: 400 });
  }

  const company = await db.company.findUnique({
    where: { id: session.user.companyId },
    select: { id: true, name: true, lastSyncAt: true },
  });

  if (!company) {
    return new Response("Company not found", { status: 404 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of runAgentStream(
          messages,
          company.id,
          company.name,
          company.lastSyncAt
        )) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "An error occurred";
        controller.enqueue(
          encoder.encode(`\n\nSorry, I encountered an error: ${message}`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache",
    },
  });
}
