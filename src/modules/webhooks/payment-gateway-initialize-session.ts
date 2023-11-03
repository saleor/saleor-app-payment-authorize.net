import {
  authorizeNetConfigSchema,
  type AuthorizeNetConfig,
} from "../authorize-net/authorize-net-config";
import { BaseError } from "@/errors";

import { type SyncWebhookResponse } from "@/lib/webhook-response";
import { type PaymentGatewayInitializeSessionEventFragment } from "generated/graphql";

export const PaymentGatewayInitializeError = BaseError.subclass("PaymentGatewayInitializeError");

const PaymentGatewayInitializeUnexpectedDataError = PaymentGatewayInitializeError.subclass(
  "PaymentGatewayInitializeUnexpectedDataError",
);

const paymentGatewayInitializeResponseDataSchema = authorizeNetConfigSchema.pick({
  apiLoginId: true,
  environment: true,
  publicClientKey: true,
});

export class PaymentGatewayInitializeSessionService {
  private readonly config: AuthorizeNetConfig;

  constructor(config: AuthorizeNetConfig) {
    this.config = config;
  }

  execute(
    _payload: PaymentGatewayInitializeSessionEventFragment,
  ): SyncWebhookResponse<"PAYMENT_GATEWAY_INITIALIZE_SESSION"> {
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
