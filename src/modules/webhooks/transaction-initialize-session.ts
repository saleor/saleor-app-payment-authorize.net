import AuthorizeNet from "authorizenet";
import { getAuthorizeConfig, type AuthorizeConfig } from "../authorize-net/authorize-net-config";
import { AuthorizeTransactionBuilder } from "../authorize-net/authorize-transaction-builder";
import { type TransactionInitializeSessionEventFragment } from "generated/graphql";

import { invariant } from "@/lib/invariant";
import { createLogger } from "@/lib/logger";
import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";

const ApiContracts = AuthorizeNet.APIContracts;

export class TransactionInitializeSessionService {
  private _authorizeConfig: AuthorizeConfig;

  private _logger = createLogger({
    name: "TransactionInitializeSessionService",
  });

  constructor() {
    this._authorizeConfig = getAuthorizeConfig();
  }

  private buildTransactionFromPayload(
    payload: TransactionInitializeSessionEventFragment,
  ): AuthorizeNet.APIContracts.TransactionRequestType {
    const transactionBuilder = new AuthorizeTransactionBuilder();
    const transactionRequest = transactionBuilder.buildTransactionRequestFromTransactionFragment(
      payload.transaction,
    );

    transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHONLYTRANSACTION);
    transactionRequest.setAmount(payload.action.amount);

    const lineItems = transactionBuilder.buildLineItemsFromOrderOrCheckout(payload.sourceObject);
    transactionRequest.setLineItems(lineItems);

    invariant(payload.sourceObject.billingAddress, "Billing address is missing from payload.");
    const billTo = transactionBuilder.buildBillTo(payload.sourceObject.billingAddress);
    transactionRequest.setBillTo(billTo);

    invariant(payload.sourceObject.shippingAddress, "Shipping address is missing from payload.");
    const shipTo = transactionBuilder.buildShipTo(payload.sourceObject.shippingAddress);
    transactionRequest.setShipTo(shipTo);

    const poNumber = transactionBuilder.buildPoNumber(payload.sourceObject);
    transactionRequest.setPoNumber(poNumber);

    return transactionRequest;
  }

  async execute(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<TransactionInitializeSessionResponse> {
    const _transaction = this.buildTransactionFromPayload(payload);
    // todo: add implementation
    return {
      amount: payload.action.amount,
      result: "AUTHORIZATION_ACTION_REQUIRED",
      data: {},
    };
  }
}
