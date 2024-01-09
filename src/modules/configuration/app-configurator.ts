import { type z } from "zod";
import { AuthorizeConfig } from "../authorize-net/authorize-net-config";
import { env } from "@/lib/env.mjs";

export namespace AppConfig {
  export const Schema = AuthorizeConfig.Schema.Full;

  export type Shape = z.infer<typeof Schema>;
}

export function getAppConfiguration(): AuthorizeConfig.FullShape {
  return {
    apiLoginId: env.AUTHORIZE_API_LOGIN_ID,
    publicClientKey: env.AUTHORIZE_PUBLIC_CLIENT_KEY,
    transactionKey: env.AUTHORIZE_TRANSACTION_KEY,
    environment: env.AUTHORIZE_ENVIRONMENT,
    signatureKey: env.AUTHORIZE_SIGNATURE_KEY,
  };
}
