import { AcceptHostedGateway } from "../authorize-net/gateways/accept-hosted-gateway";
import { PaypalGateway } from "../authorize-net/gateways/paypal-gateway";
import { ApplePayGateway } from "../authorize-net/gateways/apple-pay-gateway";
import { type PaymentGatewayInitializeSessionResponseData } from "@/pages/api/webhooks/payment-gateway-initialize-session";
import { type PaymentGatewayInitializeSessionResponse } from "@/schemas/PaymentGatewayInitializeSession/PaymentGatewayInitializeSessionResponse.mjs";
import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";
import { type TransactionProcessSessionResponse } from "@/schemas/TransactionProcessSession/TransactionProcessSessionResponse.mjs";
import {
  type TransactionProcessSessionEventFragment,
  type PaymentGatewayInitializeSessionEventFragment,
  type TransactionInitializeSessionEventFragment,
} from "generated/graphql";

/**
 * PaymentGatewayInitialize will return the list of payment gateways. One of them will be Accept Hosted.
 * The Accept Hosted payment flow differs from the other payment gateways. The Authorize transaction is created inside the Accept Hosted payment form.
 * The other payment gateways require the TransactionInitializeSession webhook to create the Authorize transaction.
 */
export interface PaymentGateway {
  initializePaymentGateway(
    payload: PaymentGatewayInitializeSessionEventFragment,
  ): Promise<PaymentGatewayInitializeSessionResponse>;
  initializeTransaction(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<TransactionInitializeSessionResponse>;
  processTransaction(
    payload: TransactionProcessSessionEventFragment,
  ): Promise<TransactionProcessSessionResponse>;
}

export class PaymentGatewayInitializeSessionService {
  async execute(
    payload: PaymentGatewayInitializeSessionEventFragment,
  ): Promise<PaymentGatewayInitializeSessionResponseData> {
    const acceptHostedGateway = new AcceptHostedGateway();
    const initializeAcceptHosted = acceptHostedGateway.initializePaymentGateway(payload);

    const paypalGateway = new PaypalGateway();
    const initializePaypal = paypalGateway.initializePaymentGateway(payload);

    const applePayGateway = new ApplePayGateway();
    const initializeApplePay = applePayGateway.initializePaymentGateway(payload);

    const [acceptHosted, paypal, applePay] = await Promise.all([
      initializeAcceptHosted,
      initializePaypal,
      initializeApplePay,
    ]);

    return {
      acceptHosted,
      paypal,
      applePay,
    };
  }
}
