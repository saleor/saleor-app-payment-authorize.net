import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import { createLogger } from "@/lib/logger";
import { SynchronousWebhookResponseBuilder } from "@/lib/webhook-response-builder";

import { getAuthorizeConfig } from "@/modules/authorize-net/authorize-net-config";
import { AuthorizeWebhookManager } from "@/modules/authorize-net/webhook/authorize-net-webhook-manager";
import { createAppWebhookManager } from "@/modules/webhooks/webhook-manager-service";
import { errorUtils } from "@/error-utils";
import { saleorApp } from "@/saleor-app";
import { type ListStoredPaymentMethodsResponse } from "@/schemas/ListStoredPaymentMethods/ListStoredPaymentMethodsResponse.mjs";
import {
  UntypedListStoredPaymentMethodsDocument,
  type ListStoredPaymentMethodsEventFragment,
} from "generated/graphql";

export const config = {
  api: {
    bodyParser: false,
  },
};

export const listStoredPaymentMethodsSyncWebhook =
  new SaleorSyncWebhook<ListStoredPaymentMethodsEventFragment>({
    name: "ListStoredPaymentMethods",
    apl: saleorApp.apl,
    event: "TRANSACTION_REFUND_REQUESTED",
    query: UntypedListStoredPaymentMethodsDocument,
    webhookPath: "/api/webhooks/list-stored-payment-methods",
  });

const logger = createLogger({
  name: "listStoredPaymentMethodsSyncWebhook",
});

class WebhookResponseBuilder extends SynchronousWebhookResponseBuilder<ListStoredPaymentMethodsResponse> {}

export default listStoredPaymentMethodsSyncWebhook.createHandler(
  async (req, res, { authData, ...ctx }) => {
    const responseBuilder = new WebhookResponseBuilder(res);
    logger.debug({ payload: ctx.payload }, "handler called");

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

      const response = await appWebhookManager.listStoredPaymentMethods(ctx.payload);
      // eslint-disable-next-line @saleor/saleor-app/logger-leak
      logger.info({ response }, "Responding with:");
      return responseBuilder.ok(response);
    } catch (error) {
      const normalizedError = errorUtils.normalize(error);
      errorUtils.capture(normalizedError);
      logger.error(normalizedError);

      return responseBuilder.internalServerError({
        // TODO: make sure this is the right method
        message: normalizedError.message,
        name: normalizedError.name,
      });
    }
  },
);
