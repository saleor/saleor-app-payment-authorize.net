import { z } from "zod";
import {
  AcceptHostedGateway,
  acceptHostedPaymentGatewayRequestDataSchema,
} from "../authorize-net/gateways/accept-hosted-gateway";
import {
  AcceptJsGateway,
  acceptJsPaymentGatewayRequestDataSchema,
} from "../authorize-net/gateways/accept-js-gateway";

import { type PaymentGatewayInitializeSessionEventFragment } from "generated/graphql";
import { type PaymentGatewayInitializeSessionResponse } from "@/pages/api/webhooks/payment-gateway-initialize-session";

export const paymentGatewayInitializeSessionRequestDataSchema = z.union([
  acceptHostedPaymentGatewayRequestDataSchema,
  acceptJsPaymentGatewayRequestDataSchema,
]);

const dataSchema = z.object({
  type: z.string().optional(),
});

export class PaymentGatewayInitializeSessionService {
  async execute(
    payload: PaymentGatewayInitializeSessionEventFragment,
  ): Promise<PaymentGatewayInitializeSessionResponse> {
    const data = paymentGatewayInitializeSessionRequestDataSchema.parse(payload.data);

    switch (data.type) {
      case "acceptHosted": {
        const acceptHostedGateway = new AcceptHostedGateway();

        const acceptHosted = await acceptHostedGateway.initializePaymentGateway(payload);

        return {
          data: acceptHosted,
        };
      }

      case "acceptJs": {
        const acceptJsGateway = new AcceptJsGateway();

        const acceptJs = await acceptJsGateway.initializePaymentGateway(payload);

        return {
          data: acceptJs,
        };
      }
    }
  }
}
