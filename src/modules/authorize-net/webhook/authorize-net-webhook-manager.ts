import { type AuthData } from "@saleor/app-sdk/APL";
import { env } from "../../../lib/env.mjs";
import { isDevelopment } from "../../../lib/isEnv";
import { AppConfigMetadataManager } from "../../configuration/app-config-metadata-manager";
import { AppConfigurator, type AppConfig } from "../../configuration/app-configurator";
import { resolveAuthorizeConfigFromAppConfig } from "../../configuration/authorize-config-resolver";
import {
  type AuthorizeNetWebhook,
  type AuthorizeNetWebhookInput,
  type AuthorizeProviderConfig,
} from "../authorize-net-config";
import { AuthorizeNetWebhookClient } from "./authorize-net-webhook-client";
import { MissingAppUrlError } from "./authorize-net-webhook-errors";
import { createLogger } from "@/lib/logger";

/**
 * @description This class is used to register and manage the webhook with Authorize.net
 */
export class AuthorizeWebhookManager {
  private authData: AuthData;
  private appConfig: AppConfig.Shape;

  private authorizeConfig: AuthorizeProviderConfig.FullShape;

  private logger = createLogger({
    name: "AuthorizeWebhookManager",
  });

  constructor({
    authData,
    appConfig,
    channelSlug,
  }: {
    authData: AuthData;
    appConfig: AppConfig.Shape;
    channelSlug: string;
  }) {
    this.authData = authData;
    this.appConfig = appConfig;

    this.authorizeConfig = resolveAuthorizeConfigFromAppConfig({
      appConfig,
      channelSlug,
    });
  }

  private async updateMetadataWithWebhook(webhook: AuthorizeNetWebhook) {
    const nextConfig: AuthorizeProviderConfig.FullShape = {
      ...this.authorizeConfig,
      webhook,
    };

    const appConfigMetadataManager = AppConfigMetadataManager.createFromAuthData(this.authData);
    const appConfigurator = new AppConfigurator(this.appConfig);

    appConfigurator.providers.updateProvider(nextConfig);
    await appConfigMetadataManager.set(appConfigurator);
  }

  private getWebhookParams() {
    const appUrl = isDevelopment() ? env.LOCAL_APP_URL : `https://${env.VERCEL_URL}`;

    if (!appUrl) {
      throw new MissingAppUrlError("Missing appUrl needed for registering the webhook");
    }

    const webhookParams: AuthorizeNetWebhookInput = {
      eventTypes: [
        "net.authorize.payment.authcapture.created",
        "net.authorize.payment.authorization.created",
        "net.authorize.payment.capture.created",
        "net.authorize.payment.priorAuthCapture.created",
      ],
      status: "active",
      url: `${appUrl}/api/webhooks/authorize`,
    };

    return webhookParams;
  }

  public async register() {
    if (this.authorizeConfig.webhook) {
      this.logger.info("Webhook already registered");
      return;
    }

    this.logger.debug("Registering webhook...");

    const webhooksClient = new AuthorizeNetWebhookClient(this.authorizeConfig);

    const webhookParams = this.getWebhookParams();
    const webhook = await webhooksClient.registerWebhook(webhookParams);

    await this.updateMetadataWithWebhook(webhook);

    this.logger.info("Webhook registered successfully");
  }
}
