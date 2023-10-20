import { type NextApiResponse } from "next";
import * as Sentry from "@sentry/nextjs";
import { type SyncWebhookResponsesMap } from "@saleor/app-sdk/handlers/next";
import { createLogger } from "@/lib/logger";
import { BaseError } from "@/errors";

type SyncWebhookResponse<TWebhookName extends keyof SyncWebhookResponsesMap> =
  SyncWebhookResponsesMap[TWebhookName];

export class SynchronousWebhookResponse<TWebhookName extends keyof SyncWebhookResponsesMap> {
  private logger = createLogger({
    name: "SynchronousWebhookResponse",
  });
  constructor(private res: NextApiResponse) {}

  private respondWithError(message: string) {
    this.res.status(500).json({ error: message });
  }

  success(response: SyncWebhookResponse<TWebhookName>) {
    this.logger.debug({ response }, "Successfully responding with:");
    this.res.status(200).json(response);
  }

  error(error: unknown) {
    Sentry.captureException(error);

    if (error instanceof BaseError) {
      this.logger.error({ error }, "BaseError occurred");
      return this.respondWithError(error.message);
    }

    this.logger.debug({ error }, "Error responding with:");
    return this.respondWithError("Unknown error");
  }
}
