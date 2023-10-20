import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import { createLogger } from "@/lib/logger";
import { SynchronousWebhookResponse } from "@/lib/webhook-response";
import { saleorApp } from "@/saleor-app";
import {
  UntypedPaymentGatewayInitializeSessionDocument,
  type PaymentGatewayInitializeSessionEventFragment,
} from "generated/graphql";

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

class PaymentGatewayInitializeSessionWebhookResponse extends SynchronousWebhookResponse<"PAYMENT_GATEWAY_INITIALIZE_SESSION"> {}

/**
 * Happens before the payment. Responds with all the data needed to initialize the payment process, e.g. the payment methods.
 */
export default paymentGatewayInitializeSessionSyncWebhook.createHandler(async (req, res, ctx) => {
  logger.debug({ action: ctx.payload }, "handler called");
  const webhookResponse = new PaymentGatewayInitializeSessionWebhookResponse(res);

  try {
    // todo: replace with real response
    return webhookResponse.success({
      data: {
        foo: "bar",
      },
    });
  } catch (error) {
    return webhookResponse.error(error);
  }
});
