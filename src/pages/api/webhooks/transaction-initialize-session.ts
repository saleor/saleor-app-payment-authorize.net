import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import * as Sentry from "@sentry/nextjs";
import { ActiveProviderResolver } from "../../../modules/configuration/active-provider-resolver";
import { createLogger } from "@/lib/logger";
import { SynchronousWebhookResponseBuilder } from "@/lib/webhook-response-builder";
import { TransactionInitializeError } from "@/modules/webhooks/transaction-initialize-session";
import { WebhookManagerService } from "@/modules/webhooks/webhook-manager-service";
import { saleorApp } from "@/saleor-app";
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

class WebhookResponseBuilder extends SynchronousWebhookResponseBuilder<"TRANSACTION_INITIALIZE_SESSION"> {}

/**
 * Initializes the payment processing. Based on the response, Saleor will create or update the transaction with the appropriate status and balance. The logic for whether the transaction is charged or cancelled is executed in different webhooks (`TRANSACTION_CANCELATION_REQUESTED`, `TRANSACTION_CHARGE_REQUESTED`)
 */
export default transactionInitializeSessionSyncWebhook.createHandler(async (req, res, ctx) => {
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

  const appMetadata = ctx.payload.recipient?.privateMetadata ?? [];
  const channelSlug = ctx.payload.sourceObject.channel.slug;

  try {
    const activeProviderResolver = new ActiveProviderResolver({ appMetadata, channelSlug });
    const providerConfig = activeProviderResolver.resolve();

    const webhookManagerService = new WebhookManagerService(providerConfig);
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
