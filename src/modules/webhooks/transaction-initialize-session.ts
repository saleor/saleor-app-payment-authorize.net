import AuthorizeNet from "authorizenet";
import { z } from "zod";
import { type AuthorizeNetClient } from "../authorize-net/authorize-net-client";
import { BaseError } from "@/errors";
import { type SyncWebhookResponse } from "@/lib/webhook-response";
import { type TransactionInitializeSessionEventFragment } from "generated/graphql";

const ApiContracts = AuthorizeNet.APIContracts;

export const TransactionInitializeError = BaseError.subclass("TransactionInitializeError");

export const TransactionInitializeUnexpectedDataError = TransactionInitializeError.subclass(
  "TransactionInitializeUnexpectedDataError",
);

/**
 * `payload.data` is app-agnostic stringified JSON object we need to parse to make sure it has the expected structure.
 * To be able to create the transaction, Authorize App expects to receive Accept Payment nonce in the `event.data` object.
 * @see https://developer.authorize.net/api/reference/index.html#accept-suite-create-an-accept-payment-transaction
 * todo: Look into moving to Saleor provided JSON schema validation
 */
const transactionInitializePayloadDataSchema = z.object({
  dataDescriptor: z.string(),
  dataValue: z.string(),
});

// This function doesn't know anything about the payment method
// todo: test
function buildTransactionFromPayload(
  payload: TransactionInitializeSessionEventFragment,
): AuthorizeNet.APIContracts.TransactionRequestType {
  const payloadDataParseResult = transactionInitializePayloadDataSchema.safeParse(payload.data);

  if (!payloadDataParseResult.success) {
    throw new TransactionInitializeUnexpectedDataError("`data` object has unexpected structure.", {
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

export class TransactionInitializeSessionService {
  private client: AuthorizeNetClient;

  constructor(client: AuthorizeNetClient) {
    this.client = client;
  }

  async execute(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<SyncWebhookResponse<"TRANSACTION_INITIALIZE_SESSION">> {
    const transaction = buildTransactionFromPayload(payload);

    try {
      await this.client.createTransaction(transaction);

      // todo: revisit response
      return {
        amount: payload.action.amount,
        result: "AUTHORIZATION_SUCCESS",
        data: {
          foo: "bar",
        },
        message: "Success",
        // externalUrl: "https://example.com",
        // pspReference: "pspReference",
        // time: "",
      };
    } catch (error) {
      throw TransactionInitializeError.normalize(error);
    }
  }
}
