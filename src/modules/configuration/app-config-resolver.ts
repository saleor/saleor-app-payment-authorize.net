import { decrypt } from "@saleor/app-sdk/settings-manager";
import { type AppConfigMetadataManager } from "./app-config-metadata-manager";
import { env } from "@/lib/env.mjs";
import { generateId } from "@/lib/generate-id";
import { createLogger, logger } from "@/lib/logger";
import { AppConfig, AppConfigurator } from "@/modules/configuration/app-configurator";
import { type WebhookRecipientFragment } from "generated/graphql";

/**
 * This function looks for AppConfig in the webhook recipient metadata. If it's not found, it looks for it in the env.
 * This may come in handy in local development when you don't want to create the provider in the UI each time you set up the app.
 * @param appMetadata - private metadata of the webhook recipient
 * @returns App config from the metadata or env
 */

const defaultAppConfig: AppConfig.Shape = {
  connections: [],
  providers: [],
};

export class AppConfigResolver {
  private logger = createLogger({
    name: "AppConfigResolver",
  });
  constructor(private appConfigMetadataManager: AppConfigMetadataManager) {}

  private getAppConfigFromEnv(): AppConfig.Shape | undefined {
    logger.trace("Reading provider from env");
    const providerInput = {
      id: generateId(),
      apiLoginId: env.AUTHORIZE_API_LOGIN_ID,
      publicClientKey: env.AUTHORIZE_PUBLIC_CLIENT_KEY,
      transactionKey: env.AUTHORIZE_TRANSACTION_KEY,
      environment: env.AUTHORIZE_ENVIRONMENT,
    };

    const connectionInput = {
      id: generateId(),
      providerId: providerInput.id,
      channelSlug: env.AUTHORIZE_SALEOR_CHANNEL_SLUG,
    };

    const appConfigInput = {
      providers: [providerInput],
      connections: [connectionInput],
    };

    const parsed = AppConfig.Schema.safeParse(appConfigInput);

    if (!parsed.success) {
      logger.error({ error: parsed.error }, "Error parsing app configuration from env");
      return undefined;
    }

    logger.trace("Successfully parsed app configuration from env");

    return parsed.data;
  }

  private async injectEnvProviderIfFound(
    appConfig: AppConfig.Shape,
    envConfig: AppConfig.Shape | undefined,
  ) {
    if (!envConfig) {
      // nothing to inject
      return appConfig;
    }

    // check if appConfig providers contain envConfig (by id)
    const isEnvConfigInjected = appConfig.providers.some((provider) =>
      envConfig.providers.some((envProvider) => envProvider.id === provider.id),
    );

    // if not, add it
    if (!isEnvConfigInjected) {
      appConfig = {
        connections: [...appConfig.connections, ...envConfig.connections],
        providers: [...appConfig.providers, ...envConfig.providers],
      };

      const appConfigurator = new AppConfigurator(appConfig);
      // save the updated appConfig to the metadata
      await this.appConfigMetadataManager.set(appConfigurator);
    }

    return appConfig;
  }

  resolve({
    metadata,
  }: {
    metadata: WebhookRecipientFragment["privateMetadata"];
  }): Promise<AppConfig.Shape> {
    let appConfig = defaultAppConfig;

    metadata.forEach((item) => {
      const decrypted = decrypt(item.value, env.SECRET_KEY);
      const parsedItem = JSON.parse(decrypted);
      const appConfigParsed = AppConfig.Schema.safeParse(parsedItem);

      if (appConfigParsed.success) {
        appConfig = appConfigParsed.data;
      }
    });

    const envConfig = this.getAppConfigFromEnv();

    return this.injectEnvProviderIfFound(appConfig, envConfig);
  }
}
