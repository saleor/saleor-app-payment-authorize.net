import AuthorizeNet from "authorizenet";
import { z } from "zod";
import {
  authorizeEnvironmentSchema,
  type AuthorizeProviderConfig,
} from "../authorize-net/authorize-net-config";
import {
  HostedPaymentPageClient,
  type GetHostedPaymentPageResponse,
} from "../authorize-net/client/hosted-payment-page-client";
import { CustomerProfileManager } from "../customer-profile/customer-profile-manager";
import { type TransactionInitializeSessionEventFragment } from "generated/graphql";

import { BaseError } from "@/errors";
import { createLogger } from "@/lib/logger";
import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";

const ApiContracts = AuthorizeNet.APIContracts;

export const TransactionInitializeError = BaseError.subclass("TransactionInitializeError");

const TransactionInitializeUnexpectedDataError = TransactionInitializeError.subclass(
  "TransactionInitializeUnexpectedDataError",
);

const transactionInitializeSessionPayloadDataSchema = z.object({
  shouldCreateCustomerProfile: z.boolean().optional().default(false),
});

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
  private authorizeConfig: AuthorizeProviderConfig.FullShape;
  private customerProfileManager: CustomerProfileManager;

  private logger = createLogger({
    name: "TransactionInitializeSessionService",
  });

  constructor({ authorizeConfig }: { authorizeConfig: AuthorizeProviderConfig.FullShape }) {
    this.authorizeConfig = authorizeConfig;
    this.customerProfileManager = new CustomerProfileManager({
      authorizeConfig,
    });
  }

  private async buildTransactionFromPayload(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<AuthorizeNet.APIContracts.TransactionRequestType> {
    const transactionRequest = new ApiContracts.TransactionRequestType();
    transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHONLYTRANSACTION);
    transactionRequest.setAmount(payload.action.amount);

    const userEmail = payload.sourceObject.userEmail;

    if (!userEmail) {
      this.logger.trace("No user email found in payload, skipping customerProfileId lookup.");

      return transactionRequest;
    }

    const dataParseResult = transactionInitializeSessionPayloadDataSchema.safeParse(payload.data);

    if (!dataParseResult.success) {
      throw new TransactionInitializeUnexpectedDataError(
        "`data` object has unexpected structure.",
        {
          cause: dataParseResult.error,
        },
      );
    }

    const { shouldCreateCustomerProfile } = dataParseResult.data;

    if (!shouldCreateCustomerProfile) {
      this.logger.trace("Skipping customerProfileId lookup.");

      return transactionRequest;
    }

    this.logger.trace("Looking up customerProfileId.");

    const customerProfileId = await this.customerProfileManager.getUserCustomerProfileId({
      userEmail,
    });

    if (customerProfileId) {
      this.logger.trace("Found customerProfileId, adding to transaction request.");

      const profile = {
        customerProfileId,
      };

      transactionRequest.setProfile(profile);
    }

    this.logger.trace("Finished building transaction request.");

    return transactionRequest;
  }

  private mapResponseToWebhookData(
    response: GetHostedPaymentPageResponse,
  ): TransactionInitializeSessionResponseData {
    const dataParseResult = transactionInitializeSessionResponseDataSchema.safeParse({
      formToken: response.token,
      environment: this.authorizeConfig.environment,
    });

    if (!dataParseResult.success) {
      throw new TransactionInitializeUnexpectedDataError(
        "`data` object has unexpected structure.",
        {
          cause: dataParseResult.error,
        },
      );
    }

    return dataParseResult.data;
  }

  async execute(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<TransactionInitializeSessionResponse> {
    this.logger.debug(
      { id: payload.transaction?.id },
      "Getting hosted payment page settings for transaction",
    );

    const transactionInput = await this.buildTransactionFromPayload(payload);

    const hostedPaymentPageClient = new HostedPaymentPageClient(this.authorizeConfig);

    const hostedPaymentPageResponse =
      await hostedPaymentPageClient.getHostedPaymentPageRequest(transactionInput);

    this.logger.trace("Successfully called getHostedPaymentPageRequest");

    const data = this.mapResponseToWebhookData(hostedPaymentPageResponse);

    this.logger.trace("Successfully built webhook response data");

    return {
      amount: payload.action.amount,
      result: "AUTHORIZATION_ACTION_REQUIRED",
      data,
    };
  }
}
