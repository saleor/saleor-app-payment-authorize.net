import { AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";
import { type AppConfig } from "../configuration/app-configurator";
import { generateId } from "@/lib/generate-id";

type Providers = AppConfig.Shape["providers"];

export class ProvidersConfigurator {
  private providers: Providers;

  constructor(rootData: Providers) {
    this.providers = rootData;
  }

  getProviders() {
    return this.providers;
  }

  getProviderById(id: string) {
    return this.providers.find((p) => p.id === id);
  }

  addProvider(input: AuthorizeProviderConfig.InputShape) {
    const providerConfig = AuthorizeProviderConfig.Schema.Input.parse(input);

    this.providers.push({
      ...providerConfig,
      id: generateId(),
    });

    return this;
  }

  updateProvider(provider: AuthorizeProviderConfig.FullShape) {
    const parsedConfig = AuthorizeProviderConfig.Schema.Full.parse(provider);

    this.providers = this.providers.map((p) => {
      if (p.id === parsedConfig.id) {
        return parsedConfig;
      } else {
        return p;
      }
    });
  }

  deleteProvider(providerId: string) {
    this.providers = this.providers.filter((p) => p.id !== providerId);
  }
}
