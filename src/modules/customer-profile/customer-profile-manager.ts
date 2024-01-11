import { CustomerProfileClient } from "../authorize-net/client/customer-profile-client";
import { createLogger } from "@/lib/logger";

export class CustomerProfileManager {
  private customerProfileClient: CustomerProfileClient;
  private logger = createLogger({
    name: "CustomerProfileManager",
  });

  constructor() {
    this.customerProfileClient = new CustomerProfileClient();
  }

  // todo: make sure the email logic is correct
  private async getCustomerProfileIdByEmail({
    userEmail,
  }: {
    userEmail: string;
  }): Promise<string | undefined> {
    try {
      const response = await this.customerProfileClient.getCustomerProfileByEmail({
        email: userEmail,
      });

      this.logger.debug("Customer profile found in Authorize.net");
      return response.profile.customerProfileId;
    } catch (error) {
      this.logger.trace("Customer profile not found in Authorize.net");
      return undefined;
    }
  }

  /**
   * @description Creates a new customer profile in Authorize.net.
   */
  private async createCustomerProfile({ userEmail }: { userEmail: string }) {
    const response = await this.customerProfileClient.createCustomerProfile({ userEmail });

    return response.customerProfileId;
  }

  /**
   * @description Returns the Authorize.net customerProfileId for the given userEmail. If the customerProfileId is not found, creates a new customer profile in Authorize.net.
   */
  async getUserCustomerProfileId({ userEmail }: { userEmail: string }) {
    const customerProfileId = await this.getCustomerProfileIdByEmail({ userEmail });

    if (customerProfileId) {
      return customerProfileId;
    }

    return this.createCustomerProfile({ userEmail });
  }
}
