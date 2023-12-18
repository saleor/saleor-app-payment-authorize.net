import { NoChannelSlugFoundError, NoConnectionFoundError, NoProviderFoundError } from "@/errors";
import { type AppConfig } from "@/modules/configuration/app-configurator";

export function resolveAuthorizeConfigFromAppConfig({
  appConfig,
  channelSlug,
}: {
  appConfig: AppConfig.Shape;
  channelSlug: string | null | undefined;
}) {
  if (!channelSlug) {
    throw new NoChannelSlugFoundError(`Channel ${channelSlug} not found in the connections`);
  }

  const channel = appConfig.connections.find((c) => c.channelSlug === channelSlug);

  if (!channel) {
    throw new NoConnectionFoundError(`Channel ${channelSlug} not found in the connections`);
  }

  const provider = appConfig.providers.find((p) => p.id === channel.providerId);

  if (!provider) {
    throw new NoProviderFoundError(`Provider ${channel.providerId} not found in the providers`);
  }

  return provider;
}
