import AuthorizeNet from "authorizenet";

export const ApiContracts = AuthorizeNet.APIContracts;

/**
 *
 * @description This function creates a transaction request that will include information needed to connect a Saleor transaction with an Authorize.net transaction.
 * The saleorTransactionId is stored in the description field of the Authorize.net transaction. This is a hack. Unfortunately, no other field is fitting because the
 * `refId` field is max. 20 characters long.
 */

export function createSynchronizedTransactionRequest({
  saleorTransactionId,
  authorizeTransactionId,
}: {
  saleorTransactionId: string;
  authorizeTransactionId?: string;
}) {
  const transactionRequest = new ApiContracts.TransactionRequestType();

  if (authorizeTransactionId) {
    transactionRequest.setRefTransId(authorizeTransactionId);
  }

  const order = new ApiContracts.OrderType();
  order.setDescription(saleorTransactionId);

  transactionRequest.setOrder(order);

  return transactionRequest;
}
