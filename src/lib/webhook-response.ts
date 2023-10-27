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

  respond(response: SyncWebhookResponse<TWebhookName>) {
    this.logger.debug({ response }, "responding with");
    this.res.status(200).json(response);
  }
}
