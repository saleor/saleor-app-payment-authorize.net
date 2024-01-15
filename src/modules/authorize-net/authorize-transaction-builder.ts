import AuthorizeNet from "authorizenet";
import { transactionId } from "./transaction-id-utils";
import {
  type AddressFragment,
  type OrderOrCheckoutFragment,
  type TransactionFragment,
} from "generated/graphql";

const ApiContracts = AuthorizeNet.APIContracts;

// todo:
// - [ ] - order data
// - [x] - line data
// - [ ] - tax data
// - [x] - shipping address
// - [x] - billing address
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

  private concatAddressLines(address: AddressFragment) {
    return `${address.streetAddress1} ${address.streetAddress2}`;
  }

  buildBillTo(fragment: AddressFragment) {
    const billTo = new ApiContracts.CustomerAddressType();

    billTo.setFirstName(fragment.firstName);
    billTo.setLastName(fragment.lastName);
    billTo.setAddress(this.concatAddressLines(fragment));
    billTo.setCity(fragment.city);
    billTo.setState(fragment.countryArea);
    billTo.setZip(fragment.postalCode);
    billTo.setCountry(fragment.country.code);

    return billTo;
  }

  buildShipTo(fragment: AddressFragment) {
    const shipTo = new ApiContracts.CustomerAddressType();

    shipTo.setFirstName(fragment.firstName);
    shipTo.setLastName(fragment.lastName);
    shipTo.setAddress(this.concatAddressLines(fragment));
    shipTo.setCity(fragment.city);
    shipTo.setState(fragment.countryArea);
    shipTo.setZip(fragment.postalCode);
    shipTo.setCountry(fragment.country.code);

    return shipTo;
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
