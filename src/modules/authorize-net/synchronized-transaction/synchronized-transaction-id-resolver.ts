import { type Client } from "urql";
import { TransactionMetadataManager } from "../../configuration/transaction-metadata-manager";
import { type MetadataItem, type TransactionFragment } from "generated/graphql";
import { BaseError } from "@/errors";

export const TransactionIdResolverError = BaseError.subclass("TransactionIdResolverError");

// The term "synchronized transaction" is used to describe a logic that is used to synchronize transaction between Saleor and Authorize.net.
export class SynchronizedTransactionIdResolver {
  constructor(private apiClient: Client) {}

  private async getTransactionIdFromMetadata({ metadata }: { metadata: readonly MetadataItem[] }) {
    const metadataManager = new TransactionMetadataManager({ apiClient: this.apiClient });
    const transactionId = await metadataManager.getAuthorizeTransactionId({ metadata });

    return transactionId;
  }

  async resolveFromTransaction(transaction: TransactionFragment) {
    const saleorTransactionId = transaction?.id;

    if (!saleorTransactionId) {
      throw new TransactionIdResolverError("Missing saleorTransactionId in payload");
    }

    const metadata = transaction.privateMetadata;

    if (!metadata) {
      throw new TransactionIdResolverError("Missing metadata in payload");
    }

    const authorizeTransactionId = await this.getTransactionIdFromMetadata({
      metadata,
    });

    return {
      authorizeTransactionId,
      saleorTransactionId,
    };
  }
}
