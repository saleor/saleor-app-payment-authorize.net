import { type PaymentGatewayInitializeSessionResponseData } from "@/pages/api/webhooks/payment-gateway-initialize-session";
import { type ListStoredPaymentMethodsResponse } from "@/schemas/ListStoredPaymentMethods/ListStoredPaymentMethodsResponse.mjs";

import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";
import {
  type PaymentGatewayInitializeSessionEventFragment,
  type TransactionInitializeSessionEventFragment,
} from "generated/graphql";

export type AppPaymentMethod = ListStoredPaymentMethodsResponse["paymentMethods"][0];
/**
 * PaymentGatewayInitialize will return the list of payment gateways. One of them will be Accept Hosted.
 * The Accept Hosted payment flow differs from the other payment gateways. The Authorize transaction is created inside the Accept Hosted payment form.
 * The other payment gateways require the TransactionInitializeSession webhook to create the Authorize transaction.
 */

export interface PaymentGateway {
  initializePaymentGateway(
    payload: PaymentGatewayInitializeSessionEventFragment,
  ): Promise<PaymentGatewayInitializeSessionResponseData>;
  initializeTransaction(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<TransactionInitializeSessionResponse>;
  listStoredPaymentMethods?(): Promise<AppPaymentMethod>;
}
