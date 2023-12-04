import { type AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";

import { TransactionInitializeSessionService } from "./transaction-initialize-session";
import { TransactionProcessSessionService } from "./transaction-process-session";
import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";

import { type TransactionProcessSessionResponse } from "@/schemas/TransactionProcessSession/TransactionProcessSessionResponse.mjs";
import {
  type TransactionInitializeSessionEventFragment,
  type TransactionProcessSessionEventFragment,
} from "generated/graphql";

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

  constructor({ authorizeConfig }: { authorizeConfig: AuthorizeProviderConfig.FullShape }) {
    this.authorizeConfig = authorizeConfig;
  }

  async transactionInitializeSession(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<TransactionInitializeSessionResponse> {
    const transactionInitializeSessionService = new TransactionInitializeSessionService({
      authorizeConfig: this.authorizeConfig,
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
