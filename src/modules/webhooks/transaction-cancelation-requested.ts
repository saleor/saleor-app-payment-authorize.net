import AuthorizeNet from "authorizenet";
import { type AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";
import { CreateTransactionClient } from "../authorize-net/client/create-transaction";
import { type TransactionCancelationRequestedEventFragment } from "generated/graphql";

import { BaseError } from "@/errors";
import { createLogger } from "@/lib/logger";
import { type TransactionCancelationRequestedResponse } from "@/schemas/TransactionCancelationRequested/TransactionCancelationRequestedResponse.mjs";

const ApiContracts = AuthorizeNet.APIContracts;

export const TransactionCancelationRequestedError = BaseError.subclass(
  "TransactionCancelationRequestedError",
);

export class TransactionCancelationRequestedService {
  private authorizeConfig: AuthorizeProviderConfig.FullShape;

  private logger = createLogger({
    name: "TransactionCancelationRequestedService",
  });

  constructor({ authorizeConfig }: { authorizeConfig: AuthorizeProviderConfig.FullShape }) {
    this.authorizeConfig = authorizeConfig;
  }

  private async buildTransactionFromPayload(
    _payload: TransactionCancelationRequestedEventFragment,
  ): Promise<AuthorizeNet.APIContracts.TransactionRequestType> {
    const transactionRequest = new ApiContracts.TransactionRequestType();
    transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.VOIDTRANSACTION);
    transactionRequest.setRefTransId(""); // todo: store & get transaction id

    return transactionRequest;
  }

  async execute(
    payload: TransactionCancelationRequestedEventFragment,
  ): Promise<TransactionCancelationRequestedResponse> {
    this.logger.debug({ id: payload.transaction?.id }, "Called execute with");

    const transactionInput = await this.buildTransactionFromPayload(payload);

    const createTransactionClient = new CreateTransactionClient(this.authorizeConfig);

    await createTransactionClient.createTransaction(transactionInput);

    this.logger.trace("Successfully called createTransaction");

    return {
      pspReference: "", // todo: add transaction id
      result: "CANCEL_SUCCESS",
    };
  }
}
