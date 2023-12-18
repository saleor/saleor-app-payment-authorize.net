import { SaleorSyncWebhook } from "@saleor/app-sdk/handlers/next";
import * as Sentry from "@sentry/nextjs";
import { AuthorizeWebhookManager } from "@/authorize-webhook-initializer";
import { createLogger } from "@/lib/logger";
import { SynchronousWebhookResponseBuilder } from "@/lib/webhook-response-builder";
import { resolveAppConfigFromCtx } from "@/modules/configuration/app-config-resolver";
import { resolveAuthorizeConfigFromAppConfig } from "@/modules/configuration/authorize-config-resolver";
import { TransactionProcessError } from "@/modules/webhooks/transaction-process-session";
import { createAppWebhookManager } from "@/modules/webhooks/webhook-manager-service";
import { saleorApp } from "@/saleor-app";
import { type TransactionProcessSessionResponse } from "@/schemas/TransactionProcessSession/TransactionProcessSessionResponse.mjs";
import {
  UntypedTransactionProcessSessionDocument,
  type TransactionProcessSessionEventFragment,
} from "generated/graphql";

export const config = {
  api: {
    bodyParser: false,
  },
};

export const transactionProcessSessionSyncWebhook =
  new SaleorSyncWebhook<TransactionProcessSessionEventFragment>({
    name: "TransactionProcessSession",
    apl: saleorApp.apl,
    event: "TRANSACTION_PROCESS_SESSION",
    query: UntypedTransactionProcessSessionDocument,
    webhookPath: "/api/webhooks/transaction-process-session",
  });

const logger = createLogger({
  name: "transactionProcessSessionSyncWebhook",
});

class WebhookResponseBuilder extends SynchronousWebhookResponseBuilder<TransactionProcessSessionResponse> {}

/**
 * In the Authorize.net Accept Hosted flow, this webhook is called after the Accept Hosted payment form was submitted.
 * This webhook handler does the following:
 * 1. Checks the `data` for the `transactionId` to call the Authorize.net API to get the transaction status.
 * 2. Checks the `data` for the `customerProfileId`. If the customerProfileId was passed from Accept Hosted form, updates the stored customerProfileId x userEmail mapping.
 * 3. Returns to Saleor the transaction result: `AUTHORIZATION_SUCCESS`, `AUTHORIZATION_FAILURE` or `AUTHORIZATION_REQUESTED`.
 */
export default transactionProcessSessionSyncWebhook.createHandler(
  async (req, res, { authData, ...ctx }) => {
    const responseBuilder = new WebhookResponseBuilder(res);
    const channelSlug = ctx.payload.sourceObject.channel.slug;

    // todo: add more extensive logs
    logger.debug(
      {
        action: ctx.payload.action,
        channelSlug,
        transaction: ctx.payload.transaction,
      },
      "Handler called",
    );

    try {
      const appConfig = await resolveAppConfigFromCtx({
        authData,
        appMetadata: ctx.payload.recipient?.privateMetadata ?? [],
      });

      const authorizeConfig = resolveAuthorizeConfigFromAppConfig({
        appConfig,
        channelSlug,
      });

      const authorizeWebhookManager = new AuthorizeWebhookManager({
        authData,
        appConfig,
        channelSlug,
      });

      await authorizeWebhookManager.register();

      const appWebhookManager = await createAppWebhookManager({
        authData,
        authorizeConfig,
      });

      const response = await appWebhookManager.transactionProcessSession(ctx.payload);

      // eslint-disable-next-line @saleor/saleor-app/logger-leak
      logger.info({ response }, "Responding with:");
      return responseBuilder.ok(response);
    } catch (error) {
      Sentry.captureException(error);

      const normalizedError = TransactionProcessError.normalize(error);
      return responseBuilder.ok({
        amount: ctx.payload.action.amount,
        result: "AUTHORIZATION_FAILURE",
        message: "Failure",
        data: {
          error: {
            message: normalizedError.message,
          },
        },
      });
    }
  },
);
