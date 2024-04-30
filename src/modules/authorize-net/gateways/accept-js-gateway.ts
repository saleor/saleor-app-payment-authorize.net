import { z } from "zod";
import { APIContracts } from "authorizenet";
import {
  getAuthorizeConfig,
  type AuthorizeConfig,
  authorizeEnvironmentSchema,
} from "../authorize-net-config";
import { authorizeTransaction } from "../authorize-transaction-builder";
import { CustomerProfileManager } from "../../customer-profile/customer-profile-manager";

import {
  CreateTransactionClient,
  type CreateTransactionResponse,
} from "../client/create-transaction";
import { gatewayUtils } from "./gateway-utils";
import {
  type ListStoredPaymentMethodsEventFragment,
  type PaymentGatewayInitializeSessionEventFragment,
  type TransactionInitializeSessionEventFragment,
} from "generated/graphql";

import { IncorrectWebhookResponseDataError } from "@/errors";
import { createLogger } from "@/lib/logger";
import {
  type AppPaymentMethod,
  type PaymentGateway,
} from "@/modules/authorize-net/gateways/payment-gateway";
import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";
import { invariant } from "@/lib/invariant";

export const acceptJsPaymentGatewayResponseDataSchema = z.object({});

type AcceptJsPaymentGatewayResponseData = z.infer<typeof acceptJsPaymentGatewayResponseDataSchema>;

export const acceptJsPaymentGatewayRequestDataSchema = gatewayUtils.createGatewayDataSchema(
  "acceptJs",
  z.object({}),
);

/**
 * @example { data: { type: "acceptJs", data: { <z.object({}) goes here> } } }
 */
export const acceptJsTransactionInitializeRequestDataSchema = gatewayUtils.createGatewayDataSchema(
  "acceptJs",
  z.object({
    opaqueData: z.object({
      dataDescriptor: z.string().optional().default(""),
      dataValue: z.string().optional().default(""),
    }),
    shouldCreateCustomerProfile: z.boolean().optional().default(false),
    shouldCreateCustomerPaymentProfile: z.boolean().optional().default(false),
  }),
);

// what should response `data` object include
const acceptJsTransactionInitializeResponseDataSchema = z.object({
  response: z.object({
    messages: z.object({
      resultCode: z.string().optional().default(""),
    }),
    transactionResponse: z.object({
      transId: z.string().optional().default(""),
    }),
  }),
  environment: authorizeEnvironmentSchema,
});

type AcceptJsTransactionInitializeResponseData = z.infer<
  typeof acceptJsTransactionInitializeResponseDataSchema
>;

const AcceptJsPaymentGatewayResponseDataError = IncorrectWebhookResponseDataError.subclass(
  "AcceptJsPaymentGatewayResponseDataError",
);

const AcceptJsTransactionInitializePayloadDataError = IncorrectWebhookResponseDataError.subclass(
  "AcceptJsTransactionInitializePayloadDataError",
);

export class AcceptJsGateway implements PaymentGateway {
  private authorizeConfig: AuthorizeConfig;
  private customerProfileManager: CustomerProfileManager;

  private logger = createLogger({
    name: "AcceptJsGateway",
  });

  constructor() {
    this.authorizeConfig = getAuthorizeConfig();
    this.customerProfileManager = new CustomerProfileManager();
  }

  private async buildTransactionFromPayload(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<APIContracts.TransactionRequestType> {
    const user = payload.sourceObject.user;

    // Parse the payload `data` object
    const parseResult = acceptJsTransactionInitializeRequestDataSchema.safeParse(payload.data);

    if (!parseResult.success) {
      throw new AcceptJsTransactionInitializePayloadDataError(
        "`data` object in the TransactionInitializeSession payload has an unexpected structure.",
        {
          errors: parseResult.error.errors,
        },
      );
    }

    // START: Synchronize fields specific for Accept.js gateway

    const payment = new APIContracts.PaymentType();

    const profileToCharge = new APIContracts.CustomerProfilePaymentType();

    const paymentProfile = new APIContracts.PaymentProfile();

    const opaqueDataType = new APIContracts.OpaqueDataType();
    const {
      data: { opaqueData, shouldCreateCustomerProfile, shouldCreateCustomerPaymentProfile },
    } = parseResult.data;

    if (opaqueData?.dataDescriptor && opaqueData?.dataValue) {
      opaqueDataType.setDataDescriptor(opaqueData.dataDescriptor);
      opaqueDataType.setDataValue(opaqueData.dataValue);
    }

    if (!shouldCreateCustomerProfile) {
      this.logger.trace("Skipping customerProfileId lookup.");
    }

    let customerProfileId = null;
    let customerPaymentProfileId = null;
    if (user && shouldCreateCustomerProfile) {
      this.logger.trace("Looking up customerProfileId.");
      customerProfileId = await this.customerProfileManager.getUserCustomerProfileId({
        user,
      });
      if (shouldCreateCustomerPaymentProfile && customerProfileId) {
        invariant(payload.sourceObject.billingAddress, "Billing address is missing from payload.");
        const billTo = authorizeTransaction.buildBillTo(payload.sourceObject.billingAddress);

        customerPaymentProfileId = await this.customerProfileManager.createCustomerPaymentProfile({
          customerProfileId,
          opaqueData: opaqueDataType,
          billTo,
        });
        this.logger.trace("Customer payment profile created.");
      }
    }
    const isCustomerProfileCreated =
      customerPaymentProfileId?.length && customerProfileId?.length ? true : false;

    // Build initial transaction request
    const transactionRequest =
      authorizeTransaction.buildTransactionFromTransactionInitializePayload(
        payload,
        isCustomerProfileCreated,
      );

    if (customerProfileId) {
      this.logger.trace("Found customerProfileId, adding to transaction request.");
      transactionRequest.setCustomer({ id: customerProfileId });
    }

    if (!customerPaymentProfileId) {
      payment.setOpaqueData(opaqueDataType);
      transactionRequest.setPayment(payment);
    }

    // here we are charge a customer payment profile
    if (customerPaymentProfileId && customerProfileId) {
      profileToCharge.setCustomerProfileId(customerProfileId);
      paymentProfile.setPaymentProfileId(customerPaymentProfileId);
      profileToCharge.setPaymentProfile(paymentProfile);
      transactionRequest.setProfile(profileToCharge);
    }

    // END: Synchronize fields specific for Accept.js gateway

    return transactionRequest;
  }

  private mapResponseToTransactionInitializeData(
    response: CreateTransactionResponse,
  ): AcceptJsTransactionInitializeResponseData {
    const dataParseResult = acceptJsTransactionInitializeResponseDataSchema.safeParse({
      response,
      environment: this.authorizeConfig.environment,
    });

    if (!dataParseResult.success) {
      this.logger.error({ error: dataParseResult.error.format() });
      throw new AcceptJsPaymentGatewayResponseDataError("`data` object has unexpected structure.", {
        cause: dataParseResult.error,
      });
    }

    return dataParseResult.data;
  }

  // If you need to return some data before creating the transaction with Accept.js, you can do it here
  async initializePaymentGateway(
    _payload: PaymentGatewayInitializeSessionEventFragment,
  ): Promise<AcceptJsPaymentGatewayResponseData> {
    return { type: "acceptJs" };
  }

  async initializeTransaction(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<TransactionInitializeSessionResponse> {
    const transactionInput = await this.buildTransactionFromPayload(payload);
    const createTransactionClient = new CreateTransactionClient();

    const createTransactionResponse =
      await createTransactionClient.createTransaction(transactionInput);

    this.logger.trace("Successfully called createTransaction");

    const data = this.mapResponseToTransactionInitializeData(createTransactionResponse);

    return {
      amount: payload.action.amount,
      result: "AUTHORIZATION_ACTION_REQUIRED",
      data,
    };
  }

  async listStoredPaymentMethods(
    payload: ListStoredPaymentMethodsEventFragment,
  ): Promise<AppPaymentMethod> {
    //TODO: need to use the user info on next line
    console.log("payload Data", payload);
    // const user = payload.issuingPrincipal;
    // const response = await this.customerProfileManager.getUserCustomerPaymentProfile({ user });

    return {
      id: "",
      type: "acceptJs",
      data: {
        // Add fields specific to Accept.js gateway
      },
      supportedPaymentFlows: [],
    };
  }
}
