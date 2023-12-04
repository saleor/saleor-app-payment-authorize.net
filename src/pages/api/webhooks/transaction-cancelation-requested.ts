import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import * as Sentry from "@sentry/nextjs";
import { createLogger } from "@/lib/logger";
import { SynchronousWebhookResponseBuilder } from "@/lib/webhook-response-builder";
import { TransactionCancelationRequestedError } from "@/modules/webhooks/transaction-cancelation-requested";
import { getWebhookManagerServiceFromCtx } from "@/modules/webhooks/webhook-manager-service";
import { saleorApp } from "@/saleor-app";
import { type TransactionCancelationRequestedResponse } from "@/schemas/TransactionCancelationRequested/TransactionCancelationRequestedResponse.mjs";
import {
  UntypedTransactionCancelationRequestedDocument,
  type TransactionCancelationRequestedEventFragment,
} from "generated/graphql";

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

/**
    @description This handler is called when a Saleor transaction is canceled. It changes the status of the transaction in Authorize to "void".
 */
export default transactionCancelationRequestedSyncWebhook.createHandler(async (req, res, ctx) => {
  const responseBuilder = new WebhookResponseBuilder(res);
  logger.debug({ metadata: ctx.payload.transaction }, "handler called");

  try {
    const webhookManagerService = await getWebhookManagerServiceFromCtx({
      appMetadata: ctx.payload.recipient?.privateMetadata ?? [],
      channelSlug: ctx.payload.transaction?.sourceObject?.channel.slug ?? "",
      authData: ctx.authData,
    });

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
