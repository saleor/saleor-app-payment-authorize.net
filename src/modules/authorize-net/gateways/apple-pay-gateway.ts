import { z } from "zod";
import { type AuthorizeGateway } from "@/modules/webhooks/payment-gateway-initialize-session";
import { type PaymentGatewayInitializeSessionEventFragment } from "generated/graphql";

// todo: put everything that client needs to initialize apple pay here
export const applePayPaymentGatewaySchema = z.object({});

type ApplePayPaymentGatewayData = z.infer<typeof applePayPaymentGatewaySchema>;

export class ApplePayGateway implements AuthorizeGateway {
  async initialize(
    _payload: PaymentGatewayInitializeSessionEventFragment,
  ): Promise<ApplePayPaymentGatewayData> {
    return {};
  }
}
