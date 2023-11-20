import { AuthorizeNetClient } from "../authorize-net/authorize-net-client";
import { type AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";
import { PaymentGatewayInitializeSessionService } from "./payment-gateway-initialize-session";

import { TransactionInitializeSessionService } from "./transaction-initialize-session";
import { TransactionProcessSessionService } from "./transaction-process-session";
import { type SyncWebhookResponse } from "@/lib/webhook-response-builder";
import {
  type TransactionProcessSessionEventFragment,
  type PaymentGatewayInitializeSessionEventFragment,
  type TransactionInitializeSessionEventFragment,
} from "generated/graphql";

interface PaymentsWebhooks {
  transactionInitializeSession: (
    payload: TransactionInitializeSessionEventFragment,
  ) => SyncWebhookResponse<"TRANSACTION_INITIALIZE_SESSION">;
  transactionProcessSession: (
    payload: TransactionProcessSessionEventFragment,
  ) => SyncWebhookResponse<"TRANSACTION_PROCESS_SESSION">;
  paymentGatewayInitializeSession: (
    payload: PaymentGatewayInitializeSessionEventFragment,
  ) => Promise<SyncWebhookResponse<"PAYMENT_GATEWAY_INITIALIZE_SESSION">>;
}

export class WebhookManagerService implements PaymentsWebhooks {
  private client: AuthorizeNetClient;

  constructor(private config: AuthorizeProviderConfig.FullShape) {
    this.client = new AuthorizeNetClient(config);
  }

  transactionInitializeSession(
    payload: TransactionInitializeSessionEventFragment,
  ): SyncWebhookResponse<"TRANSACTION_INITIALIZE_SESSION"> {
    const transactionInitializeSessionService = new TransactionInitializeSessionService();

    return transactionInitializeSessionService.execute(payload);
  }

  paymentGatewayInitializeSession(
    payload: PaymentGatewayInitializeSessionEventFragment,
  ): Promise<SyncWebhookResponse<"PAYMENT_GATEWAY_INITIALIZE_SESSION">> {
    const paymentGatewayInitializeSessionService = new PaymentGatewayInitializeSessionService(
      this.client,
    );

    return paymentGatewayInitializeSessionService.execute(payload);
  }

  transactionProcessSession(
    payload: TransactionProcessSessionEventFragment,
  ): SyncWebhookResponse<"TRANSACTION_PROCESS_SESSION"> {
    const transactionProcessSessionService = new TransactionProcessSessionService();

    return transactionProcessSessionService.execute(payload);
  }
}
