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

  /*
    https://developer.authorize.net/api/reference/features/credit_card_tutorial.html
    https://developer.authorize.net/hello_world.html
  */
  async createTransaction(transactionInput: AuthorizeNet.APIContracts.TransactionRequestType) {
    const createRequest = new ApiContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(this.merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionInput);

    const transactionController = new ApiControllers.CreateTransactionController(
      createRequest.getJSON(),
    );

    transactionController.setEnvironment(this.getEnvironment());

    const response = await createTypeSafeTransaction(transactionController);
    this.logger.info({ response });

    return response;
  }
}
