import { type AuthData } from "@saleor/app-sdk/APL";
import { type AuthorizeProviderConfig } from "./modules/authorize-net/authorize-net-config";
import {
  AuthorizeNetWebhooksClient,
  type AuthorizeNetNewWebhookParams,
} from "./modules/authorize-net/webhooks-client/authorize-net-webhooks-client";
import { createLogger } from "@/lib/logger";

export async function initializeAuthorizeWebhook({
  authData,
  authorizeConfig,
}: {
  authData: AuthData;
  authorizeConfig: AuthorizeProviderConfig.FullShape;
}) {
  const logger = createLogger({
    name: "AppWebhookInitializer",
  });

  /**
   * @todo update app config metadata with webhook
   */
  if (authorizeConfig.webhook) {
    logger.info("Webhook already registered");
    return;
  }

  logger.debug("Registering webhook...");

  const webhooksClient = new AuthorizeNetWebhooksClient(authorizeConfig);
  const webhookParams: AuthorizeNetNewWebhookParams = {
    name: `Saleor ${authData.domain} webhook`,
    eventTypes: ["net.authorize.payment.authcapture.created"],
    status: "active",
    url: `${authData.saleorApiUrl}/api/webhooks/authorize`,
  };

  await webhooksClient.registerWebhook(webhookParams);

  logger.info("Webhook registered");
}
