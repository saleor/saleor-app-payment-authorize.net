import { type Client } from "urql";
import { type AuthData } from "@saleor/app-sdk/APL";
import { type AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";

import { ActiveProviderResolver } from "../configuration/active-provider-resolver";
import { AppConfigMetadataManager } from "../configuration/app-config-metadata-manager";
import { AppConfigResolver } from "../configuration/app-config-resolver";
import { TransactionInitializeSessionService } from "./transaction-initialize-session";
import { TransactionProcessSessionService } from "./transaction-process-session";
import { TransactionCancelationRequestedService } from "./transaction-cancelation-requested";
import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";

import {
  type MetadataItem,
  type TransactionCancelationRequestedEventFragment,
  type TransactionInitializeSessionEventFragment,
  type TransactionProcessSessionEventFragment,
} from "generated/graphql";
import { type TransactionProcessSessionResponse } from "@/schemas/TransactionProcessSession/TransactionProcessSessionResponse.mjs";
import { type TransactionCancelationRequestedResponse } from "@/schemas/TransactionCancelationRequested/TransactionCancelationRequestedResponse.mjs";
import { logger } from "@/lib/logger";
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
}

/**
 * 1. Resolve appConfig from either webhook app metadata or environment variables.
 * 2. Resolve active provider config from appConfig and channel slug.
 * 3. Return webhook manager service created with the active provider config.
 */
export async function getWebhookManagerServiceFromCtx({
  appMetadata,
  channelSlug,
  authData,
}: {
  appMetadata: readonly MetadataItem[];
  channelSlug: string;
  authData: AuthData;
}) {
  const appConfigMetadataManager = AppConfigMetadataManager.createFromAuthData(authData);
  const appConfigResolver = new AppConfigResolver(appConfigMetadataManager);

  const appConfig = await appConfigResolver.resolve({ metadata: appMetadata });
  const activeProviderResolver = new ActiveProviderResolver(appConfig);
  const authorizeConfig = activeProviderResolver.resolve(channelSlug);

  const apiClient = createServerClient(authData.saleorApiUrl, authData.token);

  logger.trace(`Found authorizeConfig for channel ${channelSlug}`);

  const webhookManagerService = new WebhookManagerService({
    authorizeConfig,
    apiClient,
  });

  return webhookManagerService;
}
