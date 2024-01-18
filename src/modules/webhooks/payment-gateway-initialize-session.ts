import type AuthorizeNet from "authorizenet";
import { AcceptHostedGateway } from "../authorize-net/gateways/accept-hosted-gateway";
import { ApplePayGateway } from "../authorize-net/gateways/apple-pay-gateway";
import {
  type AuthorizePaymentGateway,
  type PaymentGatewayInitializeSessionData,
} from "@/pages/api/webhooks/payment-gateway-initialize-session";
import {
  type TransactionInitializeSessionEventFragment,
  type PaymentGatewayInitializeSessionEventFragment,
} from "generated/graphql";

export interface PaymentGateway {
  initialize(
    payload: PaymentGatewayInitializeSessionEventFragment,
  ): Promise<AuthorizePaymentGateway>;
}

/**
 * PaymentGatewayInitialize will return the list of payment gateways. One of them will be Accept Hosted.
 * The Accept Hosted payment flow differs from the other payment gateways. The Authorize transaction is created inside the Accept Hosted payment form.
 * The other payment gateways require the TransactionInitializeSession webhook to create the Authorize transaction.
 */
export interface ExternalPaymentGateway extends PaymentGateway {
  buildTransactionRequest(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<AuthorizeNet.APIContracts.TransactionRequestType>;
}

export class PaymentGatewayInitializeSessionService {
  async execute(
    payload: PaymentGatewayInitializeSessionEventFragment,
  ): Promise<PaymentGatewayInitializeSessionData> {
    const acceptHostedGateway = new AcceptHostedGateway();
    const initializeAcceptHosted = acceptHostedGateway.initialize(payload);

    const applePayGateway = new ApplePayGateway();
    const initializeApplePay = applePayGateway.initialize(payload);

    const [acceptHosted, applePay] = await Promise.all([
      initializeAcceptHosted,
      initializeApplePay,
    ]);

    return {
      acceptHosted,
      applePay,
    };
  }
}
