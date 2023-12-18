import { type AuthData } from "@saleor/app-sdk/APL";
import { type AuthorizeProviderConfig } from "./modules/authorize-net/authorize-net-config";
import {
  AuthorizeNetWebhooksClient,
  type AuthorizeNetWebhook,
} from "./modules/authorize-net/webhooks-client/authorize-net-webhooks-client";
import { AppConfigurator, type AppConfig } from "./modules/configuration/app-configurator";
import { resolveAuthorizeConfigFromAppConfig } from "./modules/configuration/authorize-config-resolver";
import { AppConfigMetadataManager } from "./modules/configuration/app-config-metadata-manager";
import { env } from "./lib/env.mjs";
import { isDevelopment } from "./lib/isEnv";
import { createLogger } from "@/lib/logger";

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

  public async register() {
    this.logger.debug({
      authorizeConfig: this.authorizeConfig,
    });
    if (this.authorizeConfig.webhook) {
      this.logger.info("Webhook already registered");
      return;
    }

    this.logger.debug("Registering webhook...");

    const webhooksClient = new AuthorizeNetWebhooksClient(this.authorizeConfig);
    const appUrl = isDevelopment() ? env.LOCAL_APP_URL : `https://${env.VERCEL_URL}`;
    const webhookParams: AuthorizeNetWebhook = {
      eventTypes: ["net.authorize.payment.authcapture.created"],
      status: "active",
      url: `${appUrl}/api/webhooks/authorize`,
    };

    const webhook = await webhooksClient.registerWebhook(webhookParams);

    await this.updateMetadataWithWebhook(webhook);

    this.logger.info("Webhook registered successfully");
  }
}
