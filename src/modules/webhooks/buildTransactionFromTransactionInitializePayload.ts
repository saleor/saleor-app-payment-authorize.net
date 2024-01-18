import AuthorizeNet from "authorizenet";
import { authorizeTransaction } from "../authorize-net/authorize-transaction-builder";

import { type TransactionInitializeSessionEventFragment } from "generated/graphql";
import { invariant } from "@/lib/invariant";

const ApiContracts = AuthorizeNet.APIContracts;

export function buildTransactionFromTransactionInitializePayload(
  payload: TransactionInitializeSessionEventFragment,
): AuthorizeNet.APIContracts.TransactionRequestType {
  const transactionRequest = authorizeTransaction.buildTransactionRequestFromTransactionFragment(
    payload.transaction,
  );

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
