import { AuthorizeNetClient } from "../authorize-net/authorize-net-client";
import { type AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";

import { TransactionInitializeSessionService } from "./transaction-initialize-session";
import { TransactionProcessSessionService } from "./transaction-process-session";
import { type SyncWebhookResponse } from "@/lib/webhook-response-builder";
import {
  type TransactionInitializeSessionEventFragment,
  type TransactionProcessSessionEventFragment,
} from "generated/graphql";

export interface PaymentsWebhooks {
  transactionInitializeSession: (
    payload: TransactionInitializeSessionEventFragment,
  ) => Promise<SyncWebhookResponse<"TRANSACTION_INITIALIZE_SESSION">>;
  transactionProcessSession: (
    payload: TransactionProcessSessionEventFragment,
  ) => SyncWebhookResponse<"TRANSACTION_PROCESS_SESSION">;
}

export class WebhookManagerService implements PaymentsWebhooks {
  private client: AuthorizeNetClient;

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

  transactionProcessSession(
    payload: TransactionProcessSessionEventFragment,
  ): SyncWebhookResponse<"TRANSACTION_PROCESS_SESSION"> {
    const transactionProcessSessionService = new TransactionProcessSessionService();

    return transactionProcessSessionService.execute(payload);
  }
}
