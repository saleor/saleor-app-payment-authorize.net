import { type AuthorizeProviderConfig } from "../authorize-net/authorize-net-config";
import { CustomerProfileClient } from "../authorize-net/client/customer-profile-client";
import { type AppConfigMetadataManager } from "../configuration/app-config-metadata-manager";
import { createLogger } from "@/lib/logger";

export class CustomerProfileManager {
  private appConfigMetadataManager: AppConfigMetadataManager;
  private customerProfileClient: CustomerProfileClient;
  private logger = createLogger({
    name: "CustomerProfileManager",
  });

  constructor({
    authorizeConfig,
    appConfigMetadataManager,
  }: {
    authorizeConfig: AuthorizeProviderConfig.FullShape;
    appConfigMetadataManager: AppConfigMetadataManager;
  }) {
    this.customerProfileClient = new CustomerProfileClient(authorizeConfig);
    this.appConfigMetadataManager = appConfigMetadataManager;
  }

  /**
   * @description This is called when the customer profile was found in metadata, but not in Authorize.net.
   */
  private async removeOutOfSyncCustomerProfileId({ userEmail }: { userEmail: string }) {
    this.logger.debug("Removing OutOfSync customerProfileId x userEmail mapping");
    const appConfigurator = await this.appConfigMetadataManager.get();
    appConfigurator.customerProfiles.removeCustomerProfile({ saleorUserEmail: userEmail });

    await this.appConfigMetadataManager.set(appConfigurator);
  }

  // todo: make sure the email logic is correct
  private async getStoredCustomerProfileId({
    userEmail,
  }: {
    userEmail: string;
  }): Promise<string | undefined> {
    const appConfigurator = await this.appConfigMetadataManager.get();
    const saleorCustomerProfileId = appConfigurator.customerProfiles.getCustomerProfileByUserEmail({
      userEmail,
    });

    // if the customer profile is not stored in metadata, return undefined
    if (!saleorCustomerProfileId) {
      this.logger.debug("Customer profile not found in metadata");
      return undefined;
    }

    this.logger.trace(
      { customerProfileId: saleorCustomerProfileId },
      "Calling Authorize.net to confirm customer profile",
    );

    // check if the customer profile is still valid (maybe it was deleted from Authorize.net)
    try {
      await this.customerProfileClient.getCustomerProfile({
        customerProfileId: saleorCustomerProfileId,
      });

      this.logger.debug("Customer profile found in metadata and confirmed in Authorize.net");
      return saleorCustomerProfileId;
    } catch (error) {
      this.logger.trace("Customer profile not found in Authorize.net");
      await this.removeOutOfSyncCustomerProfileId({ userEmail });
      return undefined;
    }
  }

  /**
   * @description Creates a new customer profile in Authorize.net and stores the mapping between the Authorize.net customerProfileId and the Saleor user email in metadata.
   */
  private async createAndSaveCustomerProfile({ userEmail }: { userEmail: string }) {
    const response = await this.customerProfileClient.createCustomerProfile({ userEmail });
    const newCustomerProfileId = response.customerProfileId;
    const appConfigurator = await this.appConfigMetadataManager.get();

    appConfigurator.customerProfiles.upsertCustomerProfile({
      authorizeCustomerProfileId: newCustomerProfileId,
      saleorUserEmail: userEmail,
    });

    await this.appConfigMetadataManager.set(appConfigurator);

    return newCustomerProfileId;
  }

  /**
   * @description Returns the Authorize.net customerProfileId for the given userEmail. If the customerProfileId is not stored in metadata, creates a new customer profile in Authorize.net and stores the mapping between the Authorize.net customerProfileId and the Saleor user email in metadata.
   */
  async getUserCustomerProfileId({ userEmail }: { userEmail: string }) {
    const customerProfileId = await this.getStoredCustomerProfileId({ userEmail });

    if (customerProfileId) {
      return customerProfileId;
    }

    return this.createAndSaveCustomerProfile({ userEmail });
  }
}
