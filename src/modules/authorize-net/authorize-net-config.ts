import { z } from "zod";

const InputSchema = z.object({
  apiLoginId: z.string().min(1),
  publicClientKey: z.string().min(1),
  transactionKey: z.string().min(1),
  environment: z.enum(["sandbox", "production"]).default("sandbox"),
});

const FullSchema = InputSchema.extend({
  id: z.string(),
});

export namespace AuthorizeProviderConfig {
  export type InputShape = z.infer<typeof InputSchema>;
  export type FullShape = z.infer<typeof FullSchema>;

  export const Schema = {
    Input: InputSchema,
    Full: FullSchema,
  };
}
