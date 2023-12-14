import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import * as Sentry from "@sentry/nextjs";
import { createLogger } from "@/lib/logger";
import { SynchronousWebhookResponseBuilder } from "@/lib/webhook-response-builder";
import { TransactionRefundRequestedError } from "@/modules/webhooks/transaction-refund-requested";

import { AppInitializer } from "@/app-initializer";
import { saleorApp } from "@/saleor-app";
import { type TransactionRefundRequestedResponse } from "@/schemas/TransactionRefundRequested/TransactionRefundRequestedResponse.mjs";
import {
  UntypedTransactionRefundRequestedDocument,
  type TransactionRefundRequestedEventFragment,
} from "generated/graphql";

export const config = {
  api: {
    bodyParser: false,
  },
};

export const transactionRefundRequestedSyncWebhook =
  new SaleorSyncWebhook<TransactionRefundRequestedEventFragment>({
    name: "TransactionRefundRequested",
    apl: saleorApp.apl,
    event: "TRANSACTION_REFUND_REQUESTED",
    query: UntypedTransactionRefundRequestedDocument,
    webhookPath: "/api/webhooks/transaction-refund-requested",
  });

const logger = createLogger({
  name: "transactionRefundRequestedSyncWebhook",
});

class WebhookResponseBuilder extends SynchronousWebhookResponseBuilder<TransactionRefundRequestedResponse> {}

/**
    @description This handler is called when a Saleor transaction is canceled. It changes the status of the transaction in Authorize to "void".
 */
export default transactionRefundRequestedSyncWebhook.createHandler(async (req, res, ctx) => {
  const responseBuilder = new WebhookResponseBuilder(res);
  logger.debug({ payload: ctx.payload }, "handler called");

  try {
    const appInitializer = new AppInitializer({
      appMetadata: ctx.payload.recipient?.privateMetadata ?? [],
      channelSlug: ctx.payload.transaction?.sourceObject?.channel.slug ?? "",
      authData: ctx.authData,
    });

    const webhookManagerService = await appInitializer.createWebhookManagerService();

    await appInitializer.registerAuthorizeWebhooks();

    const response = await webhookManagerService.transactionRefundRequested(ctx.payload);
    // eslint-disable-next-line @saleor/saleor-app/logger-leak
    logger.info({ response }, "Responding with:");
    return responseBuilder.ok(response);
  } catch (error) {
    Sentry.captureException(error);

    const normalizedError = TransactionRefundRequestedError.normalize(error);
    return responseBuilder.ok({
      result: "REFUND_FAILURE",
      pspReference: "", // todo: add
      message: normalizedError.message,
    });
  }
});
