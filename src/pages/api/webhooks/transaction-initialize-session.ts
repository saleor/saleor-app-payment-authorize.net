import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import * as Sentry from "@sentry/nextjs";
import { ActiveProviderResolver } from "../../../modules/configuration/active-provider-resolver";
import { createLogger } from "@/lib/logger";
import { SynchronousWebhookResponseBuilder } from "@/lib/webhook-response-builder";
import { AppConfigMetadataManager } from "@/modules/configuration/app-config-metadata-manager";
import { AppConfigResolver } from "@/modules/configuration/app-config-resolver";
import { TransactionInitializeError } from "@/modules/webhooks/transaction-initialize-session";
import { WebhookManagerService } from "@/modules/webhooks/webhook-manager-service";
import { saleorApp } from "@/saleor-app";
import {
  UntypedTransactionInitializeSessionDocument,
  type TransactionInitializeSessionEventFragment,
} from "generated/graphql";
import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export const transactionInitializeSessionSyncWebhook =
  new SaleorSyncWebhook<TransactionInitializeSessionEventFragment>({
    name: "TransactionInitializeSession",
    apl: saleorApp.apl,
    event: "TRANSACTION_INITIALIZE_SESSION",
    query: UntypedTransactionInitializeSessionDocument,
    webhookPath: "/api/webhooks/transaction-initialize-session",
  });

const logger = createLogger({
  name: "transactionInitializeSessionSyncWebhook",
});

class WebhookResponseBuilder extends SynchronousWebhookResponseBuilder<TransactionInitializeSessionResponse> {}

type WebhookContext = Parameters<
  Parameters<(typeof transactionInitializeSessionSyncWebhook)["createHandler"]>[0]
>[2];

/**
 * 1. Resolve appConfig from either webhook app metadata or environment variables.
 * 2. Resolve active provider config from appConfig and channel slug.
 * 3. Return webhook manager service created with the active provider config.
 */
async function getWebhookManagerServiceFromCtx(ctx: WebhookContext) {
  const appMetadata = ctx.payload.recipient?.privateMetadata ?? [];
  const channelSlug = ctx.payload.sourceObject.channel.slug;

  const appConfigMetadataManager = AppConfigMetadataManager.createFromAuthData(ctx.authData);
  const appConfigResolver = new AppConfigResolver(appConfigMetadataManager);

  const appConfig = await appConfigResolver.resolve({ metadata: appMetadata });
  const activeProviderResolver = new ActiveProviderResolver(appConfig);
  const authorizeConfig = activeProviderResolver.resolve(channelSlug);

  logger.debug(`Found authorizeConfig for channel ${channelSlug}`);

  const webhookManagerService = new WebhookManagerService({
    authorizeConfig,
    appConfigMetadataManager,
  });

  return webhookManagerService;
}

/**
 * In the Authorize.net Accept Hosted flow, this webhook is called before the Authorize.net payment form is displayed to the user.
 * This webhook does the following:
 * 1. Looks for stored payment methods for the user. If there are any, they are passed to `getHostedPaymentPageRequest` to be displayed in the payment form.
 * 2. Call Authorize.net's `getHostedPaymentPageRequest` to get `formToken` needed to display the Accept Hosted form.
 * 3. Initializes the Saleor transaction by returning "AUTHORIZATION_ACTION_REQUIRED" result if everything was successful.
 */
export default transactionInitializeSessionSyncWebhook.createHandler(async (req, res, ctx) => {
  const responseBuilder = new WebhookResponseBuilder(res);
  logger.debug("handler called");

  try {
    const webhookManagerService = await getWebhookManagerServiceFromCtx(ctx);

    const response = await webhookManagerService.transactionInitializeSession(ctx.payload);
    return responseBuilder.ok(response);
  } catch (error) {
    Sentry.captureException(error);

    const normalizedError = TransactionInitializeError.normalize(error);
    return responseBuilder.ok({
      amount: 0, // 0 or real amount?
      result: "AUTHORIZATION_FAILURE",
      message: "Failure",
      data: {
        error: {
          message: normalizedError.message,
        },
      },
    });
  }
});
