import AuthorizeNet from "authorizenet";
import { authorizeTransaction } from "../authorize-net/authorize-transaction-builder";
import { CreateTransactionClient } from "../authorize-net/client/create-transaction";
import { BaseError } from "@/errors";
import { createLogger } from "@/lib/logger";
import { type TransactionProcessSessionResponse } from "@/schemas/TransactionProcessSession/TransactionProcessSessionResponse.mjs";
import { type TransactionProcessSessionEventFragment } from "generated/graphql";

const ApiContracts = AuthorizeNet.APIContracts;

export const TransactionProcessError = BaseError.subclass("TransactionProcessError");

export const TransactionProcessUnexpectedDataError = TransactionProcessError.subclass(
  "TransactionProcessUnexpectedDataError",
);

export class TransactionProcessSessionService {
  private logger = createLogger({
    name: "TransactionProcessSessionService",
  });

  private buildTransactionFromPayload(payload: TransactionProcessSessionEventFragment) {
    const transactionRequest = authorizeTransaction.buildTransactionRequestFromTransactionFragment(
      payload.transaction,
    );

    transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHONLYTRANSACTION);

    return transactionRequest;
  }

  async execute(
    payload: TransactionProcessSessionEventFragment,
  ): Promise<TransactionProcessSessionResponse> {
    this.logger.debug({ id: payload.transaction?.id }, "Mapping the state of transaction");

    // todo: decide whether I can take it from transaction pspReference? or from metadata
    const authorizeTransactionId = payload.transaction.pspReference;

    const createTransactionClient = new CreateTransactionClient();
    const transactionRequest = this.buildTransactionFromPayload(payload);
    await createTransactionClient.createTransaction(transactionRequest);

    return {
      amount: payload.action.amount,
      result: "AUTHORIZATION_SUCCESS",
      actions: [],
      message: "",
      pspReference: authorizeTransactionId,
    };
  }
}
