import { z } from "zod";
import { TransactionDetailsClient } from "../authorize-net/client/transaction-details-client";
import { BaseError } from "@/errors";
import { createLogger } from "@/lib/logger";
import { type TransactionProcessSessionResponse } from "@/schemas/TransactionProcessSession/TransactionProcessSessionResponse.mjs";
import { type TransactionProcessSessionEventFragment } from "generated/graphql";

export const TransactionProcessError = BaseError.subclass("TransactionProcessError");

const acceptHostedTransactionProcessRequestDataSchema = z.object({
  authorizeTransactionId: z.string().min(1),
});

export class TransactionProcessSessionService {
  private logger = createLogger({
    name: "TransactionProcessSessionService",
  });

  private getTransactionDetails(payload: TransactionProcessSessionEventFragment) {
    const client = new TransactionDetailsClient();
    const { authorizeTransactionId } = acceptHostedTransactionProcessRequestDataSchema.parse(
      payload.data,
    );

    const transactionDetails = client.getTransactionDetails({
      transactionId: authorizeTransactionId,
    });

    return transactionDetails;
  }

  async execute(
    payload: TransactionProcessSessionEventFragment,
  ): Promise<TransactionProcessSessionResponse> {
    const transactionDetails = await this.getTransactionDetails(payload);

    return {
      amount: transactionDetails.transaction.authAmount,
      result: "AUTHORIZATION_SUCCESS",
      pspReference: transactionDetails.transaction.transId,
      actions: ["CANCEL", "REFUND"],
      time: transactionDetails.transaction.submitTimeLocal,
      data: {},
    };
  }
}
