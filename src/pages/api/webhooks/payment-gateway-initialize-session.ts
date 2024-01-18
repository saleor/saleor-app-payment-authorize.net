import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { normalizeError } from "@/errors";
import { createLogger } from "@/lib/logger";
import { SynchronousWebhookResponseBuilder } from "@/lib/webhook-response-builder";
import { getAuthorizeConfig } from "@/modules/authorize-net/authorize-net-config";
import { acceptHostedPaymentGatewayDataSchema } from "@/modules/authorize-net/gateways/accept-hosted-gateway";
import { applePayPaymentGatewayDataSchema } from "@/modules/authorize-net/gateways/apple-pay-gateway";
import { AuthorizeWebhookManager } from "@/modules/authorize-net/webhook/authorize-net-webhook-manager";
import { createAppWebhookManager } from "@/modules/webhooks/webhook-manager-service";
import { saleorApp } from "@/saleor-app";
import {
  UntypedPaymentGatewayInitializeSessionDocument,
  type PaymentGatewayInitializeSessionEventFragment,
} from "generated/graphql";
import { paypalPaymentGatewayDataSchema } from "@/modules/authorize-net/gateways/paypal-gateway";

const paymentGatewaySchema = z.union([
  acceptHostedPaymentGatewayDataSchema,
  applePayPaymentGatewayDataSchema,
]);

export type AuthorizePaymentGateway = z.infer<typeof paymentGatewaySchema>;

const dataSchema = z.object({
  acceptHosted: acceptHostedPaymentGatewayDataSchema.optional(),
  applePay: applePayPaymentGatewayDataSchema.optional(),
  paypal: paypalPaymentGatewayDataSchema.optional(),
});

export type PaymentGatewayInitializeSessionData = z.infer<typeof dataSchema>;

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

const errorSchema = z.unknown({});

const paymentGatewayInitializeSessionSchema = z.object({
  data: dataSchema.optional(),
  error: errorSchema.optional(),
});

export type PaymentGatewayInitializeSessionResponse = z.infer<
  typeof paymentGatewayInitializeSessionSchema
>;

class WebhookResponseBuilder extends SynchronousWebhookResponseBuilder<PaymentGatewayInitializeSessionResponse> {}

export default paymentGatewayInitializeSessionSyncWebhook.createHandler(
  async (req, res, { authData, ...ctx }) => {
    const logger = createLogger({
      name: ctx.event,
    });

    logger.debug("PaymentGatewayInitializeSession webhook received");
    const responseBuilder = new WebhookResponseBuilder(res);

    try {
      const authorizeConfig = getAuthorizeConfig();
      const authorizeWebhookManager = new AuthorizeWebhookManager({
        appConfig: authorizeConfig,
      });
      await authorizeWebhookManager.register();

      const appWebhookManager = await createAppWebhookManager({
        authData,
        authorizeConfig,
      });

      const response = await appWebhookManager.paymentGatewayInitializeSession(ctx.payload);
      return responseBuilder.ok(response);
    } catch (error) {
      Sentry.captureException(error);

      const normalizedError = normalizeError(error);
      return responseBuilder.ok({
        error: {
          message: normalizedError.message,
        },
      });
    }
  },
);
