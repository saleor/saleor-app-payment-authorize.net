import { z } from "zod";

export const authorizeEnvironmentSchema = z.enum(["sandbox", "production"]);

const inputSchema = z.object({
  apiLoginId: z.string().min(1),
  publicClientKey: z.string().min(1),
  transactionKey: z.string().min(1),
  signatureKey: z.string().min(1),
  environment: authorizeEnvironmentSchema,
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
