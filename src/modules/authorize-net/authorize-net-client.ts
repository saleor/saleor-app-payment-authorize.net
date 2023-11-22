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
  resultCode: z.enum(["Ok", "Error"]),
  message: z.array(
    z.object({
      code: z.string(),
      text: z.string(),
    }),
  ),
});

type ResponseMessages = z.infer<typeof messagesSchema>;

const baseAuthorizeObjectSchema = z.object({
  messages: messagesSchema,
});

type BaseAuthorizeObjectResponse = z.infer<typeof baseAuthorizeObjectSchema>;

const getHostedPaymentPageResponseSchema = baseAuthorizeObjectSchema.and(
  z.object({
    token: z.string().min(1),
  }),
);

export type GetHostedPaymentPageResponse = z.infer<typeof getHostedPaymentPageResponseSchema>;

const getTransactionDetailsSchema = baseAuthorizeObjectSchema.and(
  z.object({
    batch: z.object({
      settlementState: z.enum(["settledSuccessfully", "settlementError", "pendingSettlement"]),
    }),
  }),
);

type GetTransactionDetailsResponse = z.infer<typeof getTransactionDetailsSchema>;

export type AuthorizeSettlementState = GetTransactionDetailsResponse["batch"]["settlementState"];

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

  private resolveResponseErrors(response: BaseAuthorizeObjectResponse) {
    if (response.messages.resultCode === "Error") {
      const message = formatAuthorizeErrors(response.messages);

      throw new AuthorizeNetError(message);
    }
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

          this.resolveResponseErrors(parsedResponse);

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

  async getTransactionDetailsRequest({
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
      try {
        transactionController.execute(() => {
          // eslint disabled because of insufficient types
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const apiResponse = transactionController.getResponse();
          const response = new ApiContracts.GetTransactionDetailsResponse(apiResponse);
          const parsedResponse = getTransactionDetailsSchema.parse(response);

          this.resolveResponseErrors(parsedResponse);

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
