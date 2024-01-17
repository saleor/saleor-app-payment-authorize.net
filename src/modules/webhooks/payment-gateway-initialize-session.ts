import { AcceptHostedGateway } from "./gateways/accept-hosted-gateway";
import { type PaymentGatewayInitializeSessionData } from "@/pages/api/webhooks/payment-gateway-initialize-session";
import { type PaymentGatewayInitializeSessionEventFragment } from "generated/graphql";

export class PaymentGatewayInitializeSessionService {
  async execute(
    payload: PaymentGatewayInitializeSessionEventFragment,
  ): Promise<PaymentGatewayInitializeSessionData> {
    const acceptHostedGateway = new AcceptHostedGateway();
    const initializeAcceptHosted = acceptHostedGateway.initialize(payload);

    const [acceptHosted] = await Promise.all([initializeAcceptHosted]);

    return {
      acceptHosted,
    };
  }
}
