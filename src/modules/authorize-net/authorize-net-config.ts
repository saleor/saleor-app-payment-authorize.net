import { z } from "zod";
import { env } from "@/lib/env.mjs";

export const authorizeNetConfigSchema = z.object({
  apiLoginId: z.string().min(1),
  publicClientKey: z.string().min(1),
  transactionKey: z.string().min(1),
  environment: z.enum(["sandbox", "production"]).default("sandbox"),
});

export type AuthorizeNetConfig = z.infer<typeof authorizeNetConfigSchema>;

const mockedConfig = {
  apiLoginId: env.AUTHORIZE_API_LOGIN_ID,
  transactionKey: env.AUTHORIZE_TRANSACTION_KEY,
  publicClientKey: env.AUTHORIZE_PUBLIC_CLIENT_KEY,
  environment: env.AUTHORIZE_ENVIRONMENT,
};

export const authorizeMockedConfig = authorizeNetConfigSchema.parse(mockedConfig);
