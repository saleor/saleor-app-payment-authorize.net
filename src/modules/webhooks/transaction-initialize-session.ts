import { z } from "zod";
import {
  AcceptHostedGateway,
  acceptHostedTransactionInitializeDataSchema,
} from "../authorize-net/gateways/accept-hosted-gateway";
import {
  ApplePayGateway,
  applePayTransactionInitializeDataSchema,
} from "../authorize-net/gateways/apple-pay-gateway";
import {
  PaypalGateway,
  paypalTransactionInitializeDataSchema,
} from "../authorize-net/gateways/paypal-gateway";
import { type TransactionInitializeSessionEventFragment } from "generated/graphql";

import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";

export function mapTransactionInitializeResponse(
  payload: TransactionInitializeSessionEventFragment,
): Pick<TransactionInitializeSessionResponse, "amount" | "result" | "data" | "pspReference"> {
  const amount = payload.transaction.authorizedAmount.amount;

  return {
    amount,
    result: "AUTHORIZATION_SUCCESS",
    data: {},
  };
}

const transactionInitializeDataSchema = z.union([
  applePayTransactionInitializeDataSchema,
  acceptHostedTransactionInitializeDataSchema,
  paypalTransactionInitializeDataSchema,
]);

export class TransactionInitializeSessionService {
  execute(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<TransactionInitializeSessionResponse> {
    const paymentMethod = transactionInitializeDataSchema.parse(payload.data);

    if (paymentMethod.type === "acceptHosted") {
      const gateway = new AcceptHostedGateway();

      return gateway.initializeTransaction(payload);
    }

    if (paymentMethod.type === "applePay") {
      const gateway = new ApplePayGateway();

      return gateway.initializeTransaction(payload);
    }

    if (paymentMethod.type === "paypal") {
      const gateway = new PaypalGateway();

      return gateway.initializeTransaction(payload);
    }

    throw new Error("Unsupported payment method type");
  }
}
