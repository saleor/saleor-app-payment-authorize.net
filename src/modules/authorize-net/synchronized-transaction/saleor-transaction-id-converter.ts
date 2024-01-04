import { type GetTransactionDetailsResponse } from "../client/transaction-details-client";
import { type TransactionFragment } from "generated/graphql";

/**
 * What you can see below is a classic example of a hack.
 *
 * We need to pass the saleorTransactionId to Authorize.net transaction so that we can
 * later (in the Authorize → Saleor webhook) match the Authorize.net transaction with the Saleor transaction.
 *
 * The logical way to do it would be by using the `refId` field, but it's limited to 20 characters. Saleor transaction id is longer than that.
 * Thus, why we use the `order.description` field, which is limited to 255 characters.
 *
 * `transactionIdConverter` makes sure the format of the string is the same on both sides.
 */
export const saleorTransactionIdConverter = {
  fromSaleorTransaction(saleorTransaction: TransactionFragment) {
    // remove last two characters
    return saleorTransaction.id.slice(0, -2); // strip the last two "==" characters from the end of the string, as Authorize can't parse it 🤷
  },
  fromAuthorizeNetTransaction(authorizeTransaction: GetTransactionDetailsResponse) {
    const orderDescription = authorizeTransaction.transaction.order.description;
    return `${orderDescription}==`; // add the "==" characters back to the end of the string, so that it's a valid Saleor transaction ID.
  },
};
