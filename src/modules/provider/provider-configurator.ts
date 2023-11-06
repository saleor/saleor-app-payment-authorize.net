import { AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";
import { type RootConfig } from "../configuration/app-config";
import { generateId } from "@/lib/generate-id";

export class ProvidersConfigurator {
  private rootData: RootConfig.Shape;

  constructor(rootData: RootConfig.Shape) {
    this.rootData = rootData;
  }

  getProviders() {
    return this.rootData.providers;
  }

  getProviderById(id: string) {
    return this.rootData.providers.find((p) => p.id === id);
  }

  addProvider(input: AuthorizeProviderConfig.InputShape) {
    const providerConfig = AuthorizeProviderConfig.Schema.Input.parse(input);

    this.rootData.providers.push({
      ...providerConfig,
      id: generateId(),
    });

    return this;
  }

  updateProvider(provider: AuthorizeProviderConfig.FullShape) {
    const parsedConfig = AuthorizeProviderConfig.Schema.Full.parse(provider);

    this.rootData.providers = this.rootData.providers.map((p) => {
      if (p.id === parsedConfig.id) {
        return parsedConfig;
      } else {
        return p;
      }
    });
  }

  deleteProvider(providerId: string) {
    this.rootData.providers = this.rootData.providers.filter((p) => p.id !== providerId);
  }
}
