import AuthorizeNet from "authorizenet";
import { createLogger } from "@/lib/logger";
import { env } from "@/lib/env.mjs";

const ApiContracts = AuthorizeNet.APIContracts;
const ApiControllers = AuthorizeNet.APIControllers;
const ApiConstants = AuthorizeNet.Constants;

export class AuthorizeNetClient {
  private merchantAuthenticationType: AuthorizeNet.APIContracts.MerchantAuthenticationType;
  private logger = createLogger({
    name: "AuthorizeNetClient",
  });

  constructor() {
    const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(env.API_LOGIN_ID);
    merchantAuthenticationType.setTransactionKey(env.TRANSACTION_KEY);

    this.merchantAuthenticationType = merchantAuthenticationType;
  }

  ping() {
    const creditCard = new ApiContracts.CreditCardType();
    creditCard.setCardNumber("4111111111111111");
    creditCard.setExpirationDate("2024-12");

    const payment = new ApiContracts.PaymentType();
    payment.setCreditCard(creditCard);

    const transactionRequest = new ApiContracts.TransactionRequestType();
    transactionRequest.setTransactionType(ApiContracts.TransactionTypeEnum.AUTHCAPTURETRANSACTION);
    transactionRequest.setAmount(100);
    transactionRequest.setPayment(payment);

    const createRequest = new ApiContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(this.merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionRequest);

    const transactionController = new ApiControllers.CreateTransactionController(
      createRequest.getJSON(),
    );

    transactionController.setEnvironment(ApiConstants.endpoint.sandbox);
    transactionController.execute(() => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const apiResponse = transactionController.getResponse();
      const response = new ApiContracts.CreateTransactionResponse(apiResponse);
      this.logger.debug({ response });
    });
  }
}
