import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import * as Sentry from "@sentry/nextjs";
import { createLogger } from "@/lib/logger";
import { SynchronousWebhookResponseBuilder } from "@/lib/webhook-response-builder";
import { TransactionInitializeError } from "@/modules/webhooks/transaction-initialize-session";
import { getWebhookManagerServiceFromCtx } from "@/modules/webhooks/webhook-manager-service";
import { saleorApp } from "@/saleor-app";
import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";
import {
  UntypedTransactionInitializeSessionDocument,
  type TransactionInitializeSessionEventFragment,
} from "generated/graphql";

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

/**
 * In the Authorize.net Accept Hosted flow, this webhook is called before the Authorize.net payment form is displayed to the user.
 * This webhook does the following:
 * 1. Looks for stored payment methods for the user. If there are any, they are passed to `getHostedPaymentPageRequest` to be displayed in the payment form.
 * 2. Call Authorize.net's `getHostedPaymentPageRequest` to get `formToken` needed to display the Accept Hosted form.
 * 3. Initializes the Saleor transaction by returning "AUTHORIZATION_ACTION_REQUIRED" result if everything was successful.
 */
export default transactionInitializeSessionSyncWebhook.createHandler(async (req, res, ctx) => {
  const responseBuilder = new WebhookResponseBuilder(res);
  logger.info({ action: ctx.payload.action }, "called with:");

  try {
    const webhookManagerService = await getWebhookManagerServiceFromCtx({
      appMetadata: ctx.payload.recipient?.privateMetadata ?? [],
      channelSlug: ctx.payload.sourceObject.channel.slug,
      authData: ctx.authData,
    });

    const response = await webhookManagerService.transactionInitializeSession(ctx.payload);

    // eslint-disable-next-line @saleor/saleor-app/logger-leak
    logger.info({ response }, "Responding with:");
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
