import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import * as Sentry from "@sentry/nextjs";
import { ActiveProviderResolver } from "../../../modules/configuration/active-provider-resolver";
import { createLogger } from "@/lib/logger";
import { SynchronousWebhookResponseBuilder } from "@/lib/webhook-response-builder";
import { resolveAppConfigFromMetadataOrEnv } from "@/modules/configuration/app-config-resolver";
import { PaymentGatewayInitializeError } from "@/modules/webhooks/payment-gateway-initialize-session";
import { WebhookManagerService } from "@/modules/webhooks/webhook-manager-service";
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

class WebhookResponseBuilder extends SynchronousWebhookResponseBuilder<"PAYMENT_GATEWAY_INITIALIZE_SESSION"> {}

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

  const appMetadata = ctx.payload.recipient?.privateMetadata ?? [];
  const channelSlug = ctx.payload.sourceObject.channel.slug;

  try {
    const appConfig = resolveAppConfigFromMetadataOrEnv(appMetadata);
    const activeProviderResolver = new ActiveProviderResolver(appConfig);
    const providerConfig = activeProviderResolver.resolve(channelSlug);

    const webhookManagerService = new WebhookManagerService(providerConfig);

    const response = webhookManagerService.paymentGatewayInitializeSession();
    return responseBuilder.ok(response);
  } catch (error) {
    Sentry.captureException(error);

    const normalizedError = PaymentGatewayInitializeError.normalize(error);
    return responseBuilder.internalServerError(normalizedError);
  }
});
