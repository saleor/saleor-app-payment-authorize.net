import { encrypt } from "@saleor/app-sdk/settings-manager";
import { describe, expect, it } from "vitest";
import { resolveAppConfigFromMetadataOrEnv } from "./app-config-resolver";
import { type RootConfig } from "./app-configurator";
import { type WebhookRecipientFragment } from "generated/graphql";
import { env } from "@/lib/env.mjs";

const appConfig: RootConfig.Shape = {
  connections: [
    {
      channelSlug: "channel1",
      id: "connection1",
      providerId: "provider1",
    },
  ],
  providers: [
    {
      apiLoginId: "apiLoginId1",
      environment: "sandbox",
      id: "provider1",
      publicClientKey: "publicClientKey1",
      transactionKey: "transactionKey1",
    },
  ],
};

const metadata: WebhookRecipientFragment["privateMetadata"] = [
  {
    key: "appConfig",
    value: encrypt(JSON.stringify(appConfig), env.SECRET_KEY),
  },
];

describe("resolveAppConfigFromMetadataOrEnv", () => {
  it("should return the config from the metadata", () => {
    const config = resolveAppConfigFromMetadataOrEnv(metadata);
    expect(config).toEqual(appConfig);
  });

  it("should throw an error if no app config was found", () => {
    expect(() => resolveAppConfigFromMetadataOrEnv([])).toThrow();
  });

  it.todo("test reading from env");
});
