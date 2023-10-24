import AuthorizeNet from "authorizenet";
import { type AuthorizeNetConfig } from "../authorize-net-config";
import { createTypeSafeTransaction } from "./create-transaction";
import { createLogger } from "@/lib/logger";

const ApiContracts = AuthorizeNet.APIContracts;
const ApiControllers = AuthorizeNet.APIControllers;
const ApiConstants = AuthorizeNet.Constants;

export class AuthorizeNetClient {
  private merchantAuthenticationType: AuthorizeNet.APIContracts.MerchantAuthenticationType;
  private logger = createLogger({
    name: "AuthorizeNetClient",
  });

  constructor(private config: AuthorizeNetConfig) {
    const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(config.apiLoginId);
    merchantAuthenticationType.setTransactionKey(config.transactionKey);

    this.merchantAuthenticationType = merchantAuthenticationType;
  }

  private getEnvironment() {
    return this.config.isSandBox ? ApiConstants.endpoint.sandbox : ApiConstants.endpoint.production;
  }

  chargeCreditCard({ amount }: { amount: number }) {
    const creditCard = new ApiContracts.CreditCardType();
    creditCard.setCardNumber("4111111111111111");
    creditCard.setExpirationDate("2024-12");

    const payment = new ApiContracts.PaymentType();
    payment.setCreditCard(creditCard);

    const transactionRequest = new ApiContracts.TransactionRequestType();
    transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    transactionRequest.setAmount(amount);
    transactionRequest.setPayment(payment);

    const createRequest = new ApiContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(this.merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequest);

    const transactionController = new ApiControllers.CreateTransactionController(
      createRequest.getJSON(),
    );

    transactionController.setEnvironment(this.getEnvironment());

    return createTypeSafeTransaction(transactionController);
  }
}
