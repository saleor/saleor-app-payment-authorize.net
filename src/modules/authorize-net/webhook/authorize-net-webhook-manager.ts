import { env } from "../../../lib/env.mjs";
import { isDevelopment } from "../../../lib/isEnv";
import { type AppConfig } from "../../configuration/app-configurator";

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
  private client: AuthorizeNetWebhookClient;

  private logger = createLogger({
    name: "AuthorizeWebhookManager",
  });

  constructor({ appConfig }: { appConfig: AppConfig.Shape }) {
    const authorizeConfig = appConfig;

    this.client = new AuthorizeNetWebhookClient(authorizeConfig);
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

  private async getAppWebhook() {
    const webhookList = await this.client.listWebhooks();

    const webhookParams = this.getWebhookParams();

    const webhook = webhookList.find((webhook) => {
      return webhook.url === webhookParams.url;
    });

    return webhook;
  }

  public async register() {
    const appWebhook = await this.getAppWebhook();

    if (appWebhook) {
      this.logger.debug("Webhook already registered");
      return;
    }

    this.logger.debug("Webhook not found. Registering webhook...");

    const webhookParams = this.getWebhookParams();
    await this.client.registerWebhook(webhookParams);

    this.logger.info("Webhook registered successfully");
  }
}
