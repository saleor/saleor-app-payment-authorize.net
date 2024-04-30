import { CustomerProfileClient } from "../authorize-net/client/customer-profile-client";
import { type UserWithEmailFragment } from "generated/graphql";
import { createLogger } from "@/lib/logger";
import { type CreateCustomerProfileReqType } from "@/lib/utils";

export class CustomerProfileManager {
  private customerProfileClient: CustomerProfileClient;
  private logger = createLogger({
    name: "CustomerProfileManager",
  });

  constructor() {
    this.customerProfileClient = new CustomerProfileClient();
  }

  private async getCustomerProfileIdByUser({
    user,
  }: {
    user: UserWithEmailFragment;
  }): Promise<string | undefined> {
    try {
      const response = await this.customerProfileClient.getCustomerProfileByUser({ user });

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
  private async createCustomerProfile({ user }: { user: UserWithEmailFragment }) {
    const response = await this.customerProfileClient.createCustomerProfile({ user });

    return response.customerProfileId;
  }

  /**
   * @description Returns the Authorize.net customerProfileId for the given userEmail. If the customerProfileId is not found, creates a new customer profile in Authorize.net.
   */
  async getUserCustomerProfileId({ user }: { user: UserWithEmailFragment }) {
    const customerProfileId = await this.getCustomerProfileIdByUser({ user });

    if (customerProfileId) {
      return customerProfileId;
    }

    return this.createCustomerProfile({ user });
  }

  /**
   * @description Returns the Authorize.net customerSavedPaymentProfile for the given userEmail.
   */
  async getUserCustomerPaymentProfile({ user }: { user: UserWithEmailFragment }) {
    try {
      const response = await this.customerProfileClient.getCustomerProfileByUser({ user });
      if (!response.profile?.paymentProfiles?.length) {
        return [];
      }
      this.logger.debug("Customer profile found in Authorize.net");
      return response.profile.paymentProfiles;
    } catch (error) {
      this.logger.trace("Customer profile not found in Authorize.net");
      return undefined;
    }
  }

  /**
   * @description Creates a new customer payment profile in Authorize.net.
   */
  async createCustomerPaymentProfile(request: CreateCustomerProfileReqType) {
    const response = await this.customerProfileClient.createCustomerPaymentProfile(request);
    return response.customerPaymentProfileId;
  }
}
