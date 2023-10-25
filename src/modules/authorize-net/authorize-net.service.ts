import { transactionBuilder } from "./authorize-net-transaction-builder";
import { type AuthorizeNetConfig } from "./authorize-net-config";
import { AuthorizeNetClient } from "./client";
import { createLogger } from "@/lib/logger";
import { type SyncWebhookResponse } from "@/lib/webhook-response";
import {
  type PaymentGatewayInitializeSessionEventFragment,
  type TransactionInitializeSessionEventFragment,
} from "generated/graphql";

interface PaymentsWebhooks {
  transactionInitializeSession: (
    payload: TransactionInitializeSessionEventFragment,
  ) => Promise<SyncWebhookResponse<"TRANSACTION_INITIALIZE_SESSION">>;
  paymentGatewayInitializeSession: (
    payload: PaymentGatewayInitializeSessionEventFragment,
  ) => SyncWebhookResponse<"PAYMENT_GATEWAY_INITIALIZE_SESSION">;
}

export class AuthorizeNetService implements PaymentsWebhooks {
  private client: AuthorizeNetClient;
  private logger = createLogger({
    name: "AuthorizeNetService",
  });

  constructor(config: AuthorizeNetConfig) {
    /* eslint-disable @typescript-eslint/no-unsafe-argument */
    this.client = new AuthorizeNetClient(config);
  }

  //   todo: replace with real response
  paymentGatewayInitializeSession(
    payload: PaymentGatewayInitializeSessionEventFragment,
  ): SyncWebhookResponse<"PAYMENT_GATEWAY_INITIALIZE_SESSION"> {
    console.log(payload);
    return {
      data: {
        foo: "bar",
      },
    };
  }

  async transactionInitializeSession(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<SyncWebhookResponse<"TRANSACTION_INITIALIZE_SESSION">> {
    const creditCardTransaction = transactionBuilder.buildCreditCardTransaction(payload);

    const response = await this.client.createTransaction(creditCardTransaction);
    this.logger.debug({ response }, "transactionInitializeSession");

    return {
      amount: payload.action.amount,
      result: "CHARGE_SUCCESS",
      data: {
        foo: "bar",
      },
      message: "Success",
      // externalUrl: "https://example.com",
      // pspReference: "pspReference",
      // time: "",
    };
  }
}
