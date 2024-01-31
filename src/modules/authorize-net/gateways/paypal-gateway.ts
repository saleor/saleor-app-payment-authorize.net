import AuthorizeNet from "authorizenet";
import { authorizeTransaction } from "../authorize-transaction-builder";
import { CreateTransactionClient } from "../client/create-transaction";
import { transactionId } from "../transaction-id-utils";
import {
  type PaypalPaymentGatewayResponseData,
  paypalTransactionProcessSchema,
} from "./paypal-schema";
import { BaseError } from "@/errors";
import { env } from "@/lib/env.mjs";
import { type PaymentGateway } from "@/modules/webhooks/payment-gateway-initialize-session";
import { type TransactionInitializeSessionResponse } from "@/schemas/TransactionInitializeSession/TransactionInitializeSessionResponse.mjs";
import { type TransactionProcessSessionResponse } from "@/schemas/TransactionProcessSession/TransactionProcessSessionResponse.mjs";
import {
  type TransactionFragment,
  type PaymentGatewayInitializeSessionEventFragment,
  type TransactionInitializeSessionEventFragment,
  type TransactionProcessSessionEventFragment,
} from "generated/graphql";

const PaypalGatewayError = BaseError.subclass("PaypalGatewayError");

const ApiContracts = AuthorizeNet.APIContracts;

export class PaypalGateway implements PaymentGateway {
  async initializePaymentGateway(
    _payload: PaymentGatewayInitializeSessionEventFragment,
  ): Promise<PaypalPaymentGatewayResponseData> {
    // todo: put everything that client needs to initialize paypal here
    return {
      type: "paypal",
    };
  }

  private buildPaypalType(transaction: TransactionFragment): AuthorizeNet.APIContracts.PayPalType {
    const id = transactionId.saleorTransactionIdConverter.fromSaleorTransaction(transaction);

    const payPalType = new ApiContracts.PayPalType();
    payPalType.setCancelUrl(`${env.AUTHORIZE_PAYMENT_FORM_URL}/failure`);
    payPalType.setSuccessUrl(`${env.AUTHORIZE_PAYMENT_FORM_URL}/${id}/paypal/continue`);

    return payPalType;
  }

  private buildInitializeTransactionRequest(
    payload: TransactionInitializeSessionEventFragment,
  ): AuthorizeNet.APIContracts.TransactionRequestType {
    const transactionRequest = authorizeTransaction.buildTransactionFromCommonFragments(payload);

    const paypalType = this.buildPaypalType(payload.transaction);
    const paymentType = new ApiContracts.PaymentType();
    paymentType.setPayPal(paypalType);

    transactionRequest.setPayment(paymentType);

    return transactionRequest;
  }

  async initializeTransaction(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<TransactionInitializeSessionResponse> {
    const transactionRequest = this.buildInitializeTransactionRequest(payload);

    const createTransactionClient = new CreateTransactionClient();
    const response = await createTransactionClient.createTransaction(transactionRequest);

    const secureAcceptanceUrl = response.transactionResponse.secureAcceptance?.SecureAcceptanceUrl;

    if (!secureAcceptanceUrl) {
      throw new PaypalGatewayError("SecureAcceptanceUrl not found in createTransaction response");
    }

    return {
      amount: payload.action.amount,
      pspReference: response.transactionResponse.transId,
      result: "AUTHORIZATION_ACTION_REQUIRED",
      data: {
        secureAcceptanceUrl,
      },
    };
  }

  buildProcessTransactionRequest(
    payload: TransactionProcessSessionEventFragment,
  ): AuthorizeNet.APIContracts.TransactionRequestType {
    const transactionRequest = authorizeTransaction.buildTransactionFromCommonFragments(payload);
    transactionRequest.setTransactionType(
      ApiContracts.TransactionTypeEnum.AUTHCAPTURECONTINUETRANSACTION,
    ); // override

    const paypalType = this.buildPaypalType(payload.transaction);

    const {
      data: { payerId },
    } = paypalTransactionProcessSchema.request.parse(payload.data);
    paypalType.setPayerID(payerId);

    const paymentType = new ApiContracts.PaymentType();
    paymentType.setPayPal(paypalType);

    transactionRequest.setPayment(paymentType);

    return transactionRequest;
  }

  async processTransaction(
    payload: TransactionProcessSessionEventFragment,
  ): Promise<TransactionProcessSessionResponse> {
    const transactionRequest = this.buildProcessTransactionRequest(payload);

    const createTransactionClient = new CreateTransactionClient();
    const response = await createTransactionClient.createTransaction(transactionRequest);

    return {
      amount: payload.action.amount,
      pspReference: response.transactionResponse.transId,
      result: "AUTHORIZATION_SUCCESS",
    };
  }
}
