import AuthorizeNet from "authorizenet";
import { z } from "zod";
import { authorizeTransaction } from "../authorize-transaction-builder";
import {
  type PaymentGatewayInitializeSessionEventFragment,
  type TransactionInitializeSessionEventFragment,
} from "generated/graphql";
import { type ExternalPaymentGateway } from "@/modules/webhooks/payment-gateway-initialize-session";

const ApiContracts = AuthorizeNet.APIContracts;

// feel free to migrate it to JSON schema
export const applePayPaymentGatewaySchema = z.object({});

type ApplePayPaymentGatewayData = z.infer<typeof applePayPaymentGatewaySchema>;

export class ApplePayGateway implements ExternalPaymentGateway {
  async initialize(
    _payload: PaymentGatewayInitializeSessionEventFragment,
  ): Promise<ApplePayPaymentGatewayData> {
    // todo: put everything that client needs to initialize apple pay here
    return {};
  }

  async buildTransactionRequest(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<AuthorizeNet.APIContracts.TransactionRequestType> {
    // todo: put everything specific about Apple Pay transaction request here
    const transactionRequest = authorizeTransaction.buildTransactionRequestFromTransactionFragment(
      payload.transaction,
    );

    //https://developer.authorize.net/api/reference/index.html#mobile-in-app-transactions-create-an-apple-pay-transaction
    const opaqueData = new ApiContracts.OpaqueDataType();

    // todo: replace with actual data
    opaqueData.setDataDescriptor("");
    opaqueData.setDataValue("");

    const payment = new ApiContracts.PaymentType();
    payment.setOpaqueData(opaqueData);

    transactionRequest.setPayment(payment);

    return transactionRequest;
  }
}
