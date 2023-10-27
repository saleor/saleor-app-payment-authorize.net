import { z } from "zod";
import AuthorizeNet from "authorizenet";
import { authorizeNetConfigSchema, type AuthorizeNetConfig } from "./authorize-net-config";
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
const transactionInitializePayloadDataSchema = z.object({
  dataDescriptor: z.string(),
  dataValue: z.string(),
});

const paymentGatewayInitializeResponseDataSchema = authorizeNetConfigSchema.pick({
  apiLoginId: true,
  environment: true,
  publicClientKey: true,
});

// This function doesn't know anything about the payment method
// todo: test
function buildTransactionFromPayload(
  payload: TransactionInitializeSessionEventFragment,
): AuthorizeNet.APIContracts.TransactionRequestType {
  const payloadDataParseResult = transactionInitializePayloadDataSchema.safeParse(payload.data);

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

  constructor(private config: AuthorizeNetConfig) {
    /* eslint-disable @typescript-eslint/no-unsafe-argument */
    this.client = new AuthorizeNetClient(config);
  }

  paymentGatewayInitializeSession(
    _payload: PaymentGatewayInitializeSessionEventFragment,
  ): SyncWebhookResponse<"PAYMENT_GATEWAY_INITIALIZE_SESSION"> {
    const dataParseResult = paymentGatewayInitializeResponseDataSchema.safeParse({
      apiLoginId: this.config.apiLoginId,
      environment: this.config.environment,
      publicClientKey: this.config.publicClientKey,
    });

    if (!dataParseResult.success) {
      throw new AuthorizeNetUnexpectedDataError("`data` object has unexpected structure.", {
        props: {
          detail: dataParseResult.error,
        },
      });
    }

    const data = dataParseResult.data;

    return {
      data,
    };
  }

  async transactionInitializeSession(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<SyncWebhookResponse<"TRANSACTION_INITIALIZE_SESSION">> {
    const transaction = buildTransactionFromPayload(payload);

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
  }
}
