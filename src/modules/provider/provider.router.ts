import { z } from "zod";

import { AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";
import { AppConfigMetadataManager } from "../configuration/app-config-metadata-manager";
import { createSettingsManager } from "../configuration/settings-manager";
import { protectedClientProcedure } from "../trpc/protected-client-procedure";
import { router } from "../trpc/trpc-server";

const procedure = protectedClientProcedure.use(({ ctx, next }) => {
  const settingsManager = createSettingsManager(ctx.apiClient, ctx.appId!);

  return next({
    ctx: {
      settingsManager,
      appConfigService: new AppConfigMetadataManager(settingsManager),
    },
  });
});

export const providerRouter = router({
  getAll: procedure.query(async ({ ctx: { appConfigService } }) => {
    const config = await appConfigService.get();
    const providers = config.providers.getProviders();

    return providers;
  }),
  getOne: procedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx: { appConfigService }, input }) => {
      const config = await appConfigService.get();

      return config.providers.getProviderById(input.id) ?? null;
    }),
  addOne: procedure
    .input(AuthorizeProviderConfig.Schema.Input)
    .mutation(async ({ ctx: { appConfigService }, input }) => {
      const config = await appConfigService.get();

      config.providers.addProvider(input);

      await appConfigService.set(config);
    }),
  updateOne: procedure
    .input(AuthorizeProviderConfig.Schema.Full)
    .mutation(async ({ input, ctx: { appConfigService } }) => {
      const config = await appConfigService.get();

      config?.providers.updateProvider(input);

      return appConfigService.set(config);
    }),
  deleteOne: procedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx: { appConfigService } }) => {
      const config = await appConfigService.get();

      config.providers.deleteProvider(input.id);

      return appConfigService.set(config);
    }),
});
