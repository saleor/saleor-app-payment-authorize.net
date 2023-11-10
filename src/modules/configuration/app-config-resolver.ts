import { decrypt } from "@saleor/app-sdk/settings-manager";
import { AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";
import { type AppConfigMetadataManager } from "./app-config-metadata-manager";
import { NoAppConfigFoundError } from "@/errors";
import { env } from "@/lib/env.mjs";
import { AppConfig, AppConfigurator } from "@/modules/configuration/app-configurator";
import { type WebhookRecipientFragment } from "generated/graphql";
import { logger } from "@/lib/logger";
import { generateId } from "@/lib/generate-id";

/**
 * This function looks for AppConfig in the webhook recipient metadata. If it's not found, it looks for it in the env.
 * This may come in handy in local development when you don't want to create the provider in the UI each time you set up the app.
 * @param appMetadata - private metadata of the webhook recipient
 * @returns App config from the metadata or env
 */

export class AppConfigResolver {
  constructor(private appConfigMetadataManager: AppConfigMetadataManager) {}

  private getProviderFromEnv(): AuthorizeProviderConfig.FullShape | undefined {
    logger.trace("Reading provider from env");
    const providerInput = {
      id: generateId(),
      apiLoginId: env.AUTHORIZE_API_LOGIN_ID,
      publicClientKey: env.AUTHORIZE_PUBLIC_CLIENT_KEY,
      transactionKey: env.AUTHORIZE_TRANSACTION_KEY,
      environment: env.AUTHORIZE_ENVIRONMENT,
    };

    const parsed = AuthorizeProviderConfig.Schema.Full.safeParse(providerInput);

    if (!parsed.success) {
      logger.error({ error: parsed.error }, "Error parsing provider configuration from env");
      return undefined;
    }

    logger.trace("Successfully parsed provider configuration from env");

    return parsed.data;
  }

  private async injectEnvProviderIfFound(
    appConfig: AppConfig.Shape,
    envConfig: AuthorizeProviderConfig.FullShape | undefined,
  ) {
    if (!envConfig) {
      // nothing to inject
      return appConfig;
    }

    // check if appConfig providers contain envConfig (by id)
    const isEnvProviderInConfig = appConfig.providers.some(
      (provider) => provider.id === envConfig?.id,
    );

    // if not, add it
    if (!isEnvProviderInConfig) {
      appConfig = {
        ...appConfig,
        providers: [...appConfig.providers, envConfig],
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
    let appConfig: AppConfig.Shape | undefined;

    metadata.forEach((item) => {
      const decrypted = decrypt(item.value, env.SECRET_KEY);
      const parsedItem = JSON.parse(decrypted);
      const appConfigParsed = AppConfig.Schema.safeParse(parsedItem);

      if (appConfigParsed.success) {
        appConfig = appConfigParsed.data;
      }
    });

    if (!appConfig) {
      throw new NoAppConfigFoundError("App config not found");
    }

    const envConfig = this.getProviderFromEnv();

    return this.injectEnvProviderIfFound(appConfig, envConfig);
  }
}
