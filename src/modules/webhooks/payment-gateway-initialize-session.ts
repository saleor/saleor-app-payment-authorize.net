import { AcceptHostedGateway } from "../authorize-net/gateways/accept-hosted-gateway";
import {
  type AuthorizePaymentGateway,
  type PaymentGatewayInitializeSessionData,
} from "@/pages/api/webhooks/payment-gateway-initialize-session";
import { type PaymentGatewayInitializeSessionEventFragment } from "generated/graphql";

export interface AuthorizeGateway {
  initialize(
    payload: PaymentGatewayInitializeSessionEventFragment,
  ): Promise<AuthorizePaymentGateway>;
}

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
