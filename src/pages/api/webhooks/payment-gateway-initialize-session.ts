import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import { saleorApp } from "@/saleor-app";
import {
  UntypedPaymentGatewayInitializeSessionDocument,
  type PaymentGatewayInitializeSessionEventFragment,
} from "generated/graphql";
import { createLogger } from "@/lib/logger";

export const config = {
  api: {
    bodyParser: false,
  },
};

export const paymentGatewayInitializeSessionSyncWebhook =
  new SaleorSyncWebhook<PaymentGatewayInitializeSessionEventFragment>({
    name: "PaymentGatewayInitializeSession",
    apl: saleorApp.apl,
    event: "PAYMENT_GATEWAY_INITIALIZE_SESSION",
    query: UntypedPaymentGatewayInitializeSessionDocument,
    webhookPath: "/api/webhooks/payment-gateway-initialize-session",
  });

const logger = createLogger({
  name: "paymentGatewayInitializeSessionSyncWebhook",
});

/**
 * Happens before the payment. Responds with all the data needed to initialize the payment process, e.g. the payment methods.
 */
export default paymentGatewayInitializeSessionSyncWebhook.createHandler(async (req, res, ctx) => {
  logger.debug("handler called");

  //   todo: replace with real response
  return res.send(
    ctx.buildResponse({
      excluded_methods: [],
      lines: [],
      shipping_price_gross_amount: 0,
      shipping_price_net_amount: 0,
      shipping_tax_rate: 0,
    }),
  );
});
