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
import { type AppConfigMetadataManager } from "../configuration/app-config-metadata-manager";
import { type TransactionInitializeSessionEventFragment } from "generated/graphql";
import { type SyncWebhookResponse } from "@/lib/webhook-response-builder";
import { createLogger } from "@/lib/logger";
import { BaseError } from "@/errors";

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
  private authorizeConfig: AuthorizeProviderConfig.FullShape;
  private appConfigMetadataManager: AppConfigMetadataManager;
  private logger = createLogger({
    name: "TransactionInitializeSessionService",
  });

  constructor({
    authorizeConfig,
    appConfigMetadataManager,
  }: {
    authorizeConfig: AuthorizeProviderConfig.FullShape;
    appConfigMetadataManager: AppConfigMetadataManager;
  }) {
    this.authorizeConfig = authorizeConfig;
    this.appConfigMetadataManager = appConfigMetadataManager;
  }

  private getWebhookResponseData(
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

  // todo: make sure the email logic is correct
  private async getStoredCustomerProfileId({
    userEmail,
  }: {
    userEmail: string;
  }): Promise<string | undefined> {
    const appConfigurator = await this.appConfigMetadataManager.get();
    return appConfigurator.customerProfiles.getCustomerProfileByUserEmail({ userEmail });
  }

  private async buildTransactionFromPayload(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<AuthorizeNet.APIContracts.TransactionRequestType> {
    const transactionRequest = new ApiContracts.TransactionRequestType();
    transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHONLYTRANSACTION);
    transactionRequest.setAmount(payload.action.amount);

    const userEmail = payload.sourceObject.userEmail;

    if (!userEmail) {
      this.logger.trace("No user email found in payload, skipping customer profile id lookup.");

      return transactionRequest;
    }

    const customerProfileId = await this.getStoredCustomerProfileId({ userEmail });

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
    const transactionInput = await this.buildTransactionFromPayload(payload);
    const hostedPaymentPageClient = new HostedPaymentPageClient(this.authorizeConfig);
    const hostedPaymentPageResponse =
      await hostedPaymentPageClient.getHostedPaymentPageRequest(transactionInput);

    const data = this.getWebhookResponseData(hostedPaymentPageResponse);

    return {
      amount: payload.action.amount,
      result: "AUTHORIZATION_ACTION_REQUIRED",
      data,
    };
  }
}
