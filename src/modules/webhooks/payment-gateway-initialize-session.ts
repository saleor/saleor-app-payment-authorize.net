import AuthorizeNet from "authorizenet";
import { z } from "zod";
import {
  type AuthorizeNetClient,
  type GetHostedPaymentPageResponse,
} from "../authorize-net/authorize-net-client";
import { authorizeEnvironmentSchema } from "../authorize-net/authorize-net-config";
import { BaseError } from "@/errors";

import { type SyncWebhookResponse } from "@/lib/webhook-response-builder";
import { type PaymentGatewayInitializeSessionEventFragment } from "generated/graphql";

const ApiContracts = AuthorizeNet.APIContracts;

export const PaymentGatewayInitializeError = BaseError.subclass("PaymentGatewayInitializeError");

const PaymentGatewayInitializeUnexpectedDataError = PaymentGatewayInitializeError.subclass(
  "PaymentGatewayInitializeUnexpectedDataError",
);

/**
 * Authorize.net's payment form called Accept Hosted has to be initialized with `formToken`.
 * Read more: https://developer.authorize.net/api/reference/features/accept-hosted.html#Requesting_the_Form_Token
 */
const paymentGatewayInitializeResponseDataSchema = z.object({
  formToken: z.string().min(1),
  environment: authorizeEnvironmentSchema,
});

type PaymentGatewayInitializeResponseData = z.infer<
  typeof paymentGatewayInitializeResponseDataSchema
>;

function buildTransactionFromPayload(
  payload: PaymentGatewayInitializeSessionEventFragment,
): AuthorizeNet.APIContracts.TransactionRequestType {
  const transactionRequest = new ApiContracts.TransactionRequestType();
  transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHONLYTRANSACTION);
  transactionRequest.setAmount(payload.amount);

  return transactionRequest;
}

export class PaymentGatewayInitializeSessionService {
  constructor(private client: AuthorizeNetClient) {}

  private resolveResponseData(
    response: GetHostedPaymentPageResponse,
  ): PaymentGatewayInitializeResponseData {
    const dataParseResult = paymentGatewayInitializeResponseDataSchema.safeParse({
      formToken: response.token,
      environment: this.client.config.environment,
    });

    if (!dataParseResult.success) {
      throw new PaymentGatewayInitializeUnexpectedDataError(
        "`data` object has unexpected structure.",
        {
          props: {
            detail: dataParseResult.error,
          },
        },
      );
    }

    return dataParseResult.data;
  }

  async execute(
    payload: PaymentGatewayInitializeSessionEventFragment,
  ): Promise<SyncWebhookResponse<"PAYMENT_GATEWAY_INITIALIZE_SESSION">> {
    const transactionInput = buildTransactionFromPayload(payload);
    const hostedPaymentPageResponse =
      await this.client.getHostedPaymentPageRequest(transactionInput);

    const data = this.resolveResponseData(hostedPaymentPageResponse);

    return {
      data,
    };
  }
}
