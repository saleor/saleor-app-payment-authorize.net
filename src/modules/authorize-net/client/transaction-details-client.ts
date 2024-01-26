import AuthorizeNet from "authorizenet";

import { z } from "zod";
import { AuthorizeNetClient, baseAuthorizeObjectSchema } from "./authorize-net-client";

const ApiContracts = AuthorizeNet.APIContracts;
const ApiControllers = AuthorizeNet.APIControllers;

const getTransactionDetailsSchema = baseAuthorizeObjectSchema.and(
  z.object({
    transaction: z.object({
      transId: z.string().min(1),
      authAmount: z.number(),
      responseReasonDescription: z.string().min(1),
      submitTimeLocal: z.string().min(1),
      order: z
        .object({
          description: z.string().min(1),
        })
        .optional(),
    }),
  }),
);

export type GetTransactionDetailsResponse = z.infer<typeof getTransactionDetailsSchema>;

export class TransactionDetailsClient extends AuthorizeNetClient {
  async getTransactionDetails({
    transactionId,
  }: {
    transactionId: string;
  }): Promise<GetTransactionDetailsResponse> {
    const createRequest = new ApiContracts.GetTransactionDetailsRequest();
    createRequest.setMerchantAuthentication(this.merchantAuthenticationType);
    createRequest.setTransId(transactionId);

    const transactionController = new ApiControllers.GetTransactionDetailsController(
      createRequest.getJSON(),
    );

    transactionController.setEnvironment(this.getEnvironment());

    return new Promise((resolve, reject) => {
      transactionController.execute(() => {
        try {
          // eslint disabled because of insufficient types
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const apiResponse = transactionController.getResponse();
          const response = new ApiContracts.GetTransactionDetailsResponse(apiResponse);
          this.logger.trace({ response }, "getTransactionDetails response");
          const parsedResponse = getTransactionDetailsSchema.parse(response);

          this.resolveAndThrowResponseErrors(parsedResponse);

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
