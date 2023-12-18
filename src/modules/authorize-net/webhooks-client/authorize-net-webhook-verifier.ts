import crypto from "crypto";
import { AuthorizeNetInvalidWebhookSignatureError } from "../authorize-net-error";
import { type AuthorizeProviderConfig } from "@/modules/authorize-net/authorize-net-config";
import { createLogger } from "@/lib/logger";

export class AuthorizeWebhookVerifier {
  private logger = createLogger({
    name: "AuthorizeWebhookVerifier",
  });
  private authorizeSignature = "X-ANET-Signature";

  constructor(private config: AuthorizeProviderConfig.FullShape) {}

  /**
   * @see https://developer.authorize.net/api/reference/features/webhooks.html#Verifying_the_Notification
   * @todo use in webhook handler
   */
  async verifyAuthorizeWebhook(response: Response) {
    const headers = response.headers;

    this.logger.debug({ headers }, "Webhook headers");
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
}
