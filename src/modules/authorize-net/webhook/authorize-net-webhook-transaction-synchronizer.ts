import { type Client } from "urql";
import { AuthorizeNetError } from "../authorize-net-error";
import { TransactionDetailsClient } from "../client/transaction-details-client";
import { type AuthorizeNetEvent } from "./authorize-net-webhook-client";
import { type EventPayload } from "./authorize-net-webhook-handler";
import {
  TransactionEventReportDocument,
  TransactionEventTypeEnum,
  type TransactionEventReportMutation,
  type TransactionEventReportMutationVariables,
} from "generated/graphql";
import { saleorTransactionIdConverter } from "@/modules/authorize-net/synchronized-transaction/saleor-transaction-id-converter";

const TransactionEventReportMutationError = AuthorizeNetError.subclass(
  "TransactionEventReportMutationError",
);

/**
 * @description This class is used to synchronize Authorize.net transactions with Saleor transactions
 */
export class AuthorizeNetWebhookTransactionSynchronizer {
  private client: Client;

  constructor({ client }: { client: Client }) {
    this.client = client;
  }

  private mapEventType(authorizeTransactionType: AuthorizeNetEvent): TransactionEventTypeEnum {
    switch (authorizeTransactionType) {
      // todo:
      default:
        return TransactionEventTypeEnum.AuthorizationActionRequired;
    }
  }

  private async transactionEventReport(variables: TransactionEventReportMutationVariables) {
    const { error: mutationError } = await this.client
      .mutation<TransactionEventReportMutation>(TransactionEventReportDocument, variables)
      .toPromise();

    if (mutationError) {
      throw new TransactionEventReportMutationError(
        "Error while mapping the transaction in the authorize webhook handler.",
        { cause: mutationError.message },
      );
    }
  }

  private getAuthorizeTransaction({ id }: { id: string }) {
    const transactionDetailsClient = new TransactionDetailsClient();
    return transactionDetailsClient.getTransactionDetailsRequest({ transactionId: id });
  }

  async synchronizeTransaction(eventPayload: EventPayload) {
    const transactionId = eventPayload.payload.id;
    const authorizeTransaction = await this.getAuthorizeTransaction({ id: transactionId });

    const saleorTransactionId =
      saleorTransactionIdConverter.fromAuthorizeNetTransaction(authorizeTransaction);

    const authorizeTransactionId = authorizeTransaction.transaction.transId;

    const type = this.mapEventType(eventPayload.eventType);

    await this.transactionEventReport({
      amount: authorizeTransaction.transaction.authAmount,
      availableActions: [],
      pspReference: authorizeTransactionId,
      time: authorizeTransaction.transaction.submitTimeLocal,
      transactionId: saleorTransactionId,
      type,
    });
  }
}
