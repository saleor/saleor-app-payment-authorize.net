import { z } from "zod";
import { type AppConfigMetadataManager } from "../configuration/app-config-metadata-manager";
import {
  type AuthorizeSettlementState,
  type AuthorizeNetClient,
} from "../authorize-net/authorize-net-client";
import { BaseError } from "@/errors";
import { type SyncWebhookResponse } from "@/lib/webhook-response-builder";
import { type TransactionProcessSessionEventFragment } from "generated/graphql";

export const TransactionProcessError = BaseError.subclass("TransactionProcessError");

export const TransactionProcessUnexpectedDataError = TransactionProcessError.subclass(
  "TransactionProcessUnexpectedDataError",
);

type TransactionProcessWebhookResponse = SyncWebhookResponse<"TRANSACTION_PROCESS_SESSION">;

type PossibleTransactionResult = Extract<
  TransactionProcessWebhookResponse["result"],
  "AUTHORIZATION_SUCCESS" | "AUTHORIZATION_FAILURE" | "AUTHORIZATION_REQUESTED"
>;

const transactionProcessPayloadDataSchema = z.object({
  transactionId: z.string().min(1),
  customerProfileId: z.string().min(1).optional(),
});

const settlementStateToTransactionResultMap: Record<
  AuthorizeSettlementState,
  PossibleTransactionResult
> = {
  pendingSettlement: "AUTHORIZATION_REQUESTED",
  settledSuccessfully: "AUTHORIZATION_SUCCESS",
  settlementError: "AUTHORIZATION_FAILURE",
};

export class TransactionProcessSessionService {
  private appConfigMetadataManager: AppConfigMetadataManager;
  private authorizeNetClient: AuthorizeNetClient;

  constructor({
    appConfigMetadataManager,
    authorizeNetClient,
  }: {
    appConfigMetadataManager: AppConfigMetadataManager;
    authorizeNetClient: AuthorizeNetClient;
  }) {
    this.appConfigMetadataManager = appConfigMetadataManager;
    this.authorizeNetClient = authorizeNetClient;
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

  // todo: confirm if this is the correct way to do so
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
    const transactionDetails = await this.authorizeNetClient.getTransactionDetailsRequest({
      transactionId,
    });

    const { settlementState } = transactionDetails.batch;

    return settlementStateToTransactionResultMap[settlementState];
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
