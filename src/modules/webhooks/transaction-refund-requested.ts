import AuthorizeNet from "authorizenet";
import { type Client } from "urql";
import { CreateTransactionClient } from "../authorize-net/client/create-transaction";

import { transactionId } from "../authorize-net/transaction-id-utils";
import { buildAuthorizeTransactionRequest } from "../authorize-net/authorize-transaction-builder";
import { type TransactionRefundRequestedEventFragment } from "generated/graphql";

import { BaseError } from "@/errors";
import { invariant } from "@/lib/invariant";
import { createLogger } from "@/lib/logger";
import { type TransactionRefundRequestedResponse } from "@/schemas/TransactionRefundRequested/TransactionRefundRequestedResponse.mjs";

const ApiContracts = AuthorizeNet.APIContracts;

export const TransactionRefundRequestedError = BaseError.subclass(
  "TransactionRefundRequestedError",
);

export class TransactionRefundRequestedService {
  private apiClient: Client;

  private logger = createLogger({
    name: "TransactionRefundRequestedService",
  });

  constructor({ apiClient }: { apiClient: Client }) {
    this.apiClient = apiClient;
  }

  private async buildTransactionFromPayload({
    authorizeTransactionId,
    saleorTransactionId,
  }: {
    authorizeTransactionId: string;
    saleorTransactionId: string;
  }): Promise<AuthorizeNet.APIContracts.TransactionRequestType> {
    const transactionRequest = buildAuthorizeTransactionRequest({
      saleorTransactionId,
      authorizeTransactionId,
    });

    transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.VOIDTRANSACTION);

    return transactionRequest;
  }

  async execute(
    payload: TransactionRefundRequestedEventFragment,
  ): Promise<TransactionRefundRequestedResponse> {
    this.logger.debug({ id: payload.transaction?.id }, "Refunding the transaction");

    invariant(payload.transaction, "Transaction is missing");

    const authorizeTransactionId = transactionId.resolveAuthorizeTransactionId(payload.transaction);
    const saleorTransactionId = transactionId.saleorTransactionIdConverter.fromSaleorTransaction(
      payload.transaction,
    );

    if (!authorizeTransactionId) {
      // todo: replace with custom error
      throw new TransactionRefundRequestedError(
        "Transaction metadata is missing authorizeTransactionId",
      );
    }

    const transactionInput = await this.buildTransactionFromPayload({
      authorizeTransactionId,
      saleorTransactionId,
    });

    const createTransactionClient = new CreateTransactionClient();

    await createTransactionClient.createTransaction(transactionInput);

    this.logger.debug("Successfully refunded the transaction");

    return {
      amount: 0, // todo: add
      pspReference: authorizeTransactionId,
      result: "REFUND_SUCCESS",
    };
  }
}
