import { createTRPCRouter } from "@/server/trpc/trpc";
import { reportsRouter } from "@/server/trpc/routers/reports";
import { dashboardRouter } from "@/server/trpc/routers/dashboard";
import { companyRouter } from "@/server/trpc/routers/company";
import { chatRouter } from "@/server/trpc/routers/chat";

export const appRouter = createTRPCRouter({
  reports: reportsRouter,
  dashboard: dashboardRouter,
  company: companyRouter,
  chat: chatRouter,
});

export type AppRouter = typeof appRouter;
