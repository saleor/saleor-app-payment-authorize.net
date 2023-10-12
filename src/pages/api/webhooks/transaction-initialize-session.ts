import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import { saleorApp } from "@/saleor-app";
import {
  type TransactionInitializeSessionEventFragment,
  UntypedTransactionInitializeSessionDocument,
} from "generated/graphql";
import { createLogger } from "@/lib/logger";

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

/**
 * Initializes the payment processing. Based on the response, Saleor will create or update the transaction with the appropriate status and balance. The logic for whether the transaction is charged or cancelled is executed in different webhooks (`TRANSACTION_CANCELATION_REQUESTED`, `TRANSACTION_CHARGE_REQUESTED`)
 */
export default transactionInitializeSessionSyncWebhook.createHandler(async (req, res, ctx) => {
  logger.debug("handler called");

  //   todo: replace with real response
  return res.send(
    ctx.buildResponse({
      excluded_methods: [],
      lines: [],
      shipping_price_gross_amount: 0,
      shipping_price_net_amount: 0,
      shipping_tax_rate: 0,
      data: {
        foo: "bar",
      },
    }),
  );
});
