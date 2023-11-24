import { z } from "zod";
import { type AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";
import { TransactionDetailsClient } from "../authorize-net/client/transaction-details-client";
import { type AppConfigMetadataManager } from "../configuration/app-config-metadata-manager";
import { type TransactionProcessSessionEventFragment } from "generated/graphql";
import { type SyncWebhookResponse } from "@/lib/webhook-response-builder";
import { BaseError } from "@/errors";

export const TransactionProcessError = BaseError.subclass("TransactionProcessError");

export const TransactionProcessUnexpectedDataError = TransactionProcessError.subclass(
  "TransactionProcessUnexpectedDataError",
);

type TransactionProcessWebhookResponse = SyncWebhookResponse<"TRANSACTION_PROCESS_SESSION">;

type PossibleTransactionResult = Extract<
  TransactionProcessWebhookResponse["result"],
  "AUTHORIZATION_ACTION_REQUIRED" | "AUTHORIZATION_REQUESTED"
>;

const transactionProcessPayloadDataSchema = z.object({
  transactionId: z.string().min(1),
  customerProfileId: z.string().min(1).optional(),
});

export class TransactionProcessSessionService {
  private appConfigMetadataManager: AppConfigMetadataManager;
  private authorizeConfig: AuthorizeProviderConfig.FullShape;

  constructor({
    appConfigMetadataManager,
    authorizeConfig,
  }: {
    appConfigMetadataManager: AppConfigMetadataManager;
    authorizeConfig: AuthorizeProviderConfig.FullShape;
  }) {
    this.appConfigMetadataManager = appConfigMetadataManager;
    this.authorizeConfig = authorizeConfig;
  }

  /**
   * @description If customerProfileId was passed from Accept Hosted form, updates the stored customerProfileId x userEmail mapping.
   * @param customerProfileId - Authorize.net customerProfileId
   * @param userEmail - Saleor user email
   */
  private async updateCustomerProfileId({
    customerProfileId,
    userEmail,
  }: {
    customerProfileId: string;
    userEmail: string;
  }) {
    const appConfigurator = await this.appConfigMetadataManager.get();
    appConfigurator.customerProfiles.upsertCustomerProfile({
      authorizeCustomerProfileId: customerProfileId,
      saleorUserEmail: userEmail,
    });

    await this.appConfigMetadataManager.set(appConfigurator);
  }

  /**
   * @description Calls the Authorize.net API to get the transaction status. Maps Authorize settlement state to Saleor transaction result.
   * @param transactionId - Authorize.net transactionId
   * @returns Possible transaction result
   */
  private async resolveTransactionResult({
    transactionId,
  }: {
    transactionId: string;
  }): Promise<PossibleTransactionResult> {
    const transactionDetailsClient = new TransactionDetailsClient(this.authorizeConfig);
    const transactionDetails = await transactionDetailsClient.getTransactionDetailsRequest({
      transactionId,
    });
    const { transactionStatus } = transactionDetails.transaction;

    // todo: confirm if this is the correct mapping
    if (transactionStatus === "authorizedPendingCapture") {
      return "AUTHORIZATION_REQUESTED";
    }

    if (transactionStatus === "FDSPendingReview") {
      return "AUTHORIZATION_ACTION_REQUIRED";
    }

    throw new TransactionProcessError(`Unexpected transaction status: ${transactionStatus}`);
  }

  async execute(
    payload: TransactionProcessSessionEventFragment,
  ): Promise<TransactionProcessWebhookResponse> {
    const dataParseResult = transactionProcessPayloadDataSchema.safeParse(payload.data);

    if (!dataParseResult.success) {
      throw new TransactionProcessUnexpectedDataError("`data` object has unexpected structure.", {
        cause: dataParseResult.error,
      });
    }

    const { customerProfileId } = dataParseResult.data;
    const userEmail = payload.sourceObject.userEmail;

    if (customerProfileId && userEmail) {
      await this.updateCustomerProfileId({
        customerProfileId,
        userEmail,
      });
    }

    const result = await this.resolveTransactionResult({
      transactionId: dataParseResult.data.transactionId,
    });

    return {
      amount: payload.action.amount,
      result,
      data: {},
    };
  }
}
