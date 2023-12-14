import { type AuthData } from "@saleor/app-sdk/APL";
import { type AuthorizeProviderConfig } from "./modules/authorize-net/authorize-net-config";
import { ActiveProviderResolver } from "./modules/configuration/active-provider-resolver";
import { AppConfigMetadataManager } from "./modules/configuration/app-config-metadata-manager";
import { AppConfigResolver } from "./modules/configuration/app-config-resolver";
import { AuthorizeNetWebhooksClient } from "./modules/authorize-net/webhooks-client/authorize-net-webhooks-client";
import { WebhookManagerService } from "./modules/webhooks/webhook-manager-service";
import { createServerClient } from "@/lib/create-graphq-client";
import { type MetadataItem } from "generated/graphql";
import { createLogger } from "@/lib/logger";

/**
 * @description This class is used to get the Authorize.net configuration for the app and to register webhooks.
 */
export class AppInitializer {
  private appMetadata: readonly MetadataItem[];
  private authData: AuthData;
  private channelSlug: string;
  private authorizeConfig: AuthorizeProviderConfig.FullShape | null = null;
  private logger = createLogger({
    name: "AppInitializer",
  });

  constructor({
    appMetadata,
    authData,
    channelSlug,
  }: {
    appMetadata: readonly MetadataItem[];
    authData: AuthData;
    channelSlug: string;
  }) {
    this.appMetadata = appMetadata;
    this.authData = authData;
    this.channelSlug = channelSlug;
  }

  private async getAuthorizeConfig() {
    if (this.authorizeConfig) {
      return this.authorizeConfig;
    }

    const appConfigMetadataManager = AppConfigMetadataManager.createFromAuthData(this.authData);
    const appConfigResolver = new AppConfigResolver(appConfigMetadataManager);

    const appConfig = await appConfigResolver.resolve({ metadata: this.appMetadata });
    const activeProviderResolver = new ActiveProviderResolver(appConfig);
    const authorizeConfig = activeProviderResolver.resolve(this.channelSlug);

    this.authorizeConfig = authorizeConfig;

    return authorizeConfig;
  }

  async createWebhookManagerService() {
    const apiClient = createServerClient(this.authData.saleorApiUrl, this.authData.token);

    const webhookManagerService = new WebhookManagerService({
      authorizeConfig: await this.getAuthorizeConfig(),
      apiClient,
    });

    return webhookManagerService;
  }

  async registerAuthorizeWebhooks() {
    const authorizeConfig = await this.getAuthorizeConfig();

    if (authorizeConfig.webhooks.length > 0) {
      this.logger.info("Webhooks already registered");
      return;
    }

    const webhooksClient = new AuthorizeNetWebhooksClient(authorizeConfig);

    await webhooksClient.registerWebhook({
      name: `Saleor ${this.authData.domain} webhook`,
      eventTypes: [],
      status: "active",
      url: `${this.authData.saleorApiUrl}/api/webhooks/authorize`,
    });

    this.logger.info("Webhook registered");
  }
}
