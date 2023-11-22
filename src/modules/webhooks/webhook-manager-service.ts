import { type AuthorizeNetClient } from "../authorize-net/authorize-net-client";
import { type AppConfigMetadataManager } from "../configuration/app-config-metadata-manager";

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
  ) => Promise<SyncWebhookResponse<"TRANSACTION_PROCESS_SESSION">>;
}

export class WebhookManagerService implements PaymentsWebhooks {
  private authorizeNetClient: AuthorizeNetClient;
  private appConfigMetadataManager: AppConfigMetadataManager;

  constructor({
    authorizeNetClient,
    appConfigMetadataManager,
  }: {
    authorizeNetClient: AuthorizeNetClient;
    appConfigMetadataManager: AppConfigMetadataManager;
  }) {
    this.authorizeNetClient = authorizeNetClient;
    this.appConfigMetadataManager = appConfigMetadataManager;
  }

  async transactionInitializeSession(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<SyncWebhookResponse<"TRANSACTION_INITIALIZE_SESSION">> {
    const transactionInitializeSessionService = new TransactionInitializeSessionService({
      authorizeNetClient: this.authorizeNetClient,
      appConfigMetadataManager: this.appConfigMetadataManager,
    });

    return transactionInitializeSessionService.execute(payload);
  }

  async transactionProcessSession(
    payload: TransactionProcessSessionEventFragment,
  ): Promise<SyncWebhookResponse<"TRANSACTION_PROCESS_SESSION">> {
    const transactionProcessSessionService = new TransactionProcessSessionService({
      appConfigMetadataManager: this.appConfigMetadataManager,
    });

    return transactionProcessSessionService.execute(payload);
  }
}
