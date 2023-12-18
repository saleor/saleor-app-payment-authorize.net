import crypto from "crypto";
import { z } from "zod";
import { AuthorizeNetInvalidWebhookSignatureError } from "../authorize-net-error";
import { createAuthorizeWebhooksFetch } from "./create-authorize-webhooks-fetch";
import {
  webhookSchema,
  type AuthorizeProviderConfig,
} from "@/modules/authorize-net/authorize-net-config";

export type AuthorizeNetNewWebhookParams = z.infer<typeof webhookSchema>;

const webhookResponseSchema = z
  .object({
    _links: z.object({
      self: z.object({
        href: z.string(),
      }),
    }),
    webhookId: z.string(),
  })
  .and(webhookSchema);

const listWebhooksResponseSchema = z.array(webhookResponseSchema);

/**
 * @description Authorize.net has a separate API for registering webhooks.
 * @see AuthorizeNetClient for managing transactions etc.
 */
export class AuthorizeNetWebhooksClient {
  private fetch: ReturnType<typeof createAuthorizeWebhooksFetch>;
  private authorizeSignature = "X-ANET-Signature";

  constructor(private config: AuthorizeProviderConfig.FullShape) {
    this.fetch = createAuthorizeWebhooksFetch(config);
  }

  /**
   * @see https://developer.authorize.net/api/reference/features/webhooks.html#Verifying_the_Notification
   */
  private async verifyAuthorizeWebhook(response: Response) {
    const headers = response.headers;
    const xAnetSignature = headers.get(this.authorizeSignature);

    if (!xAnetSignature) {
      throw new AuthorizeNetInvalidWebhookSignatureError(
        `Missing ${this.authorizeSignature} header`,
      );
    }

    const body = await response.text();
    const hash = crypto
      .createHmac("sha512", this.config.signatureKey)
      .update(body)
      .digest("base64");

    const validSignature = `sha512=${hash}`;

    if (validSignature !== xAnetSignature) {
      throw new AuthorizeNetInvalidWebhookSignatureError("Invalid signature");
    }
  }

  async registerWebhook(params: AuthorizeNetNewWebhookParams) {
    const response = await this.fetch({
      method: "POST",
      body: params,
    });

    await this.verifyAuthorizeWebhook(response);

    const result = await response.json();
    const parsedResult = webhookResponseSchema.parse(result);

    return parsedResult;
  }

  async listWebhooks() {
    const response = await this.fetch({
      method: "GET",
    });

    await this.verifyAuthorizeWebhook(response);

    const result = await response.json();
    const parsedResult = listWebhooksResponseSchema.parse(result);

    return parsedResult;
  }
}
