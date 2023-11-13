import { channelConnectionRouter } from "../channel-connection/channel-connection.router";
import { providerRouter } from "../provider/provider.router";
import { router } from "./trpc-server";

export const appRouter = router({
  providers: providerRouter,
  connections: channelConnectionRouter,
});

export type AppRouter = typeof appRouter;
