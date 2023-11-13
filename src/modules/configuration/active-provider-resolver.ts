import { NoConnectionFoundError, NoProviderFoundError } from "@/errors";
import { type ChannelConnection } from "@/modules/channel-connection/channel-connection.schema";
import { type AppConfig } from "@/modules/configuration/app-configurator";

export class ActiveProviderResolver {
  constructor(private appConfig: AppConfig.Shape) {}

  private resolveActiveConnection(channelSlug: string) {
    const channel = this.appConfig.connections.find((c) => c.channelSlug === channelSlug);

    if (!channel) {
      throw new NoConnectionFoundError(`Channel ${channelSlug} not found in the connections`);
    }

    return channel;
  }

  private resolveProviderForConnection(connection: ChannelConnection.FullShape) {
    const provider = this.appConfig.providers.find((p) => p.id === connection.providerId);

    if (!provider) {
      throw new NoProviderFoundError(
        `Provider ${connection.providerId} not found in the providers`,
      );
    }

    return provider;
  }

  public resolve(channelSlug: string) {
    const connection = this.resolveActiveConnection(channelSlug);
    const provider = this.resolveProviderForConnection(connection);

    return provider;
  }
}
