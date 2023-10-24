import AuthorizeNet from "authorizenet";
import { z } from "zod";
import { createLogger } from "@/lib/logger";

const ApiContracts = AuthorizeNet.APIContracts;

// AuthorizeNet types don't contain the response
const createTransactionResponseSchema = z.object({
  messages: z.object({
    resultCode: z.string(),
    message: z.array(
      z.object({
        code: z.string(),
        text: z.string(),
      }),
    ),
  }),
  transactionResponse: z.object({
    responseCode: z.string(),
    authCode: z.string(),
    avsResultCode: z.string(),
    cvvResultCode: z.string(),
    cavvResultCode: z.string(),
    transId: z.string(),
    refTransID: z.string(),
    transHash: z.string(),
    testRequest: z.string(),
    accountNumber: z.string(),
    accountType: z.string(),
    errors: z
      .object({
        error: z.array(
          z.object({
            errorCode: z.string(),
            errorText: z.string(),
          }),
        ),
      })
      .optional(),
    messages: z
      .object({
        message: z.array(
          z.object({
            code: z.string(),
            description: z.string(),
          }),
        ),
      })
      .optional(),
    transHashSha2: z.string(),
    networkTransId: z.string().optional(),
  }),
});

const _logger = createLogger({
  name: "createTypeSafeTransaction",
});

type CreateTransactionResponse = z.infer<typeof createTransactionResponseSchema>;

export function createTypeSafeTransaction(
  transactionController: AuthorizeNet.APIControllers.CreateTransactionController,
): Promise<CreateTransactionResponse> {
  return new Promise((resolve, reject) => {
    try {
      transactionController.execute(() => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const apiResponse = transactionController.getResponse();
        const response = new ApiContracts.CreateTransactionResponse(apiResponse);
        const parsedResponse = createTransactionResponseSchema.parse(response);
        resolve(parsedResponse);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        reject(error.format());
      }
      reject(error);
    }
  });
}
