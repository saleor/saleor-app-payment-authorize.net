import { z } from "zod";
import { type AppConfigMetadataManager } from "../configuration/app-config-metadata-manager";
import { BaseError } from "@/errors";
import { type SyncWebhookResponse } from "@/lib/webhook-response-builder";
import { type TransactionProcessSessionEventFragment } from "generated/graphql";

export const TransactionProcessError = BaseError.subclass("TransactionProcessError");

export const TransactionProcessUnexpectedDataError = TransactionProcessError.subclass(
  "TransactionProcessUnexpectedDataError",
);

// todo: use transactionId to verify the state of transaction in Authorize
// todo: if customerProfileId is there, update the stored customerProfileId x userEmail mapping
const transactionProcessPayloadDataSchema = z.object({
  transactionId: z.string().min(1),
  customerProfileId: z.string().min(1).optional(),
});

export class TransactionProcessSessionService {
  private appConfigMetadataManager: AppConfigMetadataManager;

  constructor({
    appConfigMetadataManager,
  }: {
    appConfigMetadataManager: AppConfigMetadataManager;
  }) {
    this.appConfigMetadataManager = appConfigMetadataManager;
  }

  // If customerProfileId was passed from Accept Hosted form, update the stored customerProfileId x userEmail mapping
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

  async execute(
    payload: TransactionProcessSessionEventFragment,
  ): Promise<SyncWebhookResponse<"TRANSACTION_PROCESS_SESSION">> {
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

    // todo: implement

    return {
      amount: payload.action.amount,
      result: "AUTHORIZATION_FAILURE",
      data: {},
    };
  }
}
