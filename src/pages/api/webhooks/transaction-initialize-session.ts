import * as Sentry from "@sentry/nextjs";
import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import { createLogger } from "@/lib/logger";
import { SynchronousWebhookResponseBuilder } from "@/lib/webhook-response";
import { authorizeMockedConfig } from "@/modules/authorize-net/authorize-net-config";
import { AuthorizeNetService } from "@/modules/authorize-net/authorize-net.service";
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

const authorizeNetService = new AuthorizeNetService(authorizeMockedConfig);

/**
 * Initializes the payment processing. Based on the response, Saleor will create or update the transaction with the appropriate status and balance. The logic for whether the transaction is charged or cancelled is executed in different webhooks (`TRANSACTION_CANCELATION_REQUESTED`, `TRANSACTION_CHARGE_REQUESTED`)
 */
export default transactionInitializeSessionSyncWebhook.createHandler(async (req, res, ctx) => {
  const responseBuilder = new WebhookResponseBuilder(res);
  logger.debug("handler called");

  try {
    const response = await authorizeNetService.transactionInitializeSession(ctx.payload);
    return responseBuilder.respond(response);
  } catch (error) {
    // eslint-disable-next-line @saleor/saleor-app/logger-leak
    logger.error({ error }, "transactionInitializeSession error");
    Sentry.captureMessage("transactionInitializeSession error");
    Sentry.captureException(error);

    // todo: normalize errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return responseBuilder.respond({
      amount: 0, // 0 or real amount?
      result: "AUTHORIZATION_FAILURE",
      message: "Failure",
      data: {
        error: {
          message: errorMessage,
        },
      },
    });
  }
});
