import { z } from "zod";
import { createAuthorizeWebhooksFetch } from "./create-authorize-webhooks-fetch";
import { createLogger } from "@/lib/logger";
import {
  webhookSchema,
  type AuthorizeProviderConfig,
  type AuthorizeNetWebhookInput,
} from "@/modules/authorize-net/authorize-net-config";

const webhookResponseSchema = z
  .object({
    _links: z.object({
      self: z.object({
        href: z.string(),
      }),
    }),
  })
  .and(webhookSchema);

/**
 * @description Authorize.net has a separate API for registering webhooks. This class communicates with that API.
 * @see AuthorizeNetClient for managing transactions etc.
 */
export class AuthorizeNetWebhookClient {
  private fetch: ReturnType<typeof createAuthorizeWebhooksFetch>;

  private logger = createLogger({
    name: "AuthorizeNetWebhookClient",
  });

  constructor(config: AuthorizeProviderConfig.FullShape) {
    this.fetch = createAuthorizeWebhooksFetch(config);
  }

  async registerWebhook(input: AuthorizeNetWebhookInput) {
    const response = await this.fetch({
      method: "POST",
      body: input,
    });

    const result = await response.json();

    this.logger.trace({ result }, "registerWebhook response:");

    const parsedResult = webhookResponseSchema.parse(result);

    return parsedResult;
  }
}
