import { z } from "zod";
import { authorizeEnvironmentSchema } from "../authorize-net-config";
import { gatewayUtils } from "./gateway-utils";

export const acceptHostedPaymentGatewayInitializeSchema = {
  request: z.object({}),
  response: z.object({}),
};
export type AcceptHostedPaymentGatewayResponseData = z.infer<
  typeof acceptHostedPaymentGatewayInitializeSchema.response
>;

export const acceptHostedTransactionInitializeSchema = {
  request: gatewayUtils.createGatewayDataSchema(
    "acceptHosted",
    z.object({
      shouldCreateCustomerProfile: z.boolean().optional().default(false),
    }),
  ),
  response: gatewayUtils.createGatewayDataSchema(
    "acceptHosted",
    z.object({
      formToken: z.string().min(1),
      environment: authorizeEnvironmentSchema,
    }),
  ),
};
export type AcceptHostedTransactionInitializeResponseData = z.infer<
  typeof acceptHostedTransactionInitializeSchema.response
>;
