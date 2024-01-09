import crypto from "crypto";
import { type AuthData } from "@saleor/app-sdk/APL";
import { buffer } from "micro";
import { type NextApiRequest } from "next";
import { z } from "zod";
import { authorizeNetEventSchema, type AuthorizeConfig } from "../authorize-net-config";
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
  private authorizeSignature = "x-anet-signature";
  private authData: AuthData | null = null;
  private authorizeConfig: AuthorizeConfig.FullShape | null = null;

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

  private async getRawBody() {
    const rawBody = (await buffer(this.request)).toString();
    return rawBody;
  }

  /**
   * @description This method follows the process described in the documentation:
   * @see https://developer.authorize.net/api/reference/features/webhooks.html#Verifying_the_Notification
   */
  private async verifyWebhook() {
    this.logger.debug("Verifying webhook signature...");
    const authorizeConfig = await this.getAuthorizeConfig();
    const headers = this.request.headers;
    const xAnetSignature = headers[this.authorizeSignature]?.toString();

    if (!xAnetSignature) {
      throw new AuthorizeNetInvalidWebhookSignatureError(
        `Missing ${this.authorizeSignature} header`,
      );
    }

    const rawBody = await this.getRawBody();

    const hash = crypto
      .createHmac("sha512", authorizeConfig.signatureKey)
      .update(rawBody)
      .digest("hex");

    const validSignature = `sha512=${hash.toUpperCase()}`;

    if (validSignature !== xAnetSignature) {
      throw new AuthorizeNetInvalidWebhookSignatureError("The signature does not match");
    }

    this.logger.debug("Webhook verified successfully");
  }

  private async parseWebhookBody() {
    const rawBody = await this.getRawBody();
    const body = JSON.parse(rawBody);
    const parseResult = eventPayloadSchema.safeParse(body);

    if (!parseResult.success) {
      throw new AuthorizeNetInvalidWebhookSignatureError("Unexpected shape of the webhook body");
    }

    const eventPayload = parseResult.data;

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
    await this.verifyWebhook();
    const eventPayload = await this.parseWebhookBody();
    await this.processAuthorizeWebhook(eventPayload);

    this.logger.info("Finished processing webhook");
  }
}
