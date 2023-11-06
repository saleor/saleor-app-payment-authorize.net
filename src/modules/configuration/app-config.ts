import { z } from "zod";
import { AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";
import { ProvidersConfigurator } from "../provider/provider-configurator";
import { ChannelConnectionConfigurator } from "../channel-connection/channel-connection-configurator";
import { ChannelConnection } from "../channel-connection/channel-connection.schema";

export namespace RootConfig {
  export const Schema = z.object({
    providers: z.array(AuthorizeProviderConfig.Schema.Full),
    connections: z.array(ChannelConnection.Schema.Full),
  });

  export type Shape = z.infer<typeof Schema>;
}

export class AppConfigurator {
  private rootData: RootConfig.Shape = {
    providers: [],
    connections: [],
  };

  providers: ProvidersConfigurator;
  connections: ChannelConnectionConfigurator;

  constructor(initialData?: RootConfig.Shape) {
    if (initialData) {
      this.rootData = initialData;
    }

    this.providers = new ProvidersConfigurator(this.rootData);
    this.connections = new ChannelConnectionConfigurator(this.rootData);
  }

  static parse(serializedSchema: string) {
    const parsedSchema = JSON.parse(serializedSchema);
    const configSchema = RootConfig.Schema.parse(parsedSchema);

    return new AppConfigurator(configSchema);
  }

  serialize() {
    return JSON.stringify(this.rootData);
  }
}
