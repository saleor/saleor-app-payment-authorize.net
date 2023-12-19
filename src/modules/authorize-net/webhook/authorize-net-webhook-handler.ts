import crypto from "crypto";
import { type AuthData } from "@saleor/app-sdk/APL";
import { type NextApiRequest } from "next";
import { z } from "zod";
import { authorizeNetEventSchema, type AuthorizeProviderConfig } from "../authorize-net-config";
import { AuthorizeNetInvalidWebhookSignatureError } from "../authorize-net-error";
import { MissingAuthDataError } from "./authorize-net-webhook-errors";
import { AuthorizeNetWebhookTransactionSynchronizer } from "./authorize-net-webhook-transaction-synchronizer";
import { saleorApp } from "@/saleor-app";
import { resolveAuthorizeConfigFromAppConfig } from "@/modules/configuration/authorize-config-resolver";
import { AppConfigMetadataManager } from "@/modules/configuration/app-config-metadata-manager";
import { createLogger } from "@/lib/logger";
import { createServerClient } from "@/lib/create-graphq-client";

const eventPayloadSchema = z.object({
  notificationId: z.string(),
  eventType: authorizeNetEventSchema,
  eventDate: z.string(),
  webhookId: z.string(),
  payload: z.object({
    entityName: z.enum(["transaction"]),
    id: z.string(),
  }),
});

export type EventPayload = z.infer<typeof eventPayloadSchema>;

/**
 * @description This class is used to handle webhook calls from Authorize.net
 */
export class AuthorizeNetWebhookHandler {
  private authorizeSignature = "X-ANET-Signature";
  private authData: AuthData | null = null;
  private authorizeConfig: AuthorizeProviderConfig.FullShape | null = null;

  private logger = createLogger({
    name: "AuthorizeWebhookHandler",
  });

  constructor(private request: NextApiRequest) {}

  private async getAuthData() {
    if (this.authData) {
      return this.authData;
    }

    const results = await saleorApp.apl.getAll();
    const authData = results?.[0];

    if (!authData) {
      throw new MissingAuthDataError("APL not found");
    }

    this.authData = authData;

    return authData;
  }

  private async decryptAuthorizeWebhookBody({
    authorizeConfig,
  }: {
    authorizeConfig: AuthorizeProviderConfig.FullShape;
  }) {
    const logger = createLogger({
      name: "AuthorizeNetWebhookRequestProcessor",
    });

    const headers = this.request.headers;
    const xAnetSignature = headers[this.authorizeSignature];
    if (!xAnetSignature) {
      throw new AuthorizeNetInvalidWebhookSignatureError(
        `Missing ${this.authorizeSignature} header`,
      );
    }

    logger.debug("Got xAnetSignature from webhook");

    const body = this.request.body;
    const hash = crypto
      .createHmac("sha512", authorizeConfig.signatureKey)
      .update(body)
      .digest("base64");

    const validSignature = `sha512=${hash}`;

    if (validSignature !== xAnetSignature) {
      throw new AuthorizeNetInvalidWebhookSignatureError("Invalid signature");
    }

    logger.debug("Signature is valid");

    const eventPayload = eventPayloadSchema.parse(body);

    return eventPayload;
  }

  private async getAuthorizeConfig() {
    if (this.authorizeConfig) {
      return this.authorizeConfig;
    }

    const authData = await this.getAuthData();
    const channelSlug = "default-channel"; // todo: get rid of channelSlug

    const appConfigMetadataManager = AppConfigMetadataManager.createFromAuthData(authData);
    const appConfigurator = await appConfigMetadataManager.get();
    const appConfig = appConfigurator.rootData;

    const authorizeConfig = resolveAuthorizeConfigFromAppConfig({ appConfig, channelSlug });
    this.authorizeConfig = authorizeConfig;

    return authorizeConfig;
  }

  private async processAuthorizeWebhook(eventPayload: EventPayload) {
    const authData = await this.getAuthData();
    const authorizeConfig = await this.getAuthorizeConfig();

    const client = createServerClient(authData.saleorApiUrl, authData.token);

    const synchronizer = new AuthorizeNetWebhookTransactionSynchronizer({
      client,
      authorizeConfig,
    });
    return synchronizer.synchronizeTransaction(eventPayload);
  }

  async handle() {
    const authorizeConfig = await this.getAuthorizeConfig();
    this.logger.debug("Decrypting webhook body...");
    const eventPayload = await this.decryptAuthorizeWebhookBody({
      authorizeConfig,
    });

    this.logger.debug("Webhook body decrypted");
    this.logger.trace({ eventPayload }, "Webhook body decrypted");

    await this.processAuthorizeWebhook(eventPayload);
    this.logger.info("Webhook processed successfully");
  }
}
