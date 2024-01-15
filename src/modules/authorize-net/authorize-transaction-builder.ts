import AuthorizeNet from "authorizenet";
import { transactionId } from "./transaction-id-utils";
import { type OrderOrCheckoutFragment, type TransactionFragment } from "generated/graphql";

const ApiContracts = AuthorizeNet.APIContracts;

// todo:
// - [ ] - order data
// - [x] - line data
// - [ ] - tax data
// - [ ] - shipping amount
// - [ ] - customer data

/**
 *
 * @description This function is used to build a "synchronized" Authorize.net transaction.
 * Synchronization means that it has a reference to the original transaction (if there was a prior transaction), as well as to the Saleor transaction.
 */
export function buildAuthorizeTransactionRequest({
  saleorTransactionId,
  authorizeTransactionId,
}: {
  saleorTransactionId: string;
  authorizeTransactionId: string | undefined;
}) {
  const transactionRequest = new ApiContracts.TransactionRequestType();

  if (authorizeTransactionId) {
    // refTransId is the transaction ID of the original transaction being referenced.
    transactionRequest.setRefTransId(authorizeTransactionId);
  }

  const order = new ApiContracts.OrderType();
  order.setDescription(saleorTransactionId);

  transactionRequest.setOrder(order);

  return transactionRequest;
}

export class AuthorizeTransactionBuilder {
  buildLineItemsFromOrderOrCheckout(
    fragment: OrderOrCheckoutFragment,
  ): AuthorizeNet.APIContracts.ArrayOfLineItem {
    const lineItems = fragment.lines.map((line) => {
      const lineItem = new ApiContracts.LineItemType();
      lineItem.setItemId(line.id);
      lineItem.setQuantity(line.quantity);
      lineItem.setTotalAmount(line.totalPrice.gross.amount);

      return lineItem;
    });

    const arrayOfLineItems = new ApiContracts.ArrayOfLineItem();
    arrayOfLineItems.setLineItem(lineItems);

    return arrayOfLineItems;
  }

  buildTransactionRequestFromTransactionFragment(
    fragment: TransactionFragment,
  ): AuthorizeNet.APIContracts.TransactionRequestType {
    const authorizeTransactionId = transactionId.resolveAuthorizeTransactionId(fragment);
    const saleorTransactionId =
      transactionId.saleorTransactionIdConverter.fromSaleorTransaction(fragment);

    return buildAuthorizeTransactionRequest({
      authorizeTransactionId,
      saleorTransactionId,
    });
  }
}
