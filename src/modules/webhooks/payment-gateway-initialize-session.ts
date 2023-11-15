import { AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";
import { type AuthorizeNetClient } from "../authorize-net/authorize-net-client";
import { BaseError } from "@/errors";

import { type SyncWebhookResponse } from "@/lib/webhook-response-builder";

export const PaymentGatewayInitializeError = BaseError.subclass("PaymentGatewayInitializeError");

const PaymentGatewayInitializeUnexpectedDataError = PaymentGatewayInitializeError.subclass(
  "PaymentGatewayInitializeUnexpectedDataError",
);

const paymentGatewayInitializeResponseDataSchema = AuthorizeProviderConfig.Schema.Full.pick({
  apiLoginId: true,
  environment: true,
  publicClientKey: true,
});

export class PaymentGatewayInitializeSessionService {
  constructor(private client: AuthorizeNetClient) {}

  execute(): SyncWebhookResponse<"PAYMENT_GATEWAY_INITIALIZE_SESSION"> {
    const dataParseResult = paymentGatewayInitializeResponseDataSchema.safeParse({
      apiLoginId: this.client.config.apiLoginId,
      environment: this.client.config.environment,
      publicClientKey: this.client.config.publicClientKey,
    });

    if (!dataParseResult.success) {
      throw new PaymentGatewayInitializeUnexpectedDataError(
        "`data` object has unexpected structure.",
        {
          props: {
            detail: dataParseResult.error,
          },
        },
      );
    }

    const data = dataParseResult.data;

    return {
      data,
    };
  }
}
