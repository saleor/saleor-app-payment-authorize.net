import type AuthorizeNet from "authorizenet";
import { z } from "zod";
import { getAuthorizeConfig, type AuthorizeConfig } from "../authorize-net-config";
import { authorizeTransaction } from "../authorize-transaction-builder";

import {
  CreateTransactionClient,
  type CreateTransactionResponse,
} from "../client/create-transaction";
import { gatewayUtils } from "./gateway-utils";
import {
  type PaymentGatewayInitializeSessionEventFragment,
  type TransactionInitializeSessionEventFragment,
} from "generated/graphql";

import { IncorrectWebhookResponseDataError } from "@/errors";
import { createLogger } from "@/lib/logger";
import { type PaymentGateway } from "@/modules/webhooks/payment-gateway-initialize-session";
import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";

export const acceptJsPaymentGatewayDataSchema = z.object({});

type AcceptJsPaymentGatewayData = z.infer<typeof acceptJsPaymentGatewayDataSchema>;

// what should request `data` object include
export const acceptJsTransactionInitializeRequestDataSchema = gatewayUtils.createGatewayDataSchema(
  "acceptJs",
  z.object({}),
);

// what should response `data` object include
const acceptJsTransactionInitializeResponseDataSchema = z.object({});

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

  private logger = createLogger({
    name: "AcceptJsGateway",
  });

  constructor() {
    this.authorizeConfig = getAuthorizeConfig();
  }

  private async buildTransactionFromPayload(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<AuthorizeNet.APIContracts.TransactionRequestType> {
    // Build initial transaction request
    const transactionRequest =
      authorizeTransaction.buildTransactionFromTransactionInitializePayload(payload);

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

    // END: Synchronize fields specific for Accept.js gateway

    return transactionRequest;
  }

  private mapResponseToTransactionInitializeData(
    _response: CreateTransactionResponse,
  ): AcceptJsTransactionInitializeResponseData {
    const dataParseResult = acceptJsTransactionInitializeResponseDataSchema.safeParse({});

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
  ): Promise<AcceptJsPaymentGatewayData> {
    return {};
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
}
