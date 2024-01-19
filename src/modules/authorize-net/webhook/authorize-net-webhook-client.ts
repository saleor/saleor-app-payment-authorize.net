import { z } from "zod";
import { createAuthorizeWebhooksFetch } from "./create-authorize-webhooks-fetch";
import { createLogger } from "@/lib/logger";
import { type AuthorizeConfig } from "@/modules/authorize-net/authorize-net-config";

export const authorizeNetEventSchema = z.enum([
  "net.authorize.payment.authorization.created",
  "net.authorize.payment.authcapture.created",
  "net.authorize.payment.capture.created",
  "net.authorize.payment.refund.created",
  "net.authorize.payment.priorAuthCapture.created",
  "net.authorize.payment.void.created",
]);

export type AuthorizeNetEvent = z.infer<typeof authorizeNetEventSchema>;

const baseWebhookSchema = z.object({
  url: z.string(),
  status: z.enum(["active", "inactive"]),
});

const webhookInputSchema = baseWebhookSchema.and(
  z.object({
    eventTypes: z.array(authorizeNetEventSchema),
  }),
);

export type AuthorizeNetWebhookInput = z.infer<typeof webhookInputSchema>;

const webhookSchema = baseWebhookSchema.and(
  z.object({
    eventTypes: z.array(z.string()),
    webhookId: z.string(),
  }),
);

const webhookResponseSchema = z
  .object({
    _links: z.object({
      self: z.object({
        href: z.string(),
      }),
    }),
  })
  .and(webhookSchema);

const listWebhooksResponseSchema = z.array(webhookSchema);

/**
 * @description Authorize.net has a separate API for registering webhooks. This class communicates with that API.
 * @see AuthorizeNetClient for managing transactions etc.
 */
export class AuthorizeNetWebhookClient {
  private fetch: ReturnType<typeof createAuthorizeWebhooksFetch>;

  private logger = createLogger({
    name: "AuthorizeNetWebhookClient",
  });

  constructor(config: AuthorizeConfig) {
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

  async listWebhooks() {
    const response = await this.fetch({
      method: "GET",
    });

    const result = await response.json();

    this.logger.trace({ result }, "listWebhooks response:");

    const parsedResult = listWebhooksResponseSchema.parse(result);

    return parsedResult;
  }
}
