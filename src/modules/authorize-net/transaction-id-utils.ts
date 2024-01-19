import { type GetTransactionDetailsResponse } from "./client/transaction-details-client";
import { invariant } from "@/lib/invariant";
import { type TransactionFragment } from "generated/graphql";

/**
 * We need to pass the saleorTransactionId to Authorize.net transaction so that we can
 * later (in the Authorize → Saleor webhook) match the Authorize.net transaction with the Saleor transaction.
 *
 * The logical way to do it would be by using the `refId` field, but it's limited to 20 characters. Saleor transaction id is longer than that.
 * Thus, why we use the `order.description` field, which is limited to 255 characters.
 *
 * `transactionIdConverter` makes sure the format of the string is the same on both sides.
 */
const saleorTransactionIdConverter = {
  fromSaleorTransaction(saleorTransaction: TransactionFragment) {
    return btoa(saleorTransaction.id); // we need to encode the string to base64, because Authorize.net can't parse the "=" character that is in the Saleor transaction ID
  },
  fromAuthorizeNetTransaction(authorizeTransaction: GetTransactionDetailsResponse) {
    const orderDescription = authorizeTransaction.transaction.order?.description; // we need to decode it back to use the Saleor transaction ID

    invariant(orderDescription, "Missing order description in transaction");
    return atob(orderDescription);
  },
};

function resolveAuthorizeTransactionIdFromTransaction(transaction: TransactionFragment) {
  return transaction.pspReference;
}

export const transactionId = {
  saleorTransactionIdConverter,
  resolveAuthorizeTransactionId: resolveAuthorizeTransactionIdFromTransaction,
};
