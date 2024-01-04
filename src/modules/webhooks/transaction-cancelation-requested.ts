import AuthorizeNet from "authorizenet";
import { type Client } from "urql";
import { type AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";
import { CreateTransactionClient } from "../authorize-net/client/create-transaction";
import { SynchronizedTransactionIdResolver } from "../authorize-net/synchronized-transaction/synchronized-transaction-id-resolver";
import { createSynchronizedTransactionRequest } from "../authorize-net/synchronized-transaction/create-synchronized-transaction-request";
import { type TransactionCancelationRequestedEventFragment } from "generated/graphql";

import { BaseError } from "@/errors";
import { invariant } from "@/lib/invariant";
import { createLogger } from "@/lib/logger";
import { type TransactionCancelationRequestedResponse } from "@/schemas/TransactionCancelationRequested/TransactionCancelationRequestedResponse.mjs";

const ApiContracts = AuthorizeNet.APIContracts;

export const TransactionCancelationRequestedError = BaseError.subclass(
  "TransactionCancelationRequestedError",
);

export class TransactionCancelationRequestedService {
  private authorizeConfig: AuthorizeProviderConfig.FullShape;
  private apiClient: Client;

  private logger = createLogger({
    name: "TransactionCancelationRequestedService",
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

  private async buildTransactionFromPayload({
    authorizeTransactionId,
    saleorTransactionId,
  }: {
    authorizeTransactionId: string;
    saleorTransactionId: string;
  }): Promise<AuthorizeNet.APIContracts.TransactionRequestType> {
    const transactionRequest = createSynchronizedTransactionRequest({
      saleorTransactionId,
      authorizeTransactionId,
    });

    transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.VOIDTRANSACTION);

    return transactionRequest;
  }

  async execute(
    payload: TransactionCancelationRequestedEventFragment,
  ): Promise<TransactionCancelationRequestedResponse> {
    this.logger.debug({ id: payload.transaction?.id }, "Canceling transaction");

    invariant(payload.transaction, "Transaction is missing");

    const idResolver = new SynchronizedTransactionIdResolver(this.apiClient);
    const { saleorTransactionId, authorizeTransactionId } = await idResolver.resolveFromTransaction(
      payload.transaction,
    );

    const transactionInput = await this.buildTransactionFromPayload({
      authorizeTransactionId,
      saleorTransactionId,
    });

    const createTransactionClient = new CreateTransactionClient(this.authorizeConfig);

    await createTransactionClient.createTransaction(transactionInput);

    this.logger.debug("Successfully voided the transaction");

    const amount = payload.transaction.authorizedAmount.amount;

    return {
      amount,
      pspReference: authorizeTransactionId,
      result: "CANCEL_SUCCESS",
    };
  }
}
