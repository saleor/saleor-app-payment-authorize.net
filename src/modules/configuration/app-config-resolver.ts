import { decrypt } from "@saleor/app-sdk/settings-manager";
import { NoAppConfigFoundError } from "@/errors";
import { env } from "@/lib/env.mjs";
import { AppConfig } from "@/modules/configuration/app-configurator";
import { type WebhookRecipientFragment } from "generated/graphql";
import { logger } from "@/lib/logger";
import { generateId } from "@/lib/generate-id";

function getAppConfigFromEnv(): AppConfig.Shape | undefined {
  logger.trace("Reading config from env");
  const provider = {
    id: generateId(),
    apiLoginId: env.AUTHORIZE_API_LOGIN_ID,
    publicClientKey: env.AUTHORIZE_PUBLIC_CLIENT_KEY,
    transactionKey: env.AUTHORIZE_TRANSACTION_KEY,
    environment: env.AUTHORIZE_ENVIRONMENT,
  };

  const appConfigInput = {
    providers: [provider],
    connections: [],
  };

  const parsed = AppConfig.Schema.safeParse(appConfigInput);

  if (!parsed.success) {
    logger.error({ error: parsed.error }, "Error parsing app configuration from env");
    return undefined;
  }

  logger.trace("Successfully parsed app configuration from env");

  return parsed.data;
}

/**
 * This function looks for AppConfig in the webhook recipient metadata. If it's not found, it looks for it in the env.
 * This may come in handy in local development when you don't want to create the provider in the UI each time you set up the app.
 * @param appMetadata - private metadata of the webhook recipient
 * @returns App config from the metadata or env
 */
export function resolveAppConfigFromMetadataOrEnv(
  appMetadata: WebhookRecipientFragment["privateMetadata"],
): AppConfig.Shape {
  let appConfig: AppConfig.Shape | undefined;

  const envConfig = getAppConfigFromEnv();

  appConfig = envConfig;

  // metadata config takes precedence over env config
  appMetadata.forEach((item) => {
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

  return appConfig;
}
