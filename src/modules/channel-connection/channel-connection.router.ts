import { z } from "zod";

import { AppConfigMetadataManager } from "../configuration/app-config-metadata-manager";
import { createSettingsManager } from "../configuration/settings-manager";
import { protectedClientProcedure } from "../trpc/protected-client-procedure";
import { router } from "../trpc/trpc-server";
import { ChannelConnection } from "./channel-connection.schema";

const procedure = protectedClientProcedure.use(({ ctx, next }) => {
  const settingsManager = createSettingsManager(ctx.apiClient, ctx.appId!);

  return next({
    ctx: {
      settingsManager,
      appConfigService: new AppConfigMetadataManager(settingsManager),
    },
  });
});

export const channelConnectionRouter = router({
  getAll: procedure.query(async ({ ctx: { appConfigService } }) => {
    const config = await appConfigService.get();
    const providers = config.connections.getConnections();

    return providers;
  }),
  getOne: procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx: { appConfigService }, input }) => {
      const config = await appConfigService.get();

      return config.connections.getConnectionById(input.id) ?? null;
    }),
  addOne: procedure
    .input(ChannelConnection.Schema.Input)
    .mutation(async ({ ctx: { appConfigService }, input }) => {
      const config = await appConfigService.get();

      config.connections.addConnection(input);

      await appConfigService.set(config);
    }),
  updateOne: procedure
    .input(ChannelConnection.Schema.Full)
    .mutation(async ({ input, ctx: { appConfigService } }) => {
      const config = await appConfigService.get();

      config.connections.updateConnection(input);

      return appConfigService.set(config);
    }),
  deleteOne: procedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx: { appConfigService } }) => {
      const config = await appConfigService.get();

      config.connections.deleteConnection(input.id);

      return appConfigService.set(config);
    }),
});
