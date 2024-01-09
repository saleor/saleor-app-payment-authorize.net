import { type NextApiRequest, type NextApiResponse } from "next";
import { createLogger } from "@/lib/logger";

import { AuthorizeNetWebhookHandler } from "@/modules/authorize-net/webhook/authorize-net-webhook-handler";

const logger = createLogger({
  name: "AuthorizeNetWebhooksHandler",
});

export const config = {
  api: {
    bodyParser: false /** Disables automatic body parsing, so we can use raw-body.
    @see: authorize-net-webhook-handler.ts 
    */,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    logger.debug({ url: req.url }, "Received webhook request");
    const handler = new AuthorizeNetWebhookHandler(req);

    await handler.handle();
    res.status(200).end();
  } catch (error) {
    // eslint-disable-next-line @saleor/saleor-app/logger-leak
    logger.error({ error }, "Error in webhook handler");
    res.status(500).json({ error });
  }
}
