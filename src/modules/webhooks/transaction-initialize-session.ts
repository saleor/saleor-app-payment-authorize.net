import AuthorizeNet from "authorizenet";
import { authorizeTransaction } from "../authorize-net/authorize-transaction-builder";
import { CreateTransactionClient } from "../authorize-net/client/create-transaction";
import { type ExternalPaymentGateway } from "./payment-gateway-initialize-session";
import { type TransactionInitializeSessionEventFragment } from "generated/graphql";

import { invariant } from "@/lib/invariant";
import { createLogger } from "@/lib/logger";
import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";

const ApiContracts = AuthorizeNet.APIContracts;

export class TransactionInitializeSessionService {
  private logger = createLogger({
    name: "TransactionInitializeSessionService",
  });

  constructor(private paymentGateway: ExternalPaymentGateway) {}

  private async buildTransactionFromPayload(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<AuthorizeNet.APIContracts.TransactionRequestType> {
    const transactionRequest = await this.paymentGateway.buildTransactionRequest(payload);

    transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHONLYTRANSACTION);
    transactionRequest.setAmount(payload.action.amount);

    const lineItems = authorizeTransaction.buildLineItemsFromOrderOrCheckout(payload.sourceObject);
    transactionRequest.setLineItems(lineItems);

    invariant(payload.sourceObject.billingAddress, "Billing address is missing from payload.");
    const billTo = authorizeTransaction.buildBillTo(payload.sourceObject.billingAddress);
    transactionRequest.setBillTo(billTo);

    invariant(payload.sourceObject.shippingAddress, "Shipping address is missing from payload.");
    const shipTo = authorizeTransaction.buildShipTo(payload.sourceObject.shippingAddress);
    transactionRequest.setShipTo(shipTo);

    const poNumber = authorizeTransaction.buildPoNumber(payload.sourceObject);
    transactionRequest.setPoNumber(poNumber);

    return transactionRequest;
  }

  async execute(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<TransactionInitializeSessionResponse> {
    const transactionRequest = await this.buildTransactionFromPayload(payload);

    const createTransactionClient = new CreateTransactionClient();
    await createTransactionClient.createTransaction(transactionRequest);

    this.logger.debug("Successfully created the transaction");

    const amount = payload.transaction.authorizedAmount.amount;

    return {
      amount,
      result: "AUTHORIZATION_SUCCESS",
      data: {},
    };
  }
}
