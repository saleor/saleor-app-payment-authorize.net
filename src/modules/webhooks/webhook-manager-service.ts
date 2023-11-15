import { AuthorizeNetClient } from "../authorize-net/authorize-net-client";
import { type AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";
import { PaymentGatewayInitializeSessionService } from "./payment-gateway-initialize-session";

import { TransactionInitializeSessionService } from "./transaction-initialize-session";
import {
  type PaymentGatewayInitializeSessionEventFragment,
  type TransactionInitializeSessionEventFragment,
} from "generated/graphql";
import { type SyncWebhookResponse } from "@/lib/webhook-response-builder";
import { createLogger } from "@/lib/logger";

interface PaymentsWebhooks {
  transactionInitializeSession: (
    payload: TransactionInitializeSessionEventFragment,
  ) => Promise<SyncWebhookResponse<"TRANSACTION_INITIALIZE_SESSION">>;
  paymentGatewayInitializeSession: (
    payload: PaymentGatewayInitializeSessionEventFragment,
  ) => SyncWebhookResponse<"PAYMENT_GATEWAY_INITIALIZE_SESSION">;
}

export class WebhookManagerService implements PaymentsWebhooks {
  private client: AuthorizeNetClient;
  private logger = createLogger({
    name: "WebhookManagerService",
  });

  constructor(private config: AuthorizeProviderConfig.FullShape) {
    this.client = new AuthorizeNetClient(config);
  }

  async transactionInitializeSession(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<SyncWebhookResponse<"TRANSACTION_INITIALIZE_SESSION">> {
    const transactionInitializeSessionService = new TransactionInitializeSessionService(
      this.client,
    );

    return transactionInitializeSessionService.execute(payload);
  }

  paymentGatewayInitializeSession(): SyncWebhookResponse<"PAYMENT_GATEWAY_INITIALIZE_SESSION"> {
    const paymentGatewayInitializeSessionService = new PaymentGatewayInitializeSessionService(
      this.client,
    );

    return paymentGatewayInitializeSessionService.execute();
  }
}
