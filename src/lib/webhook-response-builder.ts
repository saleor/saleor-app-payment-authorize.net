import { type SyncWebhookResponsesMap } from "@saleor/app-sdk/handlers/next";
import { type NextApiResponse } from "next";
import { createLogger } from "@/lib/logger";

export type SyncWebhookResponse<TWebhookName extends keyof SyncWebhookResponsesMap> =
  SyncWebhookResponsesMap[TWebhookName];

export class SynchronousWebhookResponseBuilder<TWebhookName extends keyof SyncWebhookResponsesMap> {
  private logger = createLogger({
    name: "SynchronousWebhookResponseBuilder",
  });
  constructor(private res: NextApiResponse) {}

  ok(response: SyncWebhookResponse<TWebhookName>) {
    this.logger.debug({ response }, "responding with JSON:");
    this.res.status(200).json(response);
  }

  internalServerError(error: Error) {
    this.logger.error({ error }, "responding with error:");
    this.res.status(500).json({
      error: {
        message: error.message,
      },
    });
  }
}
