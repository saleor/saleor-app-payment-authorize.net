import { AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";
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
  private readonly config: AuthorizeProviderConfig.FullShape;

  constructor(config: AuthorizeProviderConfig.FullShape) {
    this.config = config;
  }

  execute(): SyncWebhookResponse<"PAYMENT_GATEWAY_INITIALIZE_SESSION"> {
    const dataParseResult = paymentGatewayInitializeResponseDataSchema.safeParse({
      apiLoginId: this.config.apiLoginId,
      environment: this.config.environment,
      publicClientKey: this.config.publicClientKey,
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
