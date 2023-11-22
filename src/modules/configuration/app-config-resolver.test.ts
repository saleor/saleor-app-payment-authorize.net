import { encrypt } from "@saleor/app-sdk/settings-manager";
import { describe } from "vitest";
import { type AppConfig } from "./app-configurator";
import { env } from "@/lib/env.mjs";
import { type WebhookRecipientFragment } from "generated/graphql";

const appConfig: AppConfig.Shape = {
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
  customerProfiles: [],
};

const _metadata: WebhookRecipientFragment["privateMetadata"] = [
  {
    key: "appConfig",
    value: encrypt(JSON.stringify(appConfig), env.SECRET_KEY),
  },
];

describe.todo("AppConfigResolver");
