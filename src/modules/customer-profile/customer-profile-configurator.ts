import { type CustomerProfile } from "./customer-profile.schema";
import { createLogger } from "@/lib/logger";

export class CustomerProfileConfigurator {
  private logger = createLogger({
    name: "CustomerProfileConfigurator",
  });

  constructor(private customerProfiles: CustomerProfile.Shape[]) {}

  getCustomerProfileByUserEmail({ userEmail }: { userEmail: string }) {
    const customerProfile = this.customerProfiles.find((p) => p.saleorUserEmail === userEmail);

    if (!customerProfile) {
      this.logger.trace(`Customer profile not found for user ${userEmail}`);
      return undefined;
    }

    return customerProfile.authorizeCustomerProfileId;
  }

  upsertCustomerProfile({
    saleorUserEmail,
    authorizeCustomerProfileId,
  }: {
    saleorUserEmail: string;
    authorizeCustomerProfileId: string;
  }) {
    const customerProfile = this.customerProfiles.find(
      (p) => p.saleorUserEmail === saleorUserEmail,
    );

    if (customerProfile) {
      customerProfile.authorizeCustomerProfileId = authorizeCustomerProfileId;
      this.logger.trace({ customerProfile }, "Updated existing customer profile with:");
    } else {
      this.logger.trace(
        { saleorUserEmail, authorizeCustomerProfileId },
        "Created new customer profile with:",
      );
      this.customerProfiles.push({
        saleorUserEmail,
        authorizeCustomerProfileId,
      });
    }

    return this.customerProfiles;
  }
}
