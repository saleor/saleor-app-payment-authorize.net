import {
  EncryptedMetadataManager,
  type MetadataEntry,
  type SettingsManager,
} from "@saleor/app-sdk/settings-manager";
import { gql, type Client } from "urql";
import { env } from "@/lib/env.mjs";

// copied from @saleor/apps/shared

const UpdateAppMetadataMutation = gql`
  mutation UpdateAppMetadata($id: ID!, $input: [MetadataInput!]!) {
    updatePrivateMetadata(id: $id, input: $input) {
      item {
        privateMetadata {
          key
          value
        }
      }
    }
  }
`;

const FetchAppDetailsQuery = gql`
  query FetchAppDetails {
    app {
      id
      privateMetadata {
        key
        value
      }
    }
  }
`;

const DeletePrivateMetadataMutation = gql`
  mutation RemovePrivateMetadata($id: ID!, $keys: [String!]!) {
    deletePrivateMetadata(id: $id, keys: $keys) {
      errors {
        message
      }
    }
  }
`;

/**
 * To avoid a graphql-schema build step, manually set types for the queries and mutations.
 */
type FetchAppPrivateMetadataQuery = {
  __typename?: "Query";
  app?: {
    __typename?: "App";
    id: string;
    privateMetadata: Array<{ __typename?: "MetadataItem"; key: string; value: string }>;
  } | null;
};

type UpdateAppPrivateMetadataMutation = {
  __typename?: "Mutation";
  updatePrivateMetadata?: {
    __typename?: "UpdatePrivateMetadata";
    item?: {
      __typename?: "App";
      privateMetadata: Array<{ __typename?: "MetadataItem"; key: string; value: string }>;
    } | null;
  } | null;
};

export type MetadataManagerGraphqlClient = Pick<Client, "mutation" | "query">;

async function fetchAllPrivateMetadata(
  client: MetadataManagerGraphqlClient,
): Promise<MetadataEntry[]> {
  const { error, data } = await client
    .query<FetchAppPrivateMetadataQuery>(FetchAppDetailsQuery, {})
    .toPromise();

  if (error) {
    return [];
  }

  return data?.app?.privateMetadata.map((md) => ({ key: md.key, value: md.value })) || [];
}

async function updatePrivateMetadata(
  client: MetadataManagerGraphqlClient,
  metadata: MetadataEntry[],
  appId: string,
) {
  const { error: mutationError, data: mutationData } = await client
    .mutation<UpdateAppPrivateMetadataMutation>(UpdateAppMetadataMutation, {
      id: appId,
      input: metadata,
    })
    .toPromise();

  if (mutationError) {
    throw new Error(`Mutation error: ${mutationError.message}`);
  }

  return (
    mutationData?.updatePrivateMetadata?.item?.privateMetadata.map((md) => ({
      key: md.key,
      value: md.value,
    })) || []
  );
}

class EncryptedMetadataManagerFactory {
  constructor(private encryptionKey: string) {
    if (!encryptionKey) {
      console.error("Encryption key is required, will throw");
      throw new Error("Encryption key is required");
    }
  }

  create(client: MetadataManagerGraphqlClient, appId: string): SettingsManager {
    return new EncryptedMetadataManager({
      encryptionKey: this.encryptionKey,
      fetchMetadata: () => fetchAllPrivateMetadata(client),
      mutateMetadata: (metadata) => updatePrivateMetadata(client, metadata, appId),
      async deleteMetadata(keys) {
        client.mutation(DeletePrivateMetadataMutation, {
          id: appId,
          keys: keys,
        });
      },
    });
  }
}

// copied from @saleor/apps/cms

export const createSettingsManager = (
  client: Pick<Client, "query" | "mutation">,
  appId: string,
): SettingsManager => {
  const metadataManagerFactory = new EncryptedMetadataManagerFactory(env.SECRET_KEY);

  return metadataManagerFactory.create(client, appId);
};
