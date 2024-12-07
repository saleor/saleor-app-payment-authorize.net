import { createManifestHandler } from "@saleor/app-sdk/handlers/next";
import { type AppManifest } from "@saleor/app-sdk/types";

import packageJson from "../../../package.json";
import { paymentGatewayInitializeSessionSyncWebhook } from "./webhooks/payment-gateway-initialize-session";
import { transactionCancelationRequestedSyncWebhook } from "./webhooks/transaction-cancelation-requested";
import { transactionInitializeSessionSyncWebhook } from "./webhooks/transaction-initialize-session";
import { transactionRefundRequestedSyncWebhook } from "./webhooks/transaction-refund-requested";
import { transactionProcessSessionSyncWebhook } from "./webhooks/transaction-process-session";
import { listStoredPaymentMethodsSyncWebhook } from "./webhooks/list-stored-payment-methods";

export default createManifestHandler({
  async manifestFactory(context) {
    const baseDomain =
      (context.request.headers["x-forwarded-host"] as string) ||
      (context.request.headers.host as string);
    const appBaseUrl = `https://${baseDomain}`;
    const manifest: AppManifest = {
      name: "Authorize.net",
      tokenTargetUrl: `${appBaseUrl}/api/register`,
      appUrl: `${appBaseUrl}/config`,
      permissions: ["HANDLE_PAYMENTS"],
      id: "saleor.app.authorize.net",
      version: packageJson.version,
      requiredSaleorVersion: ">=3.13",
      webhooks: [
        transactionInitializeSessionSyncWebhook.getWebhookManifest(context.appBaseUrl),
        transactionProcessSessionSyncWebhook.getWebhookManifest(context.appBaseUrl),
        transactionCancelationRequestedSyncWebhook.getWebhookManifest(context.appBaseUrl),
        transactionRefundRequestedSyncWebhook.getWebhookManifest(context.appBaseUrl),
        paymentGatewayInitializeSessionSyncWebhook.getWebhookManifest(context.appBaseUrl),
        listStoredPaymentMethodsSyncWebhook.getWebhookManifest(context.appBaseUrl),
      ],
      extensions: [
        /**
         * Optionally, extend Dashboard with custom UIs
         * https://docs.saleor.io/docs/3.x/developer/extending/apps/extending-dashboard-with-apps
         */
      ],
    };

    return manifest;
  },
});
