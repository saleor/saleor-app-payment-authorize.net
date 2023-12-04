import { z } from "zod";
import { type AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";
import {
  TransactionDetailsClient,
  type GetTransactionDetailsResponse,
} from "../authorize-net/client/transaction-details-client";
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
});

export class TransactionProcessSessionService {
  private authorizeConfig: AuthorizeProviderConfig.FullShape;

  constructor({ authorizeConfig }: { authorizeConfig: AuthorizeProviderConfig.FullShape }) {
    this.authorizeConfig = authorizeConfig;
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

    const { transactionId } = dataParseResult.data;

    const transactionDetailsClient = new TransactionDetailsClient(this.authorizeConfig);
    const details = await transactionDetailsClient.getTransactionDetailsRequest({
      transactionId,
    });

    const result = this.mapTransactionResult(details);

    return {
      amount: details.transaction.authAmount,
      result,
      message: details.transaction.responseReasonDescription,
      pspReference: transactionId,
    };
  }
}
