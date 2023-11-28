import { type AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";
import { type AppConfigMetadataManager } from "../configuration/app-config-metadata-manager";

import { TransactionInitializeSessionService } from "./transaction-initialize-session";
import { TransactionProcessSessionService } from "./transaction-process-session";
import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";

import {
  type TransactionInitializeSessionEventFragment,
  type TransactionProcessSessionEventFragment,
} from "generated/graphql";
import { type TransactionProcessSessionResponse } from "@/schemas/TransactionProcessSession/TransactionProcessSessionResponse.mjs";

export interface PaymentsWebhooks {
  transactionInitializeSession: (
    payload: TransactionInitializeSessionEventFragment,
  ) => Promise<TransactionInitializeSessionResponse>;
  transactionProcessSession: (
    payload: TransactionProcessSessionEventFragment,
  ) => Promise<TransactionProcessSessionResponse>;
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
  ): Promise<TransactionInitializeSessionResponse> {
    const transactionInitializeSessionService = new TransactionInitializeSessionService({
      authorizeConfig: this.authorizeConfig,
      appConfigMetadataManager: this.appConfigMetadataManager,
    });

    return transactionInitializeSessionService.execute(payload);
  }

  async transactionProcessSession(
    payload: TransactionProcessSessionEventFragment,
  ): Promise<TransactionProcessSessionResponse> {
    const transactionProcessSessionService = new TransactionProcessSessionService({
      authorizeConfig: this.authorizeConfig,
    });

    return transactionProcessSessionService.execute(payload);
  }
}
