import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import * as Sentry from "@sentry/nextjs";
import { ActiveProviderResolver } from "../../../modules/configuration/active-provider-resolver";
import { createLogger } from "@/lib/logger";
import { SynchronousWebhookResponseBuilder } from "@/lib/webhook-response-builder";
import { AppConfigMetadataManager } from "@/modules/configuration/app-config-metadata-manager";
import { AppConfigResolver } from "@/modules/configuration/app-config-resolver";
import { TransactionProcessError } from "@/modules/webhooks/transaction-process-session";
import { WebhookManagerService } from "@/modules/webhooks/webhook-manager-service";
import { saleorApp } from "@/saleor-app";
import {
  UntypedTransactionProcessSessionDocument,
  type TransactionProcessSessionEventFragment,
} from "generated/graphql";

export const config = {
  api: {
    bodyParser: false,
  },
};

export const transactionProcessSessionSyncWebhook =
  new SaleorSyncWebhook<TransactionProcessSessionEventFragment>({
    name: "TransactionProcessSession",
    apl: saleorApp.apl,
    event: "TRANSACTION_PROCESS_SESSION",
    query: UntypedTransactionProcessSessionDocument,
    webhookPath: "/api/webhooks/transaction-process-session",
  });

const logger = createLogger({
  name: "transactionProcessSessionSyncWebhook",
});

class WebhookResponseBuilder extends SynchronousWebhookResponseBuilder<"TRANSACTION_PROCESS_SESSION"> {}

type WebhookContext = Parameters<
  Parameters<(typeof transactionProcessSessionSyncWebhook)["createHandler"]>[0]
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
  const providerConfig = activeProviderResolver.resolve(channelSlug);

  const webhookManagerService = new WebhookManagerService(providerConfig);

  return webhookManagerService;
}

/**
 * In the Authorize.net Accept Hosted flow, this webhook is called after the Accept Hosted payment form was submitted.
 * This webhook handler does the following:
 * 1. Checks the `data` for the transaction id to call the Authorize.net API to get the transaction status.
 * 2. Checks the `data` for information regarding whether to store payment methods or not.
 * 3. Returns to Saleor the transaction result: `AUTHORIZATION_SUCCESS` or `AUTHORIZATION_FAILURE`.
 */
export default transactionProcessSessionSyncWebhook.createHandler(async (req, res, ctx) => {
  const responseBuilder = new WebhookResponseBuilder(res);
  // todo: add more extensive logs
  logger.debug(
    {
      action: ctx.payload.action,
      channelSlug: ctx.payload.sourceObject.channel.slug,
      transaction: ctx.payload.transaction,
    },
    "handler called",
  );

  try {
    const webhookManagerService = await getWebhookManagerServiceFromCtx(ctx);

    const response = webhookManagerService.transactionProcessSession(ctx.payload);
    return responseBuilder.ok(response);
  } catch (error) {
    Sentry.captureException(error);

    const normalizedError = TransactionProcessError.normalize(error);
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