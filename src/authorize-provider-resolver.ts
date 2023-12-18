import { type AuthData } from "@saleor/app-sdk/APL";
import { ActiveProviderResolver } from "./modules/configuration/active-provider-resolver";
import { AppConfigMetadataManager } from "./modules/configuration/app-config-metadata-manager";
import { AppConfigResolver } from "./modules/configuration/app-config-resolver";
import { type MetadataItem } from "generated/graphql";

export async function resolveAuthorizeConfig({
  authData,
  appMetadata,
  channelSlug,
}: {
  authData: AuthData;
  appMetadata: readonly MetadataItem[];
  channelSlug: string;
}) {
  const appConfigMetadataManager = AppConfigMetadataManager.createFromAuthData(authData);
  const appConfigResolver = new AppConfigResolver(appConfigMetadataManager);

  const appConfig = await appConfigResolver.resolve({ metadata: appMetadata });
  const activeProviderResolver = new ActiveProviderResolver(appConfig);
  const authorizeConfig = activeProviderResolver.resolve(channelSlug);

  return authorizeConfig;
}
