import { env } from "process";
import AuthorizeNet from "authorizenet";
import { z } from "zod";
import { CustomerProfileManager } from "../../customer-profile/customer-profile-manager";
import {
  authorizeEnvironmentSchema,
  getAuthorizeConfig,
  type AuthorizeConfig,
} from "../authorize-net-config";
import { authorizeTransaction } from "../authorize-transaction-builder";
import {
  HostedPaymentPageClient,
  type GetHostedPaymentPageResponse,
} from "../client/hosted-payment-page-client";

import { TransactionDetailsClient } from "../client/transaction-details-client";
import {
  type TransactionInitializeSessionEventFragment,
  type PaymentGatewayInitializeSessionEventFragment,
} from "generated/graphql";

import { BaseError } from "@/errors";
import { invariant } from "@/lib/invariant";
import { createLogger } from "@/lib/logger";
import { type PaymentGateway } from "@/modules/webhooks/payment-gateway-initialize-session";
import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";

const ApiContracts = AuthorizeNet.APIContracts;

const AcceptHostedPaymentGatewayError = BaseError.subclass("AcceptHostedPaymentGatewayError");

const transactionInitializeSessionPayloadDataSchema = z.object({
  shouldCreateCustomerProfile: z.boolean().optional().default(false),
});

export const acceptHostedPaymentGatewayDataSchema = z.object({
  formToken: z.string().min(1),
  environment: authorizeEnvironmentSchema,
});

type AcceptHostedPaymentGatewayData = z.infer<typeof acceptHostedPaymentGatewayDataSchema>;

export const acceptHostedTransactionInitializeDataSchema = z.object({
  type: z.literal("acceptHosted"),
  data: z.object({
    authorizeTransactionId: z.string(),
  }),
});

export class AcceptHostedGateway implements PaymentGateway {
  private authorizeConfig: AuthorizeConfig;
  private customerProfileManager: CustomerProfileManager;

  private logger = createLogger({
    name: "TransactionInitializeSessionService",
  });

  constructor() {
    this.authorizeConfig = getAuthorizeConfig();
    this.customerProfileManager = new CustomerProfileManager();
  }

  private async buildTransactionFromPayload(
    payload: PaymentGatewayInitializeSessionEventFragment,
  ): Promise<AuthorizeNet.APIContracts.TransactionRequestType> {
    const transactionRequest = new ApiContracts.TransactionRequestType();

    transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHONLYTRANSACTION);
    transactionRequest.setAmount(payload.amount);

    const lineItems = authorizeTransaction.buildLineItemsFromOrderOrCheckout(payload.sourceObject);
    transactionRequest.setLineItems(lineItems);

    invariant(payload.sourceObject.billingAddress, "Billing address is missing from payload.");
    const billTo = authorizeTransaction.buildBillTo(payload.sourceObject.billingAddress);
    transactionRequest.setBillTo(billTo);

    invariant(payload.sourceObject.shippingAddress, "Shipping address is missing from payload.");
    const shipTo = authorizeTransaction.buildShipTo(payload.sourceObject.shippingAddress);
    transactionRequest.setShipTo(shipTo);

    const poNumber = authorizeTransaction.buildPoNumber(payload.sourceObject);
    transactionRequest.setPoNumber(poNumber);

    const userEmail = payload.sourceObject.userEmail;

    if (!userEmail) {
      this.logger.trace("No user email found in payload, skipping customerProfileId lookup.");

      return transactionRequest;
    }

    const dataParseResult = transactionInitializeSessionPayloadDataSchema.safeParse(payload.data);

    if (!dataParseResult.success) {
      throw new AcceptHostedPaymentGatewayError("`data` object has unexpected structure.", {
        cause: dataParseResult.error,
      });
    }

    const { shouldCreateCustomerProfile } = dataParseResult.data;

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

  private mapResponseToWebhookData(
    response: GetHostedPaymentPageResponse,
  ): AcceptHostedPaymentGatewayData {
    const dataParseResult = acceptHostedPaymentGatewayDataSchema.safeParse({
      formToken: response.token,
      environment: this.authorizeConfig.environment,
    });

    if (!dataParseResult.success) {
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
    payload: PaymentGatewayInitializeSessionEventFragment,
  ): Promise<AcceptHostedPaymentGatewayData> {
    this.logger.debug("Getting hosted payment page settings for transaction");

    const transactionInput = await this.buildTransactionFromPayload(payload);
    const settingsInput = this.getHostedPaymentPageSettings();

    const hostedPaymentPageClient = new HostedPaymentPageClient();

    const hostedPaymentPageResponse = await hostedPaymentPageClient.getHostedPaymentPageRequest({
      transactionInput,
      settingsInput,
    });

    this.logger.trace("Successfully called getHostedPaymentPageRequest");

    const data = this.mapResponseToWebhookData(hostedPaymentPageResponse);

    this.logger.trace("Successfully built Accept Hosted payment gateway data.");

    return data;
  }

  private getTransactionDetails(payload: TransactionInitializeSessionEventFragment) {
    const client = new TransactionDetailsClient();
    const { data } = acceptHostedTransactionInitializeDataSchema.parse(payload.data);

    const transactionId = data.authorizeTransactionId;
    const transactionDetails = client.getTransactionDetails({ transactionId });

    return transactionDetails;
  }

  async initializeTransaction(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<TransactionInitializeSessionResponse> {
    const transactionDetails = await this.getTransactionDetails(payload);

    return {
      amount: transactionDetails.transaction.authAmount,
      pspReference: transactionDetails.transaction.transId,
      result: "AUTHORIZATION_ACTION_REQUIRED",
      actions: ["CANCEL", "REFUND"],
      data: {},
    };
  }
}
