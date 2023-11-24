import { z } from "zod";
import { type AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";
import {
  TransactionDetailsClient,
  type GetTransactionDetailsResponse,
} from "../authorize-net/client/transaction-details-client";
import { type AppConfigMetadataManager } from "../configuration/app-config-metadata-manager";
import { type TransactionProcessSessionEventFragment } from "generated/graphql";
import { type TransactionProcessSessionResponse } from "@/schemas/TransactionProcessSession/TransactionProcessSessionResponse.mjs";
import { BaseError } from "@/errors";

export const TransactionProcessError = BaseError.subclass("TransactionProcessError");

export const TransactionProcessUnexpectedDataError = TransactionProcessError.subclass(
  "TransactionProcessUnexpectedDataError",
);

type PossibleTransactionResult = Extract<
  TransactionProcessSessionResponse["result"],
  "AUTHORIZATION_ACTION_REQUIRED" | "AUTHORIZATION_REQUEST"
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
  private mapTransactionResult(
    transactionDetails: GetTransactionDetailsResponse,
  ): PossibleTransactionResult {
    const { transactionStatus } = transactionDetails.transaction;

    if (transactionStatus === "authorizedPendingCapture") {
      return "AUTHORIZATION_REQUEST";
    }

    if (transactionStatus === "FDSPendingReview") {
      return "AUTHORIZATION_ACTION_REQUIRED";
    }

    throw new TransactionProcessError(`Unexpected transaction status: ${transactionStatus}`);
  }

  async execute(
    payload: TransactionProcessSessionEventFragment,
  ): Promise<TransactionProcessSessionResponse> {
    const dataParseResult = transactionProcessPayloadDataSchema.safeParse(payload.data);

    if (!dataParseResult.success) {
      throw new TransactionProcessUnexpectedDataError("`data` object has unexpected structure.", {
        cause: dataParseResult.error,
      });
    }

    const { customerProfileId, transactionId } = dataParseResult.data;
    const userEmail = payload.sourceObject.userEmail;

    if (customerProfileId && userEmail) {
      await this.updateCustomerProfileId({
        customerProfileId,
        userEmail,
      });
    }

    const transactionDetailsClient = new TransactionDetailsClient(this.authorizeConfig);
    const details = await transactionDetailsClient.getTransactionDetailsRequest({
      transactionId,
    });

    const result = this.mapTransactionResult(details);

    return {
      amount: details.transaction.authAmount,
      result,
      data: {
        foo: "bar",
      },
      message: details.transaction.responseReasonDescription,
      pspReference: transactionId,
    };
  }
}
