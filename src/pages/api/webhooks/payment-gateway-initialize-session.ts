import * as Sentry from "@sentry/nextjs";
import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import { createLogger } from "@/lib/logger";
import { SynchronousWebhookResponseBuilder } from "@/lib/webhook-response";
import { authorizeMockedConfig } from "@/modules/authorize-net/authorize-net-config";
import { WebhookManagerService } from "@/modules/webhooks/webhook-manager-service";
import { saleorApp } from "@/saleor-app";
import {
  UntypedPaymentGatewayInitializeSessionDocument,
  type PaymentGatewayInitializeSessionEventFragment,
} from "generated/graphql";
import { PaymentGatewayInitializeError } from "@/modules/webhooks/payment-gateway-initialize-session";

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

const webhookManagerService = new WebhookManagerService(authorizeMockedConfig);

/**
 * Happens before the payment. Responds with all the data needed to initialize the payment process, e.g. the payment methods.
 */
export default paymentGatewayInitializeSessionSyncWebhook.createHandler(async (req, res, ctx) => {
  // todo: add more extensive logs
  logger.debug(
    { channelSlug: ctx.payload.sourceObject.channel.slug, amount: ctx.payload.amount },
    "handler called",
  );
  const responseBuilder = new WebhookResponseBuilder(res);

  try {
    const response = webhookManagerService.paymentGatewayInitializeSession(ctx.payload);
    return responseBuilder.ok(response);
  } catch (error) {
    Sentry.captureException(error);

    const normalizedError = PaymentGatewayInitializeError.normalize(error);
    return responseBuilder.internalServerError(normalizedError);
  }
});
