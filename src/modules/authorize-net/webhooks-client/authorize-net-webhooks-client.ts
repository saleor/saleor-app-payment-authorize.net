import { z } from "zod";
import { createAuthorizeWebhooksFetch } from "./create-authorize-webhooks-fetch";
import {
  webhookSchema,
  type AuthorizeProviderConfig,
} from "@/modules/authorize-net/authorize-net-config";
import { createLogger } from "@/lib/logger";

export type AuthorizeNetWebhook = z.infer<typeof webhookSchema>;

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

  private logger = createLogger({
    name: "AuthorizeNetWebhooksClient",
  });

  constructor(config: AuthorizeProviderConfig.FullShape) {
    this.fetch = createAuthorizeWebhooksFetch(config);
  }

  async registerWebhook(params: AuthorizeNetWebhook) {
    const response = await this.fetch({
      method: "POST",
      body: params,
    });

    const result = await response.json();

    const parsedResult = webhookResponseSchema.parse(result);

    return parsedResult;
  }

  async listWebhooks() {
    const response = await this.fetch({
      method: "GET",
    });

    const result = await response.json();
    const parsedResult = listWebhooksResponseSchema.parse(result);

    return parsedResult;
  }
}
