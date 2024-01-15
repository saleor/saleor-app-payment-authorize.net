import AuthorizeNet from "authorizenet";
import { transactionId } from "./transaction-id-utils";
import {
  type AddressFragment,
  type OrderOrCheckoutFragment,
  type TransactionFragment,
} from "generated/graphql";

const ApiContracts = AuthorizeNet.APIContracts;

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
      lineItem.setItemId(line.id.slice(0, 30));
      if (line.__typename === "CheckoutLine") {
        lineItem.setName(line.checkoutVariant.product.name);
      }

      if (line.__typename === "OrderLine") {
        lineItem.setName(line.orderVariant?.product.name);
      }

      lineItem.setQuantity(line.quantity);
      lineItem.setUnitPrice(line.totalPrice.gross.amount);

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
    billTo.setPhoneNumber(fragment.phone);

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

  buildPoNumber(fragment: OrderOrCheckoutFragment) {
    if (fragment.__typename === "Checkout") {
      return "";
    }

    return fragment.number;
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
