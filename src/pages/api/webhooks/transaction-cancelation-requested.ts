import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import * as Sentry from "@sentry/nextjs";
import { ActiveProviderResolver } from "../../../modules/configuration/active-provider-resolver";
import { createLogger } from "@/lib/logger";
import { SynchronousWebhookResponseBuilder } from "@/lib/webhook-response-builder";
import { AppConfigMetadataManager } from "@/modules/configuration/app-config-metadata-manager";
import { AppConfigResolver } from "@/modules/configuration/app-config-resolver";
import { TransactionCancelationRequestedError } from "@/modules/webhooks/transaction-cancelation-requested";
import { WebhookManagerService } from "@/modules/webhooks/webhook-manager-service";
import { saleorApp } from "@/saleor-app";
import {
  UntypedTransactionCancelationRequestedDocument,
  type TransactionCancelationRequestedEventFragment,
} from "generated/graphql";
import { type TransactionCancelationRequestedResponse } from "@/schemas/TransactionCancelationRequested/TransactionCancelationRequestedResponse.mjs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export const transactionCancelationRequestedSyncWebhook =
  new SaleorSyncWebhook<TransactionCancelationRequestedEventFragment>({
    name: "TransactionCancelationRequested",
    apl: saleorApp.apl,
    event: "TRANSACTION_CANCELATION_REQUESTED",
    query: UntypedTransactionCancelationRequestedDocument,
    webhookPath: "/api/webhooks/transaction-cancelation-requested",
  });

const logger = createLogger({
  name: "transactionCancelationRequestedSyncWebhook",
});

class WebhookResponseBuilder extends SynchronousWebhookResponseBuilder<TransactionCancelationRequestedResponse> {}

type WebhookContext = Parameters<
  Parameters<(typeof transactionCancelationRequestedSyncWebhook)["createHandler"]>[0]
>[2];

/**
 * 1. Resolve appConfig from either webhook app metadata or environment variables.
 * 2. Resolve active provider config from appConfig and channel slug.
 * 3. Return webhook manager service created with the active provider config.
 */
async function getWebhookManagerServiceFromCtx(ctx: WebhookContext) {
  const appMetadata = ctx.payload.recipient?.privateMetadata ?? [];
  const channelSlug = ctx.payload.transaction?.sourceObject?.channel.slug;

  const appConfigMetadataManager = AppConfigMetadataManager.createFromAuthData(ctx.authData);
  const appConfigResolver = new AppConfigResolver(appConfigMetadataManager);

  const appConfig = await appConfigResolver.resolve({ metadata: appMetadata });
  const activeProviderResolver = new ActiveProviderResolver(appConfig);
  const authorizeConfig = activeProviderResolver.resolve(channelSlug);

  logger.trace(`Found authorizeConfig for channel ${channelSlug}`);

  const webhookManagerService = new WebhookManagerService({
    authorizeConfig,
  });

  return webhookManagerService;
}

/**
    @description This handler is called when a Saleor transaction is canceled. It changes the status of the transaction in Authorize to "void".
 */
export default transactionCancelationRequestedSyncWebhook.createHandler(async (req, res, ctx) => {
  const responseBuilder = new WebhookResponseBuilder(res);
  logger.debug("handler called");

  try {
    const webhookManagerService = await getWebhookManagerServiceFromCtx(ctx);

    const response = await webhookManagerService.transactionCancelationRequested(ctx.payload);
    // eslint-disable-next-line @saleor/saleor-app/logger-leak
    logger.info({ response }, "Responding with:");
    return responseBuilder.ok(response);
  } catch (error) {
    Sentry.captureException(error);

    const normalizedError = TransactionCancelationRequestedError.normalize(error);
    return responseBuilder.ok({
      result: "CANCEL_FAILURE",
      pspReference: "", // todo: add
      message: normalizedError.message,
    });
  }
});
