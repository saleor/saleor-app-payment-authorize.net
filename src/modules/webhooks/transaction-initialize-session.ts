import { z } from "zod";
import { AcceptHostedGateway } from "../authorize-net/gateways/accept-hosted-gateway";
import { acceptHostedTransactionInitializeSchema } from "../authorize-net/gateways/accept-hosted-schema";
import {
  ApplePayGateway,
  applePayTransactionInitializeDataSchema,
} from "../authorize-net/gateways/apple-pay-gateway";
import { PaypalGateway } from "../authorize-net/gateways/paypal-gateway";
import { paypalTransactionInitializeSchema } from "../authorize-net/gateways/paypal-schema";
import { type TransactionInitializeSessionEventFragment } from "generated/graphql";

import { BaseError } from "@/errors";
import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";

const TransactionProcessPaymentMethodError = BaseError.subclass(
  "TransactionProcessPaymentMethodError",
);

const transactionInitializeRequestDataSchema = z.union([
  applePayTransactionInitializeDataSchema.optional(),
  acceptHostedTransactionInitializeSchema.request.optional(),
  paypalTransactionInitializeSchema.request.optional(),
]);

export class TransactionInitializeSessionService {
  execute(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<TransactionInitializeSessionResponse> {
    const paymentMethod = transactionInitializeRequestDataSchema.parse(payload.data);

    if (!paymentMethod) {
      throw new TransactionProcessPaymentMethodError("Payment method is not provided");
    }

    switch (paymentMethod.type) {
      case "acceptHosted": {
        const gateway = new AcceptHostedGateway();

        return gateway.initializeTransaction(payload);
      }

      case "applePay": {
        const gateway = new ApplePayGateway();

        return gateway.initializeTransaction(payload);
      }

      case "paypal": {
        const gateway = new PaypalGateway();

        return gateway.initializeTransaction(payload);
      }

      default:
        throw new TransactionProcessPaymentMethodError("Unsupported payment method type");
    }
  }
}
