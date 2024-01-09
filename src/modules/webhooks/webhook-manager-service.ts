import { type Client } from "urql";
import { type AuthData } from "@saleor/app-sdk/APL";
import { type AuthorizeConfig } from "../authorize-net/authorize-net-config";

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

export class AppWebhookManager implements PaymentsWebhooks {
  private authorizeConfig: AuthorizeConfig.FullShape;
  private apiClient: Client;

  constructor({
    authorizeConfig,
    apiClient,
  }: {
    authorizeConfig: AuthorizeConfig.FullShape;
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

export async function createAppWebhookManager({
  authData,
  authorizeConfig,
}: {
  authData: AuthData;
  authorizeConfig: AuthorizeConfig.FullShape;
}) {
  const apiClient = createServerClient(authData.saleorApiUrl, authData.token);
  const appWebhookManager = new AppWebhookManager({
    authorizeConfig,
    apiClient,
  });

  return appWebhookManager;
}
