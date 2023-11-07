import { decrypt } from "@saleor/app-sdk/settings-manager";
import { NoAppConfigFoundError, NoConnectionFoundError, NoProviderFoundError } from "@/errors";
import { env } from "@/lib/env.mjs";
import { type ChannelConnection } from "@/modules/channel-connection/channel-connection.schema";
import { RootConfig } from "@/modules/configuration/app-configurator";
import { type WebhookRecipientFragment } from "generated/graphql";

export class ActiveProviderResolver {
  private readonly appConfig: RootConfig.Shape;
  private readonly channelSlug: string;

  constructor({
    appMetadata,
    channelSlug,
  }: {
    appMetadata: WebhookRecipientFragment["privateMetadata"];
    channelSlug: string;
  }) {
    const appConfig = this.resolveAppConfigFromMetadata(appMetadata);

    this.appConfig = appConfig;
    this.channelSlug = channelSlug;
  }

  private resolveActiveConnection() {
    const channel = this.appConfig.connections.find((c) => c.channelSlug === this.channelSlug);

    if (!channel) {
      throw new NoConnectionFoundError(`Channel ${this.channelSlug} not found in the connections`);
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

  private resolveAppConfigFromMetadata(
    appMetadata: WebhookRecipientFragment["privateMetadata"],
  ): RootConfig.Shape {
    let appConfig: RootConfig.Shape | undefined;

    appMetadata.forEach((item) => {
      const decrypted = decrypt(item.value, env.SECRET_KEY);
      const parsedItem = JSON.parse(decrypted);
      const appConfigParsed = RootConfig.Schema.safeParse(parsedItem);

      if (appConfigParsed.success) {
        appConfig = appConfigParsed.data;
      }
    });

    if (!appConfig) {
      throw new NoAppConfigFoundError("App config not found");
    }

    return appConfig;
  }

  public resolve() {
    const connection = this.resolveActiveConnection();
    const provider = this.resolveProviderForConnection(connection);

    return provider;
  }
}
