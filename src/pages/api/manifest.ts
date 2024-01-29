import { createManifestHandler } from "@saleor/app-sdk/handlers/next";
import { type AppManifest } from "@saleor/app-sdk/types";

import packageJson from "../../../package.json";
import { paymentGatewayInitializeSessionSyncWebhook } from "./webhooks/payment-gateway-initialize-session";
import { transactionCancelationRequestedSyncWebhook } from "./webhooks/transaction-cancelation-requested";
import { transactionInitializeSessionSyncWebhook } from "./webhooks/transaction-initialize-session";
import { transactionRefundRequestedSyncWebhook } from "./webhooks/transaction-refund-requested";
import { transactionProcessSessionSyncWebhook } from "./webhooks/transaction-process-session";
import { env } from "@/lib/env.mjs";

export default createManifestHandler({
  async manifestFactory(context) {
    const appBaseUrl = env.APP_API_BASE_URL ?? context.appBaseUrl;
    const manifest: AppManifest = {
      name: "Authorize.net",
      tokenTargetUrl: `${appBaseUrl}/api/register`,
      appUrl: `${appBaseUrl}/config`,
      permissions: ["HANDLE_PAYMENTS"],
      id: "saleor.app.authorize.net",
      version: packageJson.version,
      requiredSaleorVersion: ">=3.13",
      brand: {
        logo: {
          default: `${appBaseUrl}/logo.png`,
        },
      },
      webhooks: [
        transactionInitializeSessionSyncWebhook.getWebhookManifest(appBaseUrl),
        transactionProcessSessionSyncWebhook.getWebhookManifest(appBaseUrl),
        transactionCancelationRequestedSyncWebhook.getWebhookManifest(appBaseUrl),
        transactionRefundRequestedSyncWebhook.getWebhookManifest(appBaseUrl),
        paymentGatewayInitializeSessionSyncWebhook.getWebhookManifest(appBaseUrl),
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
