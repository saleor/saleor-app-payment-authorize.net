import { CustomerProfileClient } from "../authorize-net/client/customer-profile-client";
import { createLogger } from "@/lib/logger";
import {
  type CustomerProfileReq,
  type CreateCustomerProfileReqType,
  type ProfileType,
} from "@/lib/utils";

export type GetCustomerProfileType = {
  customerProfileId: string | null;
  profileType: ProfileType;
};
export class CustomerProfileManager {
  private customerProfileClient: CustomerProfileClient;
  private logger = createLogger({
    name: "CustomerProfileManager",
  });

  constructor() {
    this.customerProfileClient = new CustomerProfileClient();
  }

  private async getCustomerProfileIdByUser(
    userDetail: CustomerProfileReq,
  ): Promise<GetCustomerProfileType> {
    let customerProfileId = null;
    let profileType = null;
    try {
      const response = await this.customerProfileClient.getCustomerProfileByUser(userDetail);
      customerProfileId = response.profile.customerProfileId;
      profileType = response.profile.profileType as ProfileType;
      this.logger.debug("Customer profile found in Authorize.net");
    } catch (error) {
      this.logger.trace("Customer profile not found in Authorize.net");
    }
    return {
      customerProfileId,
      profileType,
    };
  }

  /**
   * @description Creates a new customer profile in Authorize.net.
   */
  private async createCustomerProfile(userDetail: CustomerProfileReq) {
    const response = await this.customerProfileClient.createCustomerProfile(userDetail);

    return response.customerProfileId;
  }

  /**
   * @description Creates a new customer profile in Authorize.net.
   */
  private async updateCustomerProfile(
    userDetail: CustomerProfileReq,
    customerProfileId: string,
    description: string,
  ) {
    const response = await this.customerProfileClient.updateCustomerProfile(
      userDetail,
      customerProfileId,
      description,
    );

    return response.customerProfileId;
  }

  /**
   * @description Returns the Authorize.net customerProfileId for the given userEmail. If the customerProfileId is not found, creates a new customer profile in Authorize.net.
   */
  async getUserCustomerProfileId(userDetail: CustomerProfileReq) {
    const { customerProfileId, profileType } = await this.getCustomerProfileIdByUser(userDetail);

    if (userDetail.user && profileType === "guest" && customerProfileId) {
      userDetail = { ...userDetail, profileType: "regular" };
      return this.updateCustomerProfile(userDetail, customerProfileId, "Regular user profile");
    }

    if (customerProfileId) {
      return customerProfileId;
    }

    return this.createCustomerProfile(userDetail);
  }

  /**
   * @description Returns the Authorize.net customerSavedPaymentProfile for the given userEmail.
   */
  async getUserCustomerPaymentProfile({ user }: CustomerProfileReq) {
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
