import { type NextApiRequest, type NextApiResponse } from "next";
import { createLogger } from "@/lib/logger";

import { AuthorizeNetWebhookHandler } from "@/modules/authorize-net/webhook/authorize-net-webhook-handler";

const logger = createLogger({
  name: "AuthorizeNetWebhooksHandler",
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    logger.debug({ url: req.url }, "Received webhook request");
    const handler = new AuthorizeNetWebhookHandler(req);

    await handler.handle();
    res.status(200);
  } catch (error) {
    // eslint-disable-next-line @saleor/saleor-app/logger-leak
    logger.error({ error }, "Error in webhook handler");
    res.status(500).json({ error });
  }
}
