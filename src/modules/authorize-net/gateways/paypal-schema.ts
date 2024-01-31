import { z } from "zod";
import { gatewayUtils } from "./gateway-utils";

export const paypalTransactionInitializeSchema = {
  request: gatewayUtils.createGatewayDataSchema("paypal", z.object({}).optional()),
  response: gatewayUtils.createGatewayDataSchema(
    "paypal",
    z.object({
      secureAcceptanceUrl: z.string().min(1),
    }),
  ),
};

export const paypalPaymentGatewayInitializeSchema = {
  request: gatewayUtils.createGatewayDataSchema("paypal", z.object({}).optional()),
  response: gatewayUtils.createGatewayDataSchema("paypal", z.object({}).optional()),
};

export type PaypalPaymentGatewayResponseData = z.infer<
  typeof paypalPaymentGatewayInitializeSchema.response
>;

export const paypalTransactionProcessSchema = {
  request: gatewayUtils.createGatewayDataSchema(
    "paypal",
    z.object({
      payerId: z.string().min(1),
    }),
  ),
};
