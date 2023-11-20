import { type SyncWebhookResponsesMap } from "@saleor/app-sdk/handlers/next";
import { type NextApiResponse } from "next";
import { type Logger, createLogger } from "@/lib/logger";

export type SyncWebhookResponse<TWebhookName extends keyof SyncWebhookResponsesMap> =
  SyncWebhookResponsesMap[TWebhookName];

export class SynchronousWebhookResponseBuilder<TWebhookName extends keyof SyncWebhookResponsesMap> {
  private logger: Logger;

  private getWebhookName(res: NextApiResponse) {
    const path = res.req.url ?? "";
    return path.replace("/api/webhooks/", "").toLocaleLowerCase();
  }

  constructor(private res: NextApiResponse) {
    const webhookName = this.getWebhookName(res);

    this.logger = createLogger({
      name: webhookName,
    });
  }

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
