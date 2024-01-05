import AuthorizeNet from "authorizenet";

import { z } from "zod";
import { AuthorizeNetClient, baseAuthorizeObjectSchema } from "./authorize-net-client";

const ApiContracts = AuthorizeNet.APIContracts;
const ApiControllers = AuthorizeNet.APIControllers;

const getHostedPaymentPageResponseSchema = baseAuthorizeObjectSchema.and(
  z.object({
    token: z.string().min(1),
  }),
);

export type GetHostedPaymentPageResponse = z.infer<typeof getHostedPaymentPageResponseSchema>;

export class HostedPaymentPageClient extends AuthorizeNetClient {
  async getHostedPaymentPageRequest({
    transactionInput,
    settingsInput,
  }: {
    transactionInput: AuthorizeNet.APIContracts.TransactionRequestType;
    settingsInput: AuthorizeNet.APIContracts.ArrayOfSetting;
  }): Promise<GetHostedPaymentPageResponse> {
    const createRequest = new ApiContracts.GetHostedPaymentPageRequest();
    createRequest.setMerchantAuthentication(this.merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionInput);
    createRequest.setHostedPaymentSettings(settingsInput);

    const transactionController = new ApiControllers.GetHostedPaymentPageController(
      createRequest.getJSON(),
    );

    transactionController.setEnvironment(this.getEnvironment());

    return new Promise((resolve, reject) => {
      transactionController.execute(() => {
        try {
          this.logger.debug(
            { settings: settingsInput },
            "Calling getHostedPaymentPageRequest with the following settings:",
          );

          // eslint disabled because of insufficient types
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const apiResponse = transactionController.getResponse();
          const response = new ApiContracts.GetHostedPaymentPageResponse(apiResponse);

          this.logger.trace({ response }, "getHostedPaymentPageRequest response");
          const parsedResponse = getHostedPaymentPageResponseSchema.parse(response);

          this.resolveResponseErrors(parsedResponse);

          this.logger.debug("Returning response from getHostedPaymentPageRequest");

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
