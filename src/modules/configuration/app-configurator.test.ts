import { describe, expect, it } from "vitest";
import { AppConfigurator } from "./app-configurator";

describe("AppConfigurator", () => {
  describe("AppConfigurator preserves the state of sub-configurators", () => {
    it("preserves the state of the providers configurator", () => {
      const configurator = new AppConfigurator();

      configurator.providers.addProvider({
        apiLoginId: "api-login-id",
        transactionKey: "transaction-key",
        environment: "sandbox",
        publicClientKey: "public-client-key",
      });

      const parsedConfig = JSON.parse(configurator.serialize());

      expect(parsedConfig).toEqual({
        providers: [
          {
            id: expect.any(String),
            apiLoginId: "api-login-id",
            transactionKey: "transaction-key",
            environment: "sandbox",
            publicClientKey: "public-client-key",
          },
        ],
        connections: [],
      });
    });

    it("preserves the state of the connections configurator", () => {
      const configurator = new AppConfigurator();

      configurator.connections.addConnection({
        channelSlug: "channel-slug",
        providerId: "1",
      });

      const parsedConfig = JSON.parse(configurator.serialize());

      expect(parsedConfig).toEqual({
        providers: [],
        connections: [
          {
            id: expect.any(String),
            channelSlug: "channel-slug",
            providerId: "1",
          },
        ],
      });
    });
  });
});
