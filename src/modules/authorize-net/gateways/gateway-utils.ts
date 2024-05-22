import { z } from "zod";

type GatewayName = "acceptHosted" | "paypal" | "applePay" | "acceptJs"; // todo: centralize all the gateway and infer the names

const createGatewayDataSchema = <TName extends GatewayName, TData extends z.ZodTypeAny>(
  gatewayName: TName,
  data: TData,
) => {
  return z.object({
    type: z.literal(gatewayName),
    data,
  });
};

export const gatewayUtils = {
  createGatewayDataSchema,
};
