import { describe, expect, it } from "vitest";
import { ActiveProviderResolver } from "./active-provider-resolver";
import { type AppConfig } from "./app-configurator";

describe("ActiveProviderResolver", () => {
  describe("resolve", () => {
    it("should return the provider for the given channel", () => {
      const appConfig: AppConfig.Shape = {
        providers: [
          {
            id: "provider1",
            apiLoginId: "apiLoginId1",
            publicClientKey: "publicClientKey1",
            transactionKey: "transactionKey1",
            environment: "sandbox",
          },
          {
            id: "provider2",
            apiLoginId: "apiLoginId2",
            publicClientKey: "publicClientKey2",
            transactionKey: "transactionKey2",
            environment: "sandbox",
          },
        ],
        connections: [
          {
            channelSlug: "channel1",
            providerId: "provider1",
            id: "connection1",
          },
          {
            channelSlug: "channel2",
            providerId: "provider2",
            id: "connection2",
          },
        ],
      };

      const activeProviderResolver = new ActiveProviderResolver(appConfig);

      const provider = activeProviderResolver.resolve("channel1");

      expect(provider).toEqual(appConfig.providers[0]);
    });
    it("should throw an error if the connection is not found", () => {
      const appConfig: AppConfig.Shape = {
        connections: [],
        providers: [],
      };

      const activeProviderResolver = new ActiveProviderResolver(appConfig);
      expect(() => activeProviderResolver.resolve("channel1")).toThrow();
    });
    it("should throw an error if the provider is not found", () => {
      const appConfig: AppConfig.Shape = {
        connections: [
          {
            channelSlug: "channel1",
            providerId: "provider1",
            id: "connection1",
          },
        ],
        providers: [],
      };

      const activeProviderResolver = new ActiveProviderResolver(appConfig);
      expect(() => activeProviderResolver.resolve("channel1")).toThrow();
    });
  });
});
