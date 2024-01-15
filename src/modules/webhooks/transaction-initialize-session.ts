import { env } from "process";
import AuthorizeNet from "authorizenet";
import { z } from "zod";
import {
  authorizeEnvironmentSchema,
  getAuthorizeConfig,
  type AuthorizeConfig,
} from "../authorize-net/authorize-net-config";
import {
  HostedPaymentPageClient,
  type GetHostedPaymentPageResponse,
} from "../authorize-net/client/hosted-payment-page-client";
import { CustomerProfileManager } from "../customer-profile/customer-profile-manager";
import { AuthorizeTransactionBuilder } from "../authorize-net/authorize-transaction-builder";
import { type TransactionInitializeSessionEventFragment } from "generated/graphql";

import { BaseError } from "@/errors";
import { createLogger } from "@/lib/logger";
import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";
import { invariant } from "@/lib/invariant";

const ApiContracts = AuthorizeNet.APIContracts;

export const TransactionInitializeError = BaseError.subclass("TransactionInitializeError");

const TransactionInitializeUnexpectedDataError = TransactionInitializeError.subclass(
  "TransactionInitializeUnexpectedDataError",
);

const transactionInitializeSessionPayloadDataSchema = z.object({
  shouldCreateCustomerProfile: z.boolean().optional().default(false),
});

/**
 * Authorize.net's payment form called Accept Hosted has to be initialized with `formToken`.
 * Read more: https://developer.authorize.net/api/reference/features/accept-hosted.html#Requesting_the_Form_Token
 */
const transactionInitializeSessionResponseDataSchema = z.object({
  formToken: z.string().min(1),
  environment: authorizeEnvironmentSchema,
});

type TransactionInitializeSessionResponseData = z.infer<
  typeof transactionInitializeSessionResponseDataSchema
>;

export class TransactionInitializeSessionService {
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
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<AuthorizeNet.APIContracts.TransactionRequestType> {
    const transactionBuilder = new AuthorizeTransactionBuilder();
    const transactionRequest = transactionBuilder.buildTransactionRequestFromTransactionFragment(
      payload.transaction,
    );

    transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHONLYTRANSACTION);
    transactionRequest.setAmount(payload.action.amount);

    const lineItems = transactionBuilder.buildLineItemsFromOrderOrCheckout(payload.sourceObject);
    transactionRequest.setLineItems(lineItems);

    invariant(payload.sourceObject.billingAddress, "Billing address is missing from payload.");
    const billTo = transactionBuilder.buildBillTo(payload.sourceObject.billingAddress);
    transactionRequest.setBillTo(billTo);

    invariant(payload.sourceObject.shippingAddress, "Shipping address is missing from payload.");
    const shipTo = transactionBuilder.buildShipTo(payload.sourceObject.shippingAddress);
    transactionRequest.setShipTo(shipTo);

    const poNumber = transactionBuilder.buildPoNumber(payload.sourceObject);
    transactionRequest.setPoNumber(poNumber);

    const userEmail = payload.sourceObject.userEmail;

    if (!userEmail) {
      this.logger.trace("No user email found in payload, skipping customerProfileId lookup.");

      return transactionRequest;
    }

    const dataParseResult = transactionInitializeSessionPayloadDataSchema.safeParse(payload.data);

    if (!dataParseResult.success) {
      throw new TransactionInitializeUnexpectedDataError(
        "`data` object has unexpected structure.",
        {
          cause: dataParseResult.error,
        },
      );
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
  ): TransactionInitializeSessionResponseData {
    const dataParseResult = transactionInitializeSessionResponseDataSchema.safeParse({
      formToken: response.token,
      environment: this.authorizeConfig.environment,
    });

    if (!dataParseResult.success) {
      throw new TransactionInitializeUnexpectedDataError(
        "`data` object has unexpected structure.",
        {
          cause: dataParseResult.error,
        },
      );
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

  async execute(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<TransactionInitializeSessionResponse> {
    this.logger.debug(
      { id: payload.transaction?.id },
      "Getting hosted payment page settings for transaction",
    );

    const transactionInput = await this.buildTransactionFromPayload(payload);
    const settingsInput = this.getHostedPaymentPageSettings();

    const hostedPaymentPageClient = new HostedPaymentPageClient();

    const hostedPaymentPageResponse = await hostedPaymentPageClient.getHostedPaymentPageRequest({
      transactionInput,
      settingsInput,
    });

    this.logger.trace("Successfully called getHostedPaymentPageRequest");

    const data = this.mapResponseToWebhookData(hostedPaymentPageResponse);

    this.logger.trace("Successfully built webhook response data");

    return {
      amount: payload.action.amount,
      result: "AUTHORIZATION_ACTION_REQUIRED",
      data,
    };
  }
}
