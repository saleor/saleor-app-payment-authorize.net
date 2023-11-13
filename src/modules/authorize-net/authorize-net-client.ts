import AuthorizeNet from "authorizenet";
import { z } from "zod";
import { type AuthorizeProviderConfig } from "./authorize-net-config";
import { AuthorizeNetError } from "./authorize-net-error";
import { createLogger } from "@/lib/logger";

const ApiContracts = AuthorizeNet.APIContracts;
const ApiControllers = AuthorizeNet.APIControllers;
const SDKConstants = AuthorizeNet.Constants;

const messagesSchema = z.object({
  resultCode: z.string(),
  message: z.array(
    z.object({
      code: z.string(),
      text: z.string(),
    }),
  ),
});

// AuthorizeNet types don't contain the response
const createTransactionResponseSchema = z.object({
  messages: messagesSchema,
  transactionResponse: z
    .object({
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
    })
    .optional(),
});

type CreateTransactionResponse = z.infer<typeof createTransactionResponseSchema>;

const getHostedPaymentPageResponseSchema = z.object({
  messages: messagesSchema,
  token: z.string(),
});

type GetHostedPaymentPageResponse = z.infer<typeof getHostedPaymentPageResponseSchema>;

type ResponseMessages = z.infer<typeof messagesSchema>;

// todo: test
function formatAuthorizeErrors(messages: ResponseMessages) {
  return messages.message
    .map(({ code, text }) => {
      return `${code}: ${text}`;
    })
    .join(", ");
}

export class AuthorizeNetClient {
  private merchantAuthenticationType: AuthorizeNet.APIContracts.MerchantAuthenticationType;
  private logger = createLogger({
    name: "AuthorizeNetClient",
  });

  config: AuthorizeProviderConfig.FullShape;

  constructor(config: AuthorizeProviderConfig.FullShape) {
    const merchantAuthenticationType = new ApiContracts.MerchantAuthenticationType();
    merchantAuthenticationType.setName(config.apiLoginId);
    merchantAuthenticationType.setTransactionKey(config.transactionKey);

    this.merchantAuthenticationType = merchantAuthenticationType;
    this.config = config;
  }

  private getEnvironment() {
    return SDKConstants.endpoint[this.config.environment];
  }

  /*
    https://developer.authorize.net/api/reference/features/credit_card_tutorial.html
    https://developer.authorize.net/hello_world.html
  */
  async createTransaction(
    transactionInput: AuthorizeNet.APIContracts.TransactionRequestType,
  ): Promise<CreateTransactionResponse> {
    const createRequest = new ApiContracts.CreateTransactionRequest();
    createRequest.setMerchantAuthentication(this.merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionInput);

    const transactionController = new ApiControllers.CreateTransactionController(
      createRequest.getJSON(),
    );

    transactionController.setEnvironment(this.getEnvironment());

    return new Promise((resolve, reject) => {
      try {
        transactionController.execute(() => {
          // eslint disabled because of insufficient types
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const apiResponse = transactionController.getResponse();
          const response = new ApiContracts.CreateTransactionResponse(apiResponse);
          const parsedResponse = createTransactionResponseSchema.parse(response);

          if (parsedResponse.messages.resultCode === "Error") {
            const message = formatAuthorizeErrors(parsedResponse.messages);

            throw new AuthorizeNetError(message);
          }

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

  async getHostedPaymentPageRequest(
    transactionInput: AuthorizeNet.APIContracts.TransactionRequestType,
  ): Promise<GetHostedPaymentPageResponse> {
    const createRequest = new ApiContracts.GetHostedPaymentPageRequest();
    createRequest.setMerchantAuthentication(this.merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionInput);

    // Authorize API needs at least one setting 🤷
    const setting1 = new ApiContracts.SettingType();
    setting1.setSettingName("hostedPaymentButtonOptions");
    setting1.setSettingValue('{"text": "Pay"}');

    const settingList = [];
    settingList.push(setting1);

    const alist = new ApiContracts.ArrayOfSetting();
    alist.setSetting(settingList);
    createRequest.setHostedPaymentSettings(alist);

    const transactionController = new ApiControllers.GetHostedPaymentPageController(
      createRequest.getJSON(),
    );

    transactionController.setEnvironment(this.getEnvironment());

    return new Promise((resolve, reject) => {
      try {
        transactionController.execute(() => {
          // eslint disabled because of insufficient types
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const apiResponse = transactionController.getResponse();
          const response = new ApiContracts.GetHostedPaymentPageResponse(apiResponse);

          this.logger.debug({ response }, "getHostedPaymentPageRequest");
          const parsedResponse = getHostedPaymentPageResponseSchema.parse(response);

          this.logger.debug({ parsedResponse });

          if (parsedResponse.messages.resultCode === "Error") {
            const message = formatAuthorizeErrors(parsedResponse.messages);

            throw new AuthorizeNetError(message);
          }

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
}
