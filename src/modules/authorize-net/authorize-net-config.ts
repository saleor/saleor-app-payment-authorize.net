import { z } from "zod";

export const authorizeEnvironmentSchema = z.enum(["sandbox", "production"]);

const fullSchema = z.object({
  apiLoginId: z.string().min(1),
  publicClientKey: z.string().min(1),
  transactionKey: z.string().min(1),
  signatureKey: z.string().min(1),
  environment: authorizeEnvironmentSchema,
});

export namespace AuthorizeConfig {
  export type FullShape = z.infer<typeof fullSchema>;

  export const Schema = {
    Full: fullSchema,
  };
}
