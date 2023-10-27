import AuthorizeNet from "authorizenet";
import { z } from "zod";
import { AuthorizeNetUnexpectedDataError } from "./authorize-net-error";
import { type TransactionInitializeSessionEventFragment } from "generated/graphql";

const ApiContracts = AuthorizeNet.APIContracts;

/**
 * `payload.data` is app-agnostic stringified JSON object we need to parse to make sure it has the expected structure.
 * To be able to create the transaction, Authorize App expects to receive Accept Payment nonce in the `event.data` object.
 * @see https://developer.authorize.net/api/reference/index.html#accept-suite-create-an-accept-payment-transaction
 */
const payloadDataSchema = z.object({
  dataDescriptor: z.string(),
  dataValue: z.string(),
});

// This function doesn't know anything about the payment method
function buildTransactionFromPayload(
  payload: TransactionInitializeSessionEventFragment,
): AuthorizeNet.APIContracts.TransactionRequestType {
  const payloadDataParseResult = payloadDataSchema.safeParse(payload.data);

  if (!payloadDataParseResult.success) {
    throw new AuthorizeNetUnexpectedDataError("`data` object has unexpected structure.", {
      props: {
        detail: payloadDataParseResult.error,
      },
    });
  }

  const paymentNonce = payloadDataParseResult.data;

  const opaqueData = new ApiContracts.OpaqueDataType();
  opaqueData.setDataDescriptor(paymentNonce.dataDescriptor);
  opaqueData.setDataValue(paymentNonce.dataValue);

  const payment = new ApiContracts.PaymentType();
  payment.setOpaqueData(opaqueData);

  const transactionRequest = new ApiContracts.TransactionRequestType();
  transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
  transactionRequest.setAmount(payload.action.amount);
  transactionRequest.setPayment(payment);

  return transactionRequest;
}

export const transactionBuilder = {
  buildTransactionFromPayload,
};
