import { beforeEach, describe, expect, it } from "vitest";
import { type AppConfig } from "../configuration/app-configurator";
import { ProvidersConfigurator } from "./provider-configurator";

let rootData: AppConfig.Shape["providers"] = [];

beforeEach(() => {
  rootData = [];
});

describe("ProvidersConfigurator", () => {
  describe("getProviders", () => {
    it("returns all providers", () => {
      const configurator = new ProvidersConfigurator([
        {
          id: "1",
          apiLoginId: "api-login-id",
          transactionKey: "transaction-key",
          environment: "sandbox",
          publicClientKey: "public-client-key",
          signatureKey: "signature-key",
          webhooks: [],
        },
        {
          id: "2",
          apiLoginId: "api-login-id",
          transactionKey: "transaction-key",
          environment: "sandbox",
          publicClientKey: "public-client-key",
          signatureKey: "signature-key-2",
          webhooks: [],
        },
      ]);

      expect(configurator.getProviders()).toEqual([
        {
          id: "1",
          apiLoginId: "api-login-id",
          transactionKey: "transaction-key",
          environment: "sandbox",
          publicClientKey: "public-client-key",
          signatureKey: "signature-key",
          webhooks: [],
        },
        {
          id: "2",
          apiLoginId: "api-login-id",
          transactionKey: "transaction-key",
          environment: "sandbox",
          publicClientKey: "public-client-key",
          signatureKey: "signature-key-2",
          webhooks: [],
        },
      ]);
    });
  });

  describe("getProviderById", () => {
    it("returns the provider with the given id", () => {
      const configurator = new ProvidersConfigurator([
        {
          id: "1",
          apiLoginId: "api-login-id",
          transactionKey: "transaction-key",
          environment: "sandbox",
          publicClientKey: "public-client-key",
          signatureKey: "signature-key",
          webhooks: [],
        },
      ]);

      expect(configurator.getProviderById("1")).toEqual({
        id: "1",
        apiLoginId: "api-login-id",
        transactionKey: "transaction-key",
        environment: "sandbox",
        publicClientKey: "public-client-key",
        signatureKey: "signature-key",
        webhooks: [],
      });
    });

    it("returns undefined if the id doesn't match", () => {
      const configurator = new ProvidersConfigurator([
        {
          id: "1",
          apiLoginId: "api-login-id",
          transactionKey: "transaction-key",
          environment: "sandbox",
          publicClientKey: "public-client-key",
          signatureKey: "signature-key",
          webhooks: [],
        },
      ]);

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
        signatureKey: "signature-key",
        webhooks: [],
      });

      expect(configurator.getProviders()).toEqual([
        {
          id: expect.any(String),
          apiLoginId: "api-login-id",
          transactionKey: "transaction-key",
          environment: "sandbox",
          publicClientKey: "public-client-key",
          signatureKey: "signature-key",
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
        signatureKey: "signature-key",
        webhooks: [],
      });

      expect(configurator.getProviders()).toEqual(rootData);
    });
    it("updates the provider with the given id", () => {
      const configurator = new ProvidersConfigurator([
        {
          id: "1",
          apiLoginId: "api-login-id",
          transactionKey: "transaction-key",
          environment: "sandbox",
          publicClientKey: "public-client-key",
          signatureKey: "signature-key",
          webhooks: [],
        },
      ]);

      configurator.updateProvider({
        id: "1",
        apiLoginId: "new-api-login-id",
        transactionKey: "new-transaction-key",
        environment: "sandbox",
        publicClientKey: "new-public-client-key",
        signatureKey: "new-signature-key",
        webhooks: [],
      });

      expect(configurator.getProviders()).toEqual([
        {
          id: "1",
          apiLoginId: "new-api-login-id",
          transactionKey: "new-transaction-key",
          environment: "sandbox",
          publicClientKey: "new-public-client-key",
          signatureKey: "new-signature-key",
        },
      ]);
    });
  });

  describe("deleteProvider", () => {
    it("deletes the selected provider", () => {
      const configurator = new ProvidersConfigurator([
        {
          id: "1",
          apiLoginId: "api-login-id",
          transactionKey: "transaction-key",
          environment: "sandbox",
          publicClientKey: "public-client-key",
          signatureKey: "signature-key",
          webhooks: [],
        },
        {
          id: "2",
          apiLoginId: "api-login-id",
          transactionKey: "transaction-key",
          environment: "sandbox",
          publicClientKey: "public-client-key",
          signatureKey: "signature-key-2",
          webhooks: [],
        },
      ]);

      configurator.deleteProvider("1");

      expect(configurator.getProviders()).toEqual([
        {
          id: "2",
          apiLoginId: "api-login-id",
          transactionKey: "transaction-key",
          environment: "sandbox",
          publicClientKey: "public-client-key",
          signatureKey: "signature-key-2",
        },
      ]);
    });

    it("doesn't delete any providers if the id doesn't match", () => {
      const configurator = new ProvidersConfigurator([
        {
          id: "1",
          apiLoginId: "api-login-id",
          transactionKey: "transaction-key",
          environment: "sandbox",
          publicClientKey: "public-client-key",
          signatureKey: "signature-key",
          webhooks: [],
        },
        {
          id: "2",
          apiLoginId: "api-login-id",
          transactionKey: "transaction-key",
          environment: "sandbox",
          publicClientKey: "public-client-key",
          signatureKey: "signature-key-2",
          webhooks: [],
        },
      ]);

      configurator.deleteProvider("not-a-real-id");

      expect(configurator.getProviders()).toEqual([
        {
          id: "1",
          apiLoginId: "api-login-id",
          transactionKey: "transaction-key",
          environment: "sandbox",
          publicClientKey: "public-client-key",
          signatureKey: "signature-key",
        },
        {
          id: "2",
          apiLoginId: "api-login-id",
          transactionKey: "transaction-key",
          environment: "sandbox",
          publicClientKey: "public-client-key",
          signatureKey: "signature-key-2",
        },
      ]);
    });
  });
});
