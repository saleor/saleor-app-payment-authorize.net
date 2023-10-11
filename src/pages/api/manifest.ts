import { createManifestHandler } from "@saleor/app-sdk/handlers/next";
import { type AppManifest } from "@saleor/app-sdk/types";

import packageJson from "../../../package.json";
import { transactionInitializeSessionSyncWebhook } from "./webhooks/transaction-initialize-session";
import { paymentGatewayInitializeSessionSyncWebhook } from "./webhooks/payment-gateway-initialize-session";

export default createManifestHandler({
  async manifestFactory(context) {
    const manifest: AppManifest = {
      name: packageJson.name,
      tokenTargetUrl: `${context.appBaseUrl}/api/register`,
      appUrl: `${context.appBaseUrl}/config`,
      permissions: ["HANDLE_PAYMENTS"],
      id: "saleor.app.authorize.net",
      version: packageJson.version,
      requiredSaleorVersion: ">=3.13",
      webhooks: [
        transactionInitializeSessionSyncWebhook.getWebhookManifest(context.appBaseUrl),
        paymentGatewayInitializeSessionSyncWebhook.getWebhookManifest(context.appBaseUrl),
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
