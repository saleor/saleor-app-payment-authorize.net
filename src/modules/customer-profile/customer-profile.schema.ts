import { z } from "zod";

const userCustomerProfileSchema = z.object({
  saleorUserEmail: z.string(),
  authorizeCustomerProfileId: z.string(),
});

type CustomerProfile = z.infer<typeof userCustomerProfileSchema>;

export namespace CustomerProfile {
  export type Shape = CustomerProfile;

  export const Schema = userCustomerProfileSchema;
}
