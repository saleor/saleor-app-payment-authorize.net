import { AuthorizeNetClient } from "./authorize-net-client";
import { type SyncWebhookResponse } from "@/lib/webhook-response";
import {
  type PaymentGatewayInitializeSessionEventFragment,
  type TransactionInitializeSessionEventFragment,
} from "generated/graphql";

interface PaymentsWebhooks {
  transactionInitializeSession: (
    payload: TransactionInitializeSessionEventFragment,
  ) => SyncWebhookResponse<"TRANSACTION_INITIALIZE_SESSION">;
  paymentGatewayInitializeSession: (
    payload: PaymentGatewayInitializeSessionEventFragment,
  ) => SyncWebhookResponse<"PAYMENT_GATEWAY_INITIALIZE_SESSION">;
}

export class AuthorizeNetService implements PaymentsWebhooks {
  private client: AuthorizeNetClient;

  constructor() {
    this.client = new AuthorizeNetClient();
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

  //   todo: replace with real response
  transactionInitializeSession(
    payload: TransactionInitializeSessionEventFragment,
  ): SyncWebhookResponse<"TRANSACTION_INITIALIZE_SESSION"> {
    console.log(payload);
    return {
      amount: 500,
      result: "CHARGE_SUCCESS",
      data: {
        foo: "bar",
      },
      externalUrl: "https://example.com",
      message: "Success",
      pspReference: "pspReference",
      time: "",
    };
  }
}
