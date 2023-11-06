import { type SettingsManager } from "@saleor/app-sdk/settings-manager";
import { type AuthData } from "@saleor/app-sdk/APL";
import { AppConfig } from "./app-config";
import { createSettingsManager } from "./settings-manager";
import { createClient } from "@/lib/create-graphq-client";

export class AppConfigMetadataManager {
  public readonly metadataKey = "app-config-v1";

  constructor(private mm: SettingsManager) {}

  async get() {
    const metadata = await this.mm.get(this.metadataKey);

    return metadata ? AppConfig.parse(metadata) : new AppConfig();
  }

  set(config: AppConfig) {
    return this.mm.set({
      key: this.metadataKey,
      value: config.serialize(),
    });
  }

  static createFromAuthData(authData: AuthData): AppConfigMetadataManager {
    const settingsManager = createSettingsManager(
      createClient(authData.saleorApiUrl, () => Promise.resolve({ token: authData.token })),
      authData.appId,
    );

    return new AppConfigMetadataManager(settingsManager);
  }
}
