import { type CustomerProfile } from "./customer-profile.schema";
import { createLogger } from "@/lib/logger";

export class CustomerProfileConfigurator {
  private logger = createLogger({
    name: "CustomerProfileConfigurator",
  });

  constructor(private customerProfiles: CustomerProfile.Shape[]) {}

  getCustomerProfileByuserEmail(userEmail: string) {
    const customerProfile = this.customerProfiles.find((p) => p.saleorUserEmail === userEmail);

    if (!customerProfile) {
      this.logger.trace(`Customer profile not found for user ${userEmail}`);
      return undefined;
    }

    this.logger.trace(
      `Found "${customerProfile.saleorUserEmail} x ${customerProfile.authorizeCustomerProfileId}" pair`,
    );
    return customerProfile.authorizeCustomerProfileId;
  }

  upsertCustomerProfile({
    userEmail,
    authorizeCustomerProfileId,
  }: {
    userEmail: string;
    authorizeCustomerProfileId: string;
  }) {
    const customerProfile = this.customerProfiles.find((p) => p.saleorUserEmail === userEmail);

    if (customerProfile) {
      customerProfile.authorizeCustomerProfileId = authorizeCustomerProfileId;
      this.logger.trace({ customerProfile }, "Updated existing customer profile with:");
    } else {
      this.logger.trace(
        { userEmail, authorizeCustomerProfileId },
        "Created new customer profile with:",
      );
      this.customerProfiles.push({
        saleorUserEmail: userEmail,
        authorizeCustomerProfileId,
      });
    }

    return this.customerProfiles;
  }
}
