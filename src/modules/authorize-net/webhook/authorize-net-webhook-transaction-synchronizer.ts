import { type Client } from "urql";
import { type AuthorizeConfig, type AuthorizeNetEvent } from "../authorize-net-config";
import { TransactionDetailsClient } from "../client/transaction-details-client";
import { AuthorizeNetError } from "../authorize-net-error";
import { type EventPayload } from "./authorize-net-webhook-handler";
import {
  type TransactionEventReportMutation,
  type TransactionEventReportMutationVariables,
  TransactionEventReportDocument,
  TransactionEventTypeEnum,
} from "generated/graphql";
import { saleorTransactionIdConverter } from "@/modules/authorize-net/synchronized-transaction/saleor-transaction-id-converter";

const TransactionEventReportMutationError = AuthorizeNetError.subclass(
  "TransactionEventReportMutationError",
);

/**
 * @description This class is used to synchronize Authorize.net transactions with Saleor transactions
 */
export class AuthorizeNetWebhookTransactionSynchronizer {
  private authorizeConfig: AuthorizeConfig.FullShape;
  private client: Client;

  constructor({
    authorizeConfig,
    client,
  }: {
    authorizeConfig: AuthorizeConfig.FullShape;
    client: Client;
  }) {
    this.authorizeConfig = authorizeConfig;
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
    const transactionDetailsClient = new TransactionDetailsClient(this.authorizeConfig);
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
