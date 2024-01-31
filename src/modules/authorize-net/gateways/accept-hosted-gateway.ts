import AuthorizeNet from "authorizenet";
import { CustomerProfileManager } from "../../customer-profile/customer-profile-manager";
import { getAuthorizeConfig, type AuthorizeConfig } from "../authorize-net-config";
import { authorizeTransaction } from "../authorize-transaction-builder";
import {
  HostedPaymentPageClient,
  type GetHostedPaymentPageResponse,
} from "../client/hosted-payment-page-client";

import {
  acceptHostedTransactionInitializeSchema,
  type AcceptHostedTransactionInitializeResponseData,
  type AcceptHostedPaymentGatewayResponseData,
} from "./accept-hosted-schema";
import {
  type TransactionProcessSessionEventFragment,
  type PaymentGatewayInitializeSessionEventFragment,
  type TransactionInitializeSessionEventFragment,
} from "generated/graphql";

import { BaseError } from "@/errors";
import { env } from "@/lib/env.mjs";
import { createLogger } from "@/lib/logger";
import { type PaymentGateway } from "@/modules/webhooks/payment-gateway-initialize-session";
import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";
import { type TransactionProcessSessionResponse } from "@/schemas/TransactionProcessSession/TransactionProcessSessionResponse.mjs";

const ApiContracts = AuthorizeNet.APIContracts;

const AcceptHostedPaymentGatewayError = BaseError.subclass("AcceptHostedPaymentGatewayError");

export class AcceptHostedGateway implements PaymentGateway {
  private authorizeConfig: AuthorizeConfig;
  private customerProfileManager: CustomerProfileManager;

  private logger = createLogger({
    name: "AcceptHostedGateway",
  });

  constructor() {
    this.authorizeConfig = getAuthorizeConfig();
    this.customerProfileManager = new CustomerProfileManager();
  }

  private async buildTransactionFromPayload(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<AuthorizeNet.APIContracts.TransactionRequestType> {
    const transactionRequest = authorizeTransaction.buildTransactionFromCommonFragments(payload);

    const userEmail = payload.sourceObject.userEmail;

    if (!userEmail) {
      this.logger.trace("No user email found in payload, skipping customerProfileId lookup.");

      return transactionRequest;
    }

    const dataParseResult = acceptHostedTransactionInitializeSchema.request.safeParse(payload.data);

    if (!dataParseResult.success) {
      this.logger.error({ error: dataParseResult.error.format() });
      throw new AcceptHostedPaymentGatewayError("`data` object has unexpected structure.", {
        cause: dataParseResult.error,
      });
    }

    const {
      data: { shouldCreateCustomerProfile },
    } = dataParseResult.data;

    if (!shouldCreateCustomerProfile) {
      this.logger.trace("Skipping customerProfileId lookup.");

      return transactionRequest;
    }

    this.logger.trace("Looking up customerProfileId.");

    const customerProfileId = await this.customerProfileManager.getUserCustomerProfileId({
      userEmail,
    });

    if (customerProfileId) {
      this.logger.trace("Found customerProfileId, adding to transaction request.");

      const profile = {
        customerProfileId,
      };

      transactionRequest.setProfile(profile);
    }

    return transactionRequest;
  }

  private mapResponseToTransactionInitializeData(
    response: GetHostedPaymentPageResponse,
  ): AcceptHostedTransactionInitializeResponseData {
    const dataParseResult = acceptHostedTransactionInitializeSchema.response.safeParse({
      type: "acceptHosted",
      data: {
        formToken: response.token,
        environment: this.authorizeConfig.environment,
      },
    });

    if (!dataParseResult.success) {
      this.logger.error({ error: dataParseResult.error.format() });
      throw new AcceptHostedPaymentGatewayError("`data` object has unexpected structure.", {
        cause: dataParseResult.error,
      });
    }

    return dataParseResult.data;
  }

  private getHostedPaymentPageSettings(): AuthorizeNet.APIContracts.ArrayOfSetting {
    const settings = {
      hostedPaymentReturnOptions: {
        showReceipt: false, // must be false if we want to receive the transaction response in the payment form iframe
      },
      hostedPaymentIFrameCommunicatorUrl: {
        url: `${env.AUTHORIZE_PAYMENT_FORM_URL}/accept-hosted.html`, // url where the payment form iframe will be hosted,
      },
      hostedPaymentCustomerOptions: {
        showEmail: false,
        requiredEmail: false,
        addPaymentProfile: true,
      },
      hostedPaymentOrderOptions: {
        /** we need to hide order details because we are using order.description to store the saleorTransactionId.
         * @see: createSynchronizedTransactionRequest */
        show: false,
      },
      hostedPaymentBillingAddressOptions: {
        show: false, // hide because the address form will be outside of the payment form iframe
        required: false,
      },
    };

    const settingsArray: AuthorizeNet.APIContracts.SettingType[] = [];

    Object.entries(settings).forEach(([settingName, settingValue]) => {
      const setting = new ApiContracts.SettingType();
      setting.setSettingName(settingName);
      setting.setSettingValue(JSON.stringify(settingValue));
      settingsArray.push(setting);
    });

    const arrayOfSettings = new ApiContracts.ArrayOfSetting();
    arrayOfSettings.setSetting(settingsArray);

    return arrayOfSettings;
  }

  async initializePaymentGateway(
    _payload: PaymentGatewayInitializeSessionEventFragment,
  ): Promise<AcceptHostedPaymentGatewayResponseData> {
    return {};
  }

  async initializeTransaction(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<TransactionInitializeSessionResponse> {
    const transactionInput = await this.buildTransactionFromPayload(payload);
    const settingsInput = this.getHostedPaymentPageSettings();

    const hostedPaymentPageClient = new HostedPaymentPageClient();

    const hostedPaymentPageResponse = await hostedPaymentPageClient.getHostedPaymentPageRequest({
      transactionInput,
      settingsInput,
    });

    this.logger.trace("Successfully called getHostedPaymentPageRequest");

    const data = this.mapResponseToTransactionInitializeData(hostedPaymentPageResponse);

    return {
      amount: payload.action.amount,
      result: "AUTHORIZATION_ACTION_REQUIRED",
      data,
    };
  }

  async processTransaction(
    _payload: TransactionProcessSessionEventFragment,
  ): Promise<TransactionProcessSessionResponse> {
    throw new Error("Method not implemented.");
  }
}
