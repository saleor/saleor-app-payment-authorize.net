import { z } from "zod";
import { AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";
import { ChannelConnection } from "../channel-connection/channel-connection.schema";
import { generateId } from "@/lib/generate-id";

export namespace AppConfig {
  export const Schema = z.object({
    providers: z.array(AuthorizeProviderConfig.Schema.Full),
    connections: z.array(ChannelConnection.Schema.Full),
  });

  export type Shape = z.infer<typeof Schema>;
}

export class AppConfigurator {
  rootData: AppConfig.Shape = {
    providers: [],
    connections: [],
  };

  constructor(initialData?: AppConfig.Shape) {
    if (initialData) {
      this.rootData = initialData;
    }
  }

  providers = {
    getProviders: () => {
      return this.rootData.providers;
    },
    getProviderById: (id: string) => {
      return this.rootData.providers.find((p) => p.id === id);
    },
    addProvider: (input: AuthorizeProviderConfig.InputShape) => {
      const nextProviders = [
        ...this.rootData.providers,
        {
          ...input,
          id: generateId(),
        },
      ];

      this.rootData.providers = nextProviders;
    },
    updateProvider: (provider: AuthorizeProviderConfig.FullShape) => {
      const nextProviders = this.rootData.providers.map((p) => {
        if (p.id === provider.id) {
          return provider;
        }

        return p;
      });

      this.rootData.providers = nextProviders;
    },
    deleteProvider: (providerId: string) => {
      const nextProviders = this.rootData.providers.filter((p) => p.id !== providerId);

      this.rootData.providers = nextProviders;
    },
  };

  connections = {
    getConnections: () => {
      return this.rootData.connections;
    },
    addConnection: (input: ChannelConnection.InputShape) => {
      const nextConnections = [...this.rootData.connections, { ...input, id: generateId() }];

      this.rootData.connections = nextConnections;
    },
    updateConnection: (connection: ChannelConnection.FullShape) => {
      const nextConnections = this.rootData.connections.map((p) => {
        if (p.id === connection.id) {
          return connection;
        }

        return p;
      });

      this.rootData.connections = nextConnections;
    },
    deleteConnection: (connectionId: string) => {
      const nextConnections = this.rootData.connections.filter((p) => p.id !== connectionId);

      this.rootData.connections = nextConnections;
    },
  };

  static parse(serializedSchema: string) {
    const parsedSchema = JSON.parse(serializedSchema);
    const configSchema = AppConfig.Schema.parse(parsedSchema);

    return new AppConfigurator(configSchema);
  }

  serialize() {
    return JSON.stringify(this.rootData);
  }
}
