import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { normalizeError } from "@/errors";
import { createLogger } from "@/lib/logger";
import { SynchronousWebhookResponseBuilder } from "@/lib/webhook-response-builder";
import {
  authorizeEnvironmentSchema,
  getAuthorizeConfig,
} from "@/modules/authorize-net/authorize-net-config";
import { AuthorizeWebhookManager } from "@/modules/authorize-net/webhook/authorize-net-webhook-manager";
import { createAppWebhookManager } from "@/modules/webhooks/webhook-manager-service";
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

const acceptHostedPaymentGatewaySchema = z.object({
  formToken: z.string().min(1),
  environment: authorizeEnvironmentSchema,
});

export const paymentGatewayInitializeSessionSyncWebhook =
  new SaleorSyncWebhook<PaymentGatewayInitializeSessionEventFragment>({
    name: "PaymentGatewayInitializeSession",
    apl: saleorApp.apl,
    event: "PAYMENT_GATEWAY_INITIALIZE_SESSION",
    query: UntypedPaymentGatewayInitializeSessionDocument,
    webhookPath: "/api/webhooks/payment-gateway-initialize-session",
  });

// todo: JSON schema?
const applePayPaymentGatewaySchema = z.object({});

const dataSchema = z.object({
  acceptHosted: acceptHostedPaymentGatewaySchema.optional(),
  applePay: applePayPaymentGatewaySchema.optional(),
});

export type PaymentGatewayInitializeSessionData = z.infer<typeof dataSchema>;

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

      const data = await appWebhookManager.paymentGatewayInitializeSession(ctx.payload);

      return responseBuilder.ok({
        data,
      });
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
