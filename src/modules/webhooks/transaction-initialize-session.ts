import AuthorizeNet from "authorizenet";
import { z } from "zod";
import { authorizeEnvironmentSchema } from "../authorize-net/authorize-net-config";
import {
  type AuthorizeNetClient,
  type GetHostedPaymentPageResponse,
} from "../authorize-net/authorize-net-client";
import { BaseError } from "@/errors";
import { type SyncWebhookResponse } from "@/lib/webhook-response-builder";
import { type TransactionInitializeSessionEventFragment } from "generated/graphql";

const ApiContracts = AuthorizeNet.APIContracts;

export const TransactionInitializeError = BaseError.subclass("TransactionInitializeError");

const TransactionInitializeUnexpectedDataError = TransactionInitializeError.subclass(
  "TransactionInitializeUnexpectedDataError",
);

/**
 * Authorize.net's payment form called Accept Hosted has to be initialized with `formToken`.
 * Read more: https://developer.authorize.net/api/reference/features/accept-hosted.html#Requesting_the_Form_Token
 */
const transactionInitializeSessionResponseDataSchema = z.object({
  formToken: z.string().min(1),
  environment: authorizeEnvironmentSchema,
});

type TransactionInitializeSessionResponseData = z.infer<
  typeof transactionInitializeSessionResponseDataSchema
>;

export class TransactionInitializeSessionService {
  constructor(private client: AuthorizeNetClient) {}

  private resolveResponseData(
    response: GetHostedPaymentPageResponse,
  ): TransactionInitializeSessionResponseData {
    const dataParseResult = transactionInitializeSessionResponseDataSchema.safeParse({
      formToken: response.token,
      environment: this.client.config.environment,
    });

    if (!dataParseResult.success) {
      throw new TransactionInitializeUnexpectedDataError(
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

  // todo: make sure the email logic is correct
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private getStoredCustomerProfileId({
    userEmail,
  }: {
    userEmail: string | undefined | null;
  }): string | undefined {
    if (!userEmail) {
      return undefined;
    }
    // todo: fetch the app metadata for userEmail x customerProfileId pairs
    return undefined;
  }

  private buildTransactionFromPayload(
    payload: TransactionInitializeSessionEventFragment,
  ): AuthorizeNet.APIContracts.TransactionRequestType {
    const transactionRequest = new ApiContracts.TransactionRequestType();
    transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHONLYTRANSACTION);
    transactionRequest.setAmount(payload.action.amount);

    const userEmail = payload.sourceObject.userEmail;
    const customerProfileId = this.getStoredCustomerProfileId({ userEmail });

    if (customerProfileId) {
      const profile = new ApiContracts.CustomerProfileIdType();
      profile.setCustomerProfileId(customerProfileId);
      transactionRequest.setProfile(profile);
    }

    return transactionRequest;
  }

  async execute(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<SyncWebhookResponse<"TRANSACTION_INITIALIZE_SESSION">> {
    const transactionInput = this.buildTransactionFromPayload(payload);
    const hostedPaymentPageResponse =
      await this.client.getHostedPaymentPageRequest(transactionInput);

    const data = this.resolveResponseData(hostedPaymentPageResponse);

    return {
      amount: payload.action.amount,
      result: "AUTHORIZATION_ACTION_REQUIRED",
      data,
    };
  }
}
