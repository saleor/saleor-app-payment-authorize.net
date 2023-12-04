import { type Client } from "urql";
import { BaseError } from "@/errors";
import { createLogger } from "@/lib/logger";
import {
  UpdatePrivateMetadataDocument,
  type MetadataItem,
  type UpdatePrivateMetadata,
  type UpdatePrivateMetadataMutationVariables,
} from "generated/graphql";

const TransactionMetadataMutationError = BaseError.subclass("TransactionMetadataMutationError");
const TransactionMetadataQueryError = BaseError.subclass("TransactionMetadataQueryError");

export class TransactionMetadataManager {
  private apiClient: Client;
  private transactionMetadataKey = "authorizeTransactionId";
  private logger = createLogger({
    name: "TransactionMetadataManager",
  });

  constructor({ apiClient }: { apiClient: Client }) {
    this.apiClient = apiClient;
  }

  async saveTransactionId({
    saleorTransactionId,
    authorizeTransactionId,
  }: {
    saleorTransactionId: string;
    authorizeTransactionId: string;
  }): Promise<void> {
    const input: UpdatePrivateMetadataMutationVariables["input"] = [
      {
        key: this.transactionMetadataKey,
        value: authorizeTransactionId,
      },
    ];

    const { error } = await this.apiClient
      .mutation<UpdatePrivateMetadata>(UpdatePrivateMetadataDocument, {
        id: saleorTransactionId,
        input,
      } as UpdatePrivateMetadataMutationVariables)
      .toPromise();

    if (error) {
      throw new TransactionMetadataMutationError("Unable to update transaction metadata", {
        cause: error,
      });
    }

    this.logger.debug("Transaction metadata saved");
  }

  async getAuthorizeTransactionId({
    metadata,
  }: {
    metadata: readonly MetadataItem[];
  }): Promise<string> {
    const transactionId = metadata.find(
      (metadataEntry) => metadataEntry?.key === this.transactionMetadataKey,
    )?.value;

    if (!transactionId) {
      throw new TransactionMetadataQueryError("transactionId not found in transaction metadata");
    }

    this.logger.debug("Returning authorizeTransactionId from transaction metadata");

    return transactionId;
  }
}
