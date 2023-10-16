import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import { createLogger } from "@/lib/logger";
import { SynchronousWebhookResponse } from "@/lib/webhook-response";
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

class TransactionInitializeSessionWebhookResponse extends SynchronousWebhookResponse<"TRANSACTION_INITIALIZE_SESSION"> {}

/**
 * Initializes the payment processing. Based on the response, Saleor will create or update the transaction with the appropriate status and balance. The logic for whether the transaction is charged or cancelled is executed in different webhooks (`TRANSACTION_CANCELATION_REQUESTED`, `TRANSACTION_CHARGE_REQUESTED`)
 */
export default transactionInitializeSessionSyncWebhook.createHandler(async (req, res, ctx) => {
  const webhookResponse = new TransactionInitializeSessionWebhookResponse(res);
  logger.debug(
    { action: ctx.payload.action, data: ctx.payload.data, transaction: ctx.payload.transaction },
    "handler called",
  );

  try {
    //   todo: replace with real response
    return webhookResponse.success({
      amount: 500,
      result: "CHARGE_SUCCESS",
      data: {
        foo: "bar",
      },
      externalUrl: "https://example.com",
      message: "Success",
      pspReference: "pspReference",
      time: "",
    });
  } catch (error) {
    return webhookResponse.error(error);
  }
});
