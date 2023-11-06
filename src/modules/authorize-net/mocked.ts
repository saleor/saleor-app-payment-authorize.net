import { FullSchema } from "./authorize-net-config";
import { env } from "@/lib/env.mjs";

const mockedConfig = {
  apiLoginId: env.AUTHORIZE_API_LOGIN_ID,
  transactionKey: env.AUTHORIZE_TRANSACTION_KEY,
  publicClientKey: env.AUTHORIZE_PUBLIC_CLIENT_KEY,
  environment: env.AUTHORIZE_ENVIRONMENT,
  id: "mocked-id",
};

const authorizeConfig = FullSchema.parse(mockedConfig);

export const mocked = {
  authorizeConfig,
};
