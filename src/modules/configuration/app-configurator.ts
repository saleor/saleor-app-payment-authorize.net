import { z } from "zod";
import { AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";
import { ProvidersConfigurator } from "../provider/provider-configurator";
import { ChannelConnectionConfigurator } from "../channel-connection/channel-connection-configurator";
import { ChannelConnection } from "../channel-connection/channel-connection.schema";
import { CustomerProfileConfigurator } from "../customer-profile/customer-profile-configurator";
import { CustomerProfile } from "../customer-profile/customer-profile.schema";

export namespace AppConfig {
  export const Schema = z.object({
    providers: z.array(AuthorizeProviderConfig.Schema.Full),
    connections: z.array(ChannelConnection.Schema.Full),
    customerProfiles: z.array(CustomerProfile.Schema),
  });

  export type Shape = z.infer<typeof Schema>;
}

export class AppConfigurator {
  private rootData: AppConfig.Shape = {
    providers: [],
    connections: [],
    customerProfiles: [],
  };

  providers: ProvidersConfigurator;
  connections: ChannelConnectionConfigurator;
  customerProfiles: CustomerProfileConfigurator;

  constructor(initialData?: AppConfig.Shape) {
    if (initialData) {
      this.rootData = initialData;
    }

    this.providers = new ProvidersConfigurator(this.rootData.providers);
    this.connections = new ChannelConnectionConfigurator(this.rootData.connections);
    this.customerProfiles = new CustomerProfileConfigurator(this.rootData.customerProfiles);
  }

  static parse(serializedSchema: string) {
    const parsedSchema = JSON.parse(serializedSchema);
    const configSchema = AppConfig.Schema.parse(parsedSchema);

    return new AppConfigurator(configSchema);
  }

  serialize() {
    return JSON.stringify(this.rootData);
  }
}
