import { type AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";

import { TransactionInitializeSessionService } from "./transaction-initialize-session";
import { TransactionProcessSessionService } from "./transaction-process-session";
import { TransactionCancelationRequestedService } from "./transaction-cancelation-requested";
import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";

import {
  type TransactionCancelationRequestedEventFragment,
  type TransactionInitializeSessionEventFragment,
  type TransactionProcessSessionEventFragment,
} from "generated/graphql";
import { type TransactionProcessSessionResponse } from "@/schemas/TransactionProcessSession/TransactionProcessSessionResponse.mjs";
import { type TransactionCancelationRequestedResponse } from "@/schemas/TransactionCancelationRequested/TransactionCancelationRequestedResponse.mjs";

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

  constructor({ authorizeConfig }: { authorizeConfig: AuthorizeProviderConfig.FullShape }) {
    this.authorizeConfig = authorizeConfig;
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
    });

    return service.execute(payload);
  }

  async transactionCancelationRequested(
    payload: TransactionCancelationRequestedEventFragment,
  ): Promise<TransactionCancelationRequestedResponse> {
    const service = new TransactionCancelationRequestedService({
      authorizeConfig: this.authorizeConfig,
    });

    return service.execute(payload);
  }
}
