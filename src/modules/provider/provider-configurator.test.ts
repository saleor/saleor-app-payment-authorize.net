import { beforeEach, describe, expect, it } from "vitest";
import { type RootConfig } from "../configuration/app-config";
import { ProvidersConfigurator } from "./provider-configurator";

let rootData: RootConfig.Shape = {
  providers: [],
  connections: [],
};

beforeEach(() => {
  rootData = {
    providers: [],
    connections: [],
  };
});

describe("ProvidersConfigurator", () => {
  describe("getProviders", () => {
    it("returns all providers", () => {
      const configurator = new ProvidersConfigurator({
        providers: [
          {
            id: "1",
            apiLoginId: "api-login-id",
            transactionKey: "transaction-key",
            environment: "sandbox",
            publicClientKey: "public-client-key",
          },
          {
            id: "2",
            apiLoginId: "api-login-id",
            transactionKey: "transaction-key",
            environment: "sandbox",
            publicClientKey: "public-client-key",
          },
        ],
        connections: [],
      });

      expect(configurator.getProviders()).toEqual([
        {
          id: "1",
          apiLoginId: "api-login-id",
          transactionKey: "transaction-key",
          environment: "sandbox",
          publicClientKey: "public-client-key",
        },
        {
          id: "2",
          apiLoginId: "api-login-id",
          transactionKey: "transaction-key",
          environment: "sandbox",
          publicClientKey: "public-client-key",
        },
      ]);
    });
  });

  describe("getProviderById", () => {
    it("returns the provider with the given id", () => {
      const configurator = new ProvidersConfigurator({
        providers: [
          {
            id: "1",
            apiLoginId: "api-login-id",
            transactionKey: "transaction-key",
            environment: "sandbox",
            publicClientKey: "public-client-key",
          },
        ],
        connections: [],
      });

      expect(configurator.getProviderById("1")).toEqual({
        id: "1",
        apiLoginId: "api-login-id",
        transactionKey: "transaction-key",
        environment: "sandbox",
        publicClientKey: "public-client-key",
      });
    });

    it("returns undefined if the id doesn't match", () => {
      const configurator = new ProvidersConfigurator({
        providers: [
          {
            id: "1",
            apiLoginId: "api-login-id",
            transactionKey: "transaction-key",
            environment: "sandbox",
            publicClientKey: "public-client-key",
          },
        ],
        connections: [],
      });

      expect(configurator.getProviderById("not-a-real-id")).toBeUndefined();
    });
  });

  describe("addProvider", () => {
    it("adds a new provider", () => {
      const configurator = new ProvidersConfigurator(rootData);

      configurator.addProvider({
        apiLoginId: "api-login-id",
        transactionKey: "transaction-key",
        environment: "sandbox",
        publicClientKey: "public-client-key",
      });

      expect(configurator.getProviders()).toEqual([
        {
          id: expect.any(String),
          apiLoginId: "api-login-id",
          transactionKey: "transaction-key",
          environment: "sandbox",
          publicClientKey: "public-client-key",
        },
      ]);
    });
  });

  describe("updateProvider", () => {
    it("doesn't update the provider if the id doesn't match", () => {
      const configurator = new ProvidersConfigurator(rootData);

      configurator.updateProvider({
        id: "not-a-real-id",
        apiLoginId: "api-login-id",
        transactionKey: "transaction-key",
        environment: "sandbox",
        publicClientKey: "public-client-key",
      });

      expect(configurator.getProviders()).toEqual(rootData.providers);
    });
    it("updates the provider with the given id", () => {
      const configurator = new ProvidersConfigurator({
        providers: [
          {
            id: "1",
            apiLoginId: "api-login-id",
            transactionKey: "transaction-key",
            environment: "sandbox",
            publicClientKey: "public-client-key",
          },
        ],
        connections: [],
      });

      configurator.updateProvider({
        id: "1",
        apiLoginId: "new-api-login-id",
        transactionKey: "new-transaction-key",
        environment: "sandbox",
        publicClientKey: "new-public-client-key",
      });

      expect(configurator.getProviders()).toEqual([
        {
          id: "1",
          apiLoginId: "new-api-login-id",
          transactionKey: "new-transaction-key",
          environment: "sandbox",
          publicClientKey: "new-public-client-key",
        },
      ]);
    });
  });

  describe("deleteProvider", () => {
    it("deletes the selected provider", () => {
      const configurator = new ProvidersConfigurator({
        providers: [
          {
            id: "1",
            apiLoginId: "api-login-id",
            transactionKey: "transaction-key",
            environment: "sandbox",
            publicClientKey: "public-client-key",
          },
          {
            id: "2",
            apiLoginId: "api-login-id",
            transactionKey: "transaction-key",
            environment: "sandbox",
            publicClientKey: "public-client-key",
          },
        ],
        connections: [],
      });

      configurator.deleteProvider("1");

      expect(configurator.getProviders()).toEqual([
        {
          id: "2",
          apiLoginId: "api-login-id",
          transactionKey: "transaction-key",
          environment: "sandbox",
          publicClientKey: "public-client-key",
        },
      ]);
    });

    it("doesn't delete any providers if the id doesn't match", () => {
      const configurator = new ProvidersConfigurator({
        providers: [
          {
            id: "1",
            apiLoginId: "api-login-id",
            transactionKey: "transaction-key",
            environment: "sandbox",
            publicClientKey: "public-client-key",
          },
          {
            id: "2",
            apiLoginId: "api-login-id",
            transactionKey: "transaction-key",
            environment: "sandbox",
            publicClientKey: "public-client-key",
          },
        ],
        connections: [],
      });

      configurator.deleteProvider("not-a-real-id");

      expect(configurator.getProviders()).toEqual([
        {
          id: "1",
          apiLoginId: "api-login-id",
          transactionKey: "transaction-key",
          environment: "sandbox",
          publicClientKey: "public-client-key",
        },
        {
          id: "2",
          apiLoginId: "api-login-id",
          transactionKey: "transaction-key",
          environment: "sandbox",
          publicClientKey: "public-client-key",
        },
      ]);
    });
  });
});
