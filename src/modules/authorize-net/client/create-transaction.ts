import AuthorizeNet from "authorizenet";

import { z } from "zod";
import { AuthorizeNetClient, baseAuthorizeObjectSchema } from "./authorize-net-client";

const ApiContracts = AuthorizeNet.APIContracts;
const ApiControllers = AuthorizeNet.APIControllers;

const createTransactionSchema = baseAuthorizeObjectSchema.and(z.unknown());

export class CreateTransactionClient extends AuthorizeNetClient {
  async createTransaction(transactionInput: AuthorizeNet.APIContracts.TransactionRequestType) {
    const createRequest = new ApiContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(this.merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionInput);

    const transactionController = new ApiControllers.CreateTransactionController(
      createRequest.getJSON(),
    );

    transactionController.setEnvironment(this.getEnvironment());

    return new Promise((resolve, reject) => {
      transactionController.execute(() => {
        try {
          // eslint disabled because of insufficient types
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const apiResponse = transactionController.getResponse();
          const response = new ApiContracts.CreateTransactionResponse(apiResponse);
          const parsedResponse = createTransactionSchema.parse(response);

          this.resolveResponseErrors(parsedResponse);

          resolve(parsedResponse);
        } catch (error) {
          if (error instanceof z.ZodError) {
            reject(error.format());
          }
          reject(error);
        }
      });
    });
  }
}
