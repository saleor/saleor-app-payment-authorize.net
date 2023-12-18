import { z } from "zod";

export const authorizeEnvironmentSchema = z.enum(["sandbox", "production"]);

const authorizeNetEventSchema = z.enum([
  "net.authorize.payment.authorization.created",
  "net.authorize.payment.authcapture.created",
  "net.authorize.payment.capture.created",
  "net.authorize.payment.refund.created",
  "net.authorize.payment.priorAuthCapture.created",
  "net.authorize.payment.void.create",
]);

export const webhookSchema = z.object({
  name: z.string(),
  url: z.string(),
  eventTypes: z.array(authorizeNetEventSchema),
  status: z.enum(["active", "inactive"]),
});

const inputSchema = z.object({
  apiLoginId: z.string().min(1),
  publicClientKey: z.string().min(1),
  transactionKey: z.string().min(1),
  signatureKey: z.string().min(1),
  environment: authorizeEnvironmentSchema,
  webhook: webhookSchema.nullable(),
});

const fullSchema = inputSchema.extend({
  id: z.string(),
});

export namespace AuthorizeProviderConfig {
  export type InputShape = z.infer<typeof inputSchema>;
  export type FullShape = z.infer<typeof fullSchema>;

  export const Schema = {
    Input: inputSchema,
    Full: fullSchema,
  };
}
