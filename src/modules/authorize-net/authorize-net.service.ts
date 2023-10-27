import { z } from "zod";
import AuthorizeNet from "authorizenet";
import { type AuthorizeNetConfig } from "./authorize-net-config";
import { AuthorizeNetClient } from "./authorize-net-client";
import { AuthorizeNetUnexpectedDataError } from "./authorize-net-error";
import { createLogger } from "@/lib/logger";
import { type SyncWebhookResponse } from "@/lib/webhook-response";
import {
  type PaymentGatewayInitializeSessionEventFragment,
  type TransactionInitializeSessionEventFragment,
} from "generated/graphql";

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
// todo: test
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

interface PaymentsWebhooks {
  transactionInitializeSession: (
    payload: TransactionInitializeSessionEventFragment,
  ) => Promise<SyncWebhookResponse<"TRANSACTION_INITIALIZE_SESSION">>;
  paymentGatewayInitializeSession: (
    payload: PaymentGatewayInitializeSessionEventFragment,
  ) => SyncWebhookResponse<"PAYMENT_GATEWAY_INITIALIZE_SESSION">;
}

export class AuthorizeNetService implements PaymentsWebhooks {
  private client: AuthorizeNetClient;
  private logger = createLogger({
    name: "AuthorizeNetService",
  });

  constructor(config: AuthorizeNetConfig) {
    /* eslint-disable @typescript-eslint/no-unsafe-argument */
    this.client = new AuthorizeNetClient(config);
  }

  //   todo: replace with real response
  paymentGatewayInitializeSession(
    payload: PaymentGatewayInitializeSessionEventFragment,
  ): SyncWebhookResponse<"PAYMENT_GATEWAY_INITIALIZE_SESSION"> {
    console.log(payload);
    return {
      data: {
        foo: "bar",
      },
    };
  }

  async transactionInitializeSession(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<SyncWebhookResponse<"TRANSACTION_INITIALIZE_SESSION">> {
    const transaction = buildTransactionFromPayload(payload);

    const response = await this.client.createTransaction(transaction);
    this.logger.debug({ response }, "transactionInitializeSession");

    // todo: revisit response
    return {
      amount: payload.action.amount,
      result: "CHARGE_SUCCESS",
      data: {
        foo: "bar",
      },
      message: "Success",
      // externalUrl: "https://example.com",
      // pspReference: "pspReference",
      // time: "",
    };
  }
}
