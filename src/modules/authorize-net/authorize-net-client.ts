import AuthorizeNet from "authorizenet";
import { z } from "zod";
import { type AuthorizeProviderConfig } from "./authorize-net-config";
import { AuthorizeNetError } from "./authorize-net-error";
import { createLogger } from "@/lib/logger";
import { env } from "@/lib/env.mjs";

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
  token: z.string().min(1),
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

  private getHostedPaymentPageSettings(): AuthorizeNet.APIContracts.ArrayOfSetting {
    const settings = {
      hostedPaymentReturnOptions: {
        showReceipt: false, // must be false if we want to receive the transaction response in the payment form iframe
      },
      hostedPaymentIFrameCommunicatorUrl: {
        url: `${env.AUTHORIZE_PAYMENT_FORM_URL}/accept-hosted.html`, // url where the payment form iframe will be hosted,
      },
    };

    const settingsArray: AuthorizeNet.APIContracts.SettingType[] = [];

    Object.entries(settings).forEach(([settingName, settingValue]) => {
      const setting = new ApiContracts.SettingType();
      setting.setSettingName(settingName);
      setting.setSettingValue(JSON.stringify(settingValue));
      settingsArray.push(setting);
    });

    const arrayOfSettings = new ApiContracts.ArrayOfSetting();
    arrayOfSettings.setSetting(settingsArray);

    return arrayOfSettings;
  }

  async getHostedPaymentPageRequest(
    transactionInput: AuthorizeNet.APIContracts.TransactionRequestType,
  ): Promise<GetHostedPaymentPageResponse> {
    const createRequest = new ApiContracts.GetHostedPaymentPageRequest();
    createRequest.setMerchantAuthentication(this.merchantAuthenticationType);
    createRequest.setTransactionRequest(transactionInput);

    const settings = this.getHostedPaymentPageSettings();

    createRequest.setHostedPaymentSettings(settings);

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
          const parsedResponse = getHostedPaymentPageResponseSchema.parse(response);

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
