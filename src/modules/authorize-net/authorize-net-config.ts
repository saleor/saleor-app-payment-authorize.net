import { z } from "zod";
import { env } from "@/lib/env.mjs";

export const authorizeNetConfigSchema = z.object({
  apiLoginId: z.string().min(1),
  transactionKey: z.string().min(1),
  isSandBox: z.boolean().default(true),
});

export type AuthorizeNetConfig = z.infer<typeof authorizeNetConfigSchema>;

const mockedConfig = {
  apiLoginId: env.API_LOGIN_ID,
  transactionKey: env.TRANSACTION_KEY,
  isSandBox: true,
};

export const authorizeMockedConfig = authorizeNetConfigSchema.parse(mockedConfig);
