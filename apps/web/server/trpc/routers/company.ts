import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/trpc/trpc";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

export const companyRouter = createTRPCRouter({
  register: publicProcedure
    .input(
      z.object({
        companyName: z.string().min(1),
        userName: z.string().min(1),
        email: z.string().email(),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.user.findUnique({
        where: { email: input.email },
        select: { id: true },
      });
      if (existing) {
        throw new Error("Email already registered");
      }

      const passwordHash = await bcrypt.hash(input.password, 12);
      const syncToken = uuidv4();

      const company = await ctx.db.company.create({
        data: {
          name: input.companyName,
          syncToken,
          users: {
            create: {
              name: input.userName,
              email: input.email,
              passwordHash,
              role: "ADMIN",
            },
          },
        },
        select: { id: true, name: true },
      });

      return { success: true, companyId: company.id };
    }),

  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.session.user.companyId;

    const company = await ctx.db.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        tallyCompanyName: true,
        syncToken: true,
        lastSyncAt: true,
        createdAt: true,
      },
    });

    if (!company) throw new Error("Company not found");

    let syncStatus: "SYNCED" | "STALE" | "NEVER" = "NEVER";
    if (company.lastSyncAt) {
      const hoursDiff =
        (Date.now() - company.lastSyncAt.getTime()) / (1000 * 60 * 60);
      syncStatus = hoursDiff > 2 ? "STALE" : "SYNCED";
    }

    return { ...company, syncStatus };
  }),

  updateName: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.session.user.companyId;
      await ctx.db.company.update({
        where: { id: companyId },
        data: { name: input.name },
      });
      return { success: true };
    }),

  regenerateSyncToken: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.session.user.role !== "ADMIN") {
      throw new Error("Only admins can regenerate sync token");
    }
    const companyId = ctx.session.user.companyId;
    const newToken = uuidv4();
    await ctx.db.company.update({
      where: { id: companyId },
      data: { syncToken: newToken },
    });
    return { syncToken: newToken };
  }),

  getSyncHistory: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.session.user.companyId;
    return ctx.db.syncLog.findMany({
      where: { companyId },
      orderBy: { syncedAt: "desc" },
      take: 10,
      select: {
        id: true,
        syncedAt: true,
        status: true,
        recordsUpserted: true,
        error: true,
      },
    });
  }),
});
