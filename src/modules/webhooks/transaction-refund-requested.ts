import AuthorizeNet from "authorizenet";
import { type Client } from "urql";
import { type AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";
import { CreateTransactionClient } from "../authorize-net/client/create-transaction";
import { TransactionMetadataManager } from "../configuration/transaction-metadata-manager";
import { type MetadataItem, type TransactionRefundRequestedEventFragment } from "generated/graphql";

import { BaseError } from "@/errors";
import { createLogger } from "@/lib/logger";
import { type TransactionRefundRequestedResponse } from "@/schemas/TransactionRefundRequested/TransactionRefundRequestedResponse.mjs";

const ApiContracts = AuthorizeNet.APIContracts;

export const TransactionRefundRequestedError = BaseError.subclass(
  "TransactionRefundRequestedError",
);

export class TransactionRefundRequestedService {
  private authorizeConfig: AuthorizeProviderConfig.FullShape;
  private apiClient: Client;

  private logger = createLogger({
    name: "TransactionRefundRequestedService",
  });

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

  private async getTransactionIdFromMetadata({ metadata }: { metadata: readonly MetadataItem[] }) {
    const metadataManager = new TransactionMetadataManager({ apiClient: this.apiClient });
    const transactionId = await metadataManager.getAuthorizeTransactionId({ metadata });

    return transactionId;
  }

  private async buildTransactionFromPayload({
    authorizeTransactionId,
  }: {
    authorizeTransactionId: string;
  }): Promise<AuthorizeNet.APIContracts.TransactionRequestType> {
    const transactionRequest = new ApiContracts.TransactionRequestType();
    transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.VOIDTRANSACTION);
    transactionRequest.setRefTransId(authorizeTransactionId);

    return transactionRequest;
  }

  async execute(
    payload: TransactionRefundRequestedEventFragment,
  ): Promise<TransactionRefundRequestedResponse> {
    this.logger.debug({ id: payload.transaction?.id }, "Refunding the transaction");

    const saleorTransactionId = payload.transaction?.id;

    if (!saleorTransactionId) {
      throw new TransactionRefundRequestedError("Missing saleorTransactionId in payload");
    }

    const authorizeTransactionId = await this.getTransactionIdFromMetadata({
      metadata: payload.transaction.privateMetadata ?? [],
    });

    const transactionInput = await this.buildTransactionFromPayload({ authorizeTransactionId });

    const createTransactionClient = new CreateTransactionClient(this.authorizeConfig);

    await createTransactionClient.createTransaction(transactionInput);

    this.logger.debug("Successfully refunded the transaction");

    return {
      amount: 0, // todo: add
      pspReference: authorizeTransactionId,
      result: "REFUND_SUCCESS",
    };
  }
}
