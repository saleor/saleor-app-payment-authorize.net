import { type Client } from "urql";
import { type AuthData } from "@saleor/app-sdk/APL";
import { type AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";

import { TransactionCancelationRequestedService } from "./transaction-cancelation-requested";
import { TransactionInitializeSessionService } from "./transaction-initialize-session";
import { TransactionProcessSessionService } from "./transaction-process-session";
import { TransactionRefundRequestedService } from "./transaction-refund-requested";
import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";

import { type TransactionCancelationRequestedResponse } from "@/schemas/TransactionCancelationRequested/TransactionCancelationRequestedResponse.mjs";
import { type TransactionProcessSessionResponse } from "@/schemas/TransactionProcessSession/TransactionProcessSessionResponse.mjs";
import { type TransactionRefundRequestedResponse } from "@/schemas/TransactionRefundRequested/TransactionRefundRequestedResponse.mjs";
import {
  type TransactionCancelationRequestedEventFragment,
  type TransactionInitializeSessionEventFragment,
  type TransactionProcessSessionEventFragment,
  type TransactionRefundRequestedEventFragment,
} from "generated/graphql";
import { createServerClient } from "@/lib/create-graphq-client";

export interface PaymentsWebhooks {
  transactionInitializeSession: (
    payload: TransactionInitializeSessionEventFragment,
  ) => Promise<TransactionInitializeSessionResponse>;
  transactionProcessSession: (
    payload: TransactionProcessSessionEventFragment,
  ) => Promise<TransactionProcessSessionResponse>;
  transactionCancelationRequested: (
    payload: TransactionCancelationRequestedEventFragment,
  ) => Promise<TransactionCancelationRequestedResponse>;
}

export class WebhookManagerService implements PaymentsWebhooks {
  private authorizeConfig: AuthorizeProviderConfig.FullShape;
  private apiClient: Client;

  constructor({
    authorizeConfig,
    apiClient,
  }: {
    authorizeConfig: AuthorizeProviderConfig.FullShape;
    apiClient: Client;
  }) {
    this.authorizeConfig = authorizeConfig;
    this.apiClient = apiClient;
  }

  async transactionInitializeSession(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<TransactionInitializeSessionResponse> {
    const service = new TransactionInitializeSessionService({
      authorizeConfig: this.authorizeConfig,
    });

    return service.execute(payload);
  }

  async transactionProcessSession(
    payload: TransactionProcessSessionEventFragment,
  ): Promise<TransactionProcessSessionResponse> {
    const service = new TransactionProcessSessionService({
      authorizeConfig: this.authorizeConfig,
      apiClient: this.apiClient,
    });

    return service.execute(payload);
  }

  async transactionCancelationRequested(
    payload: TransactionCancelationRequestedEventFragment,
  ): Promise<TransactionCancelationRequestedResponse> {
    const service = new TransactionCancelationRequestedService({
      authorizeConfig: this.authorizeConfig,
      apiClient: this.apiClient,
    });

    return service.execute(payload);
  }

  async transactionRefundRequested(
    payload: TransactionRefundRequestedEventFragment,
  ): Promise<TransactionRefundRequestedResponse> {
    const service = new TransactionRefundRequestedService({
      authorizeConfig: this.authorizeConfig,
      apiClient: this.apiClient,
    });

    return service.execute(payload);
  }
}

export async function createWebhookManagerService({
  authData,
  authorizeConfig,
}: {
  authData: AuthData;
  authorizeConfig: AuthorizeProviderConfig.FullShape;
}) {
  const apiClient = createServerClient(authData.saleorApiUrl, authData.token);
  const webhookManagerService = new WebhookManagerService({
    authorizeConfig,
    apiClient,
  });

  return webhookManagerService;
}
