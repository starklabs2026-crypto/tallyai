import { createTRPCRouter, protectedProcedure } from "@/server/trpc/trpc";

// The chat tRPC router is minimal — streaming goes through /api/chat route handler.
// This router exposes metadata needed by the frontend.
export const chatRouter = createTRPCRouter({
  getCompanyContext: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.session.user.companyId;
    const company = await ctx.db.company.findUnique({
      where: { id: companyId },
      select: { name: true, lastSyncAt: true },
    });
    return {
      companyName: company?.name ?? "Unknown Company",
      lastSyncAt: company?.lastSyncAt ?? null,
    };
  }),
});
