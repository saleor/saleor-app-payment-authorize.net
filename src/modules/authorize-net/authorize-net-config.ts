import { z } from "zod";
import { env } from "@/lib/env.mjs";

const InputSchema = z.object({
  apiLoginId: z.string().min(1),
  publicClientKey: z.string().min(1),
  transactionKey: z.string().min(1),
  environment: z.enum(["sandbox", "production"]).default("sandbox"),
});

const FullSchema = InputSchema.extend({
  id: z.string(),
});

export namespace AuthorizeProviderConfig {
  export type InputShape = z.infer<typeof InputSchema>;
  export type FullShape = z.infer<typeof FullSchema>;

  export const Schema = {
    Input: InputSchema,
    Full: FullSchema,
  };
}

const mockedConfig = {
  apiLoginId: env.AUTHORIZE_API_LOGIN_ID,
  transactionKey: env.AUTHORIZE_TRANSACTION_KEY,
  publicClientKey: env.AUTHORIZE_PUBLIC_CLIENT_KEY,
  environment: env.AUTHORIZE_ENVIRONMENT,
  id: "mocked-id",
};

export const authorizeMockedConfig = FullSchema.parse(mockedConfig);
