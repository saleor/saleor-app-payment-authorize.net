import { TransactionDetailsClient } from "../authorize-net/client/transaction-details-client";
import { transactionId } from "../authorize-net/transaction-id-utils";
import { createLogger } from "@/lib/logger";
import { type TransactionProcessSessionResponse } from "@/schemas/TransactionProcessSession/TransactionProcessSessionResponse.mjs";
import { type TransactionProcessSessionEventFragment } from "generated/graphql";

export class TransactionProcessSessionService {
  private logger = createLogger({
    name: "TransactionProcessSessionService",
  });

  private getTransactionDetails(payload: TransactionProcessSessionEventFragment) {
    const client = new TransactionDetailsClient();
    const authorizeTransactionId = transactionId.resolveAuthorizeTransactionId(payload.transaction);

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
