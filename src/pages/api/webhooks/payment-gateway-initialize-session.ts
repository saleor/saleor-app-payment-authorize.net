import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import { createLogger } from "@/lib/logger";
import { SynchronousWebhookResponseBuilder } from "@/lib/webhook-response";
import { saleorApp } from "@/saleor-app";
import {
  UntypedPaymentGatewayInitializeSessionDocument,
  type PaymentGatewayInitializeSessionEventFragment,
} from "generated/graphql";
import { AuthorizeNetService } from "@/modules/authorize-net/authorize-net.service";

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

class WebhookResponseBuilder extends SynchronousWebhookResponseBuilder<"PAYMENT_GATEWAY_INITIALIZE_SESSION"> {}

const authorizeNetService = new AuthorizeNetService();

/**
 * Happens before the payment. Responds with all the data needed to initialize the payment process, e.g. the payment methods.
 */
export default paymentGatewayInitializeSessionSyncWebhook.createHandler(async (req, res, ctx) => {
  logger.debug({ action: ctx.payload }, "handler called");
  const responseBuilder = new WebhookResponseBuilder(res);

  try {
    const response = authorizeNetService.paymentGatewayInitializeSession(ctx.payload);
    return responseBuilder.success(response);
  } catch (error) {
    return responseBuilder.error(error);
  }
});
