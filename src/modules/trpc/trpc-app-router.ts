import { router } from "./trpc-server";

export const appRouter = router({
  // CHANGEME: Add additioal routers here
});

export type AppRouter = typeof appRouter;
