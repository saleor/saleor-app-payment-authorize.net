import { type Client } from "urql";
import { z } from "zod";
import { type AuthorizeConfig } from "../authorize-net/authorize-net-config";
import {
  TransactionDetailsClient,
  type GetTransactionDetailsResponse,
} from "../authorize-net/client/transaction-details-client";
import { TransactionMetadataManager } from "../configuration/transaction-metadata-manager";
import { type TransactionProcessSessionEventFragment } from "generated/graphql";
import { type TransactionProcessSessionResponse } from "@/schemas/TransactionProcessSession/TransactionProcessSessionResponse.mjs";
import { createLogger } from "@/lib/logger";
import { BaseError } from "@/errors";

export const TransactionProcessError = BaseError.subclass("TransactionProcessError");

export const TransactionProcessUnexpectedDataError = TransactionProcessError.subclass(
  "TransactionProcessUnexpectedDataError",
);

const transactionProcessPayloadDataSchema = z.object({
  transactionId: z.string().min(1),
});

export class TransactionProcessSessionService {
  private authorizeConfig: AuthorizeConfig.FullShape;
  private apiClient: Client;

  private logger = createLogger({
    name: "TransactionProcessSessionService",
  });

  constructor({
    authorizeConfig,
    apiClient,
  }: {
    authorizeConfig: AuthorizeConfig.FullShape;
    apiClient: Client;
  }) {
    this.authorizeConfig = authorizeConfig;
    this.apiClient = apiClient;
  }

  /**
   * @description Saves Authorize transaction ID in metadata for future usage in other operations (e.g. `transaction-cancelation-requested`). Also saves Saleor transaction ID in Authorize transaction as order.description.
   */
  private async synchronizeTransaction({
    saleorTransactionId,
    authorizeTransactionId,
  }: {
    saleorTransactionId: string;
    authorizeTransactionId: string;
  }) {
    const metadataManager = new TransactionMetadataManager({ apiClient: this.apiClient });

    await metadataManager.saveTransactionId({
      saleorTransactionId,
      authorizeTransactionId,
    });
  }

  /**
   * @description Calls the Authorize.net API to get the transaction status. Maps Authorize settlement state to Saleor transaction result.
   * @returns Possible transaction result
   */
  private mapTransactionToWebhookResponse(
    response: GetTransactionDetailsResponse,
  ): TransactionProcessSessionResponse {
    const baseResponse: Pick<
      TransactionProcessSessionResponse,
      "amount" | "message" | "pspReference"
    > = {
      amount: response.transaction.authAmount,
      message: response.transaction.responseReasonDescription,
      pspReference: response.transaction.transId,
    };

    const { transactionStatus } = response.transaction;

    if (transactionStatus === "authorizedPendingCapture") {
      return { ...baseResponse, result: "AUTHORIZATION_SUCCESS", actions: ["CANCEL", "REFUND"] };
    }

    if (transactionStatus === "FDSPendingReview") {
      return { ...baseResponse, result: "AUTHORIZATION_REQUEST", actions: [] };
    }

    throw new TransactionProcessError(`Unexpected transaction status: ${transactionStatus}`);
  }

  async execute(
    payload: TransactionProcessSessionEventFragment,
  ): Promise<TransactionProcessSessionResponse> {
    this.logger.debug({ id: payload.transaction?.id }, "Mapping the state of transaction");
    const dataParseResult = transactionProcessPayloadDataSchema.safeParse(payload.data);

    if (!dataParseResult.success) {
      throw new TransactionProcessUnexpectedDataError("`data` object has unexpected structure.", {
        cause: dataParseResult.error,
      });
    }

    const { transactionId: authorizeTransactionId } = dataParseResult.data;

    await this.synchronizeTransaction({
      saleorTransactionId: payload.transaction.id,
      authorizeTransactionId,
    });

    const transactionDetailsClient = new TransactionDetailsClient(this.authorizeConfig);
    const details = await transactionDetailsClient.getTransactionDetailsRequest({
      transactionId: authorizeTransactionId,
    });

    const { result, actions } = this.mapTransactionToWebhookResponse(details);

    return {
      amount: details.transaction.authAmount,
      result,
      actions,
      message: details.transaction.responseReasonDescription,
      pspReference: authorizeTransactionId,
    };
  }
}
