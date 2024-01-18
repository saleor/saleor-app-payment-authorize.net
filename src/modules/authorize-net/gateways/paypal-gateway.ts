import { z } from "zod";
import type AuthorizeNet from "authorizenet";
import { CreateTransactionClient } from "../client/create-transaction";
import { buildTransactionFromTransactionInitializePayload } from "@/modules/webhooks/buildTransactionFromTransactionInitializePayload";
import { type PaymentGateway } from "@/modules/webhooks/payment-gateway-initialize-session";
import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";
import {
  type PaymentGatewayInitializeSessionEventFragment,
  type TransactionInitializeSessionEventFragment,
} from "generated/graphql";

const paypalPaymentGatewaySchema = z.object({});

type PaypalPaymentGatewayData = z.infer<typeof paypalPaymentGatewaySchema>;

export const paypalTransactionInitializeDataSchema = z.object({
  type: z.literal("paypal"),
  data: z.object({}),
});

export const paypalPaymentGatewayDataSchema = z.object({});

export class PaypalGateway implements PaymentGateway {
  async initializePaymentGateway(
    _payload: PaymentGatewayInitializeSessionEventFragment,
  ): Promise<PaypalPaymentGatewayData> {
    // todo: put everything that client needs to initialize paypal here
    return {};
  }

  private buildTransactionRequest(
    payload: TransactionInitializeSessionEventFragment,
  ): AuthorizeNet.APIContracts.TransactionRequestType {
    const transactionRequest = buildTransactionFromTransactionInitializePayload(payload);
    // todo: put everything specific about PayPal transaction request here

    return transactionRequest;
  }

  async initializeTransaction(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<TransactionInitializeSessionResponse> {
    const transactionRequest = this.buildTransactionRequest(payload);

    const createTransactionClient = new CreateTransactionClient();
    const response = await createTransactionClient.createTransaction(transactionRequest);

    return {
      amount: payload.action.amount,
      pspReference: response.transactionResponse.transId,
      result: "AUTHORIZATION_SUCCESS",
    };
  }
}
