import { env } from "../../../lib/env.mjs";
import { isDevelopment } from "../../../lib/isEnv";
import { type AppConfig } from "../../configuration/app-configurator";
import { resolveAuthorizeConfigFromAppConfig } from "../../configuration/authorize-config-resolver";

import { type AuthorizeConfig } from "../authorize-net-config";
import {
  AuthorizeNetWebhookClient,
  type AuthorizeNetWebhookInput,
} from "./authorize-net-webhook-client";
import { MissingAppUrlError } from "./authorize-net-webhook-errors";
import { createLogger } from "@/lib/logger";

/**
 * @description This class is used to register and manage the webhook with Authorize.net
 */
export class AuthorizeWebhookManager {
  private authorizeConfig: AuthorizeConfig.FullShape;

  private logger = createLogger({
    name: "AuthorizeWebhookManager",
  });

  constructor({ appConfig, channelSlug }: { appConfig: AppConfig.Shape; channelSlug: string }) {
    this.authorizeConfig = resolveAuthorizeConfigFromAppConfig({
      appConfig,
      channelSlug,
    });
  }

  private getWebhookParams() {
    const appUrl = isDevelopment() ? env.APP_API_BASE_URL : `https://${env.VERCEL_URL}`; // todo: get rid of it

    if (!appUrl) {
      throw new MissingAppUrlError("Missing appUrl needed for registering the webhook");
    }

    const url = new URL("/api/webhooks/authorize", appUrl);

    const webhookParams: AuthorizeNetWebhookInput = {
      eventTypes: [
        "net.authorize.payment.capture.created",
        "net.authorize.payment.priorAuthCapture.created",
        "net.authorize.payment.void.created",
        "net.authorize.payment.refund.created",
      ],
      status: "active",
      url: url.href,
    };

    return webhookParams;
  }

  public async register() {
    const isWebhookRegistered = true; // todo: check if exists

    if (!isWebhookRegistered) {
      this.logger.debug("Registering webhook...");

      const webhooksClient = new AuthorizeNetWebhookClient(this.authorizeConfig);

      const webhookParams = this.getWebhookParams();
      await webhooksClient.registerWebhook(webhookParams);

      this.logger.info("Webhook registered successfully");
    }
  }
}
