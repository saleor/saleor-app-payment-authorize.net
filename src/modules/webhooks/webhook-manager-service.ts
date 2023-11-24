import { type AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";
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
  private authorizeConfig: AuthorizeProviderConfig.FullShape;
  private appConfigMetadataManager: AppConfigMetadataManager;

  constructor({
    authorizeConfig,
    appConfigMetadataManager,
  }: {
    authorizeConfig: AuthorizeProviderConfig.FullShape;
    appConfigMetadataManager: AppConfigMetadataManager;
  }) {
    this.authorizeConfig = authorizeConfig;
    this.appConfigMetadataManager = appConfigMetadataManager;
  }

  async transactionInitializeSession(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<SyncWebhookResponse<"TRANSACTION_INITIALIZE_SESSION">> {
    const transactionInitializeSessionService = new TransactionInitializeSessionService({
      authorizeConfig: this.authorizeConfig,
      appConfigMetadataManager: this.appConfigMetadataManager,
    });

    return transactionInitializeSessionService.execute(payload);
  }

  async transactionProcessSession(
    payload: TransactionProcessSessionEventFragment,
  ): Promise<SyncWebhookResponse<"TRANSACTION_PROCESS_SESSION">> {
    const transactionProcessSessionService = new TransactionProcessSessionService({
      appConfigMetadataManager: this.appConfigMetadataManager,
      authorizeConfig: this.authorizeConfig,
    });

    return transactionProcessSessionService.execute(payload);
  }
}
