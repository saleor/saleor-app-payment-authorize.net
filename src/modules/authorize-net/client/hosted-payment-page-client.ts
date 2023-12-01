import { env } from "process";
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
  private getHostedPaymentPageSettings(): AuthorizeNet.APIContracts.ArrayOfSetting {
    const settings = {
      hostedPaymentReturnOptions: {
        showReceipt: false, // must be false if we want to receive the transaction response in the payment form iframe
      },
      hostedPaymentIFrameCommunicatorUrl: {
        url: `${env.AUTHORIZE_PAYMENT_FORM_URL}/accept-hosted.html`, // url where the payment form iframe will be hosted,
      },
      hostedPaymentCustomerOptions: {
        showEmail: false,
        requiredEmail: false,
        addPaymentProfile: true,
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
      transactionController.execute(() => {
        try {
          this.logger.debug(
            { settings },
            "Calling getHostedPaymentPageRequest with the following settings:",
          );

          // eslint disabled because of insufficient types
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const apiResponse = transactionController.getResponse();
          const response = new ApiContracts.GetHostedPaymentPageResponse(apiResponse);

          this.logger.debug({ response }, "getHostedPaymentPageRequest response");
          const parsedResponse = getHostedPaymentPageResponseSchema.parse(response);

          this.resolveResponseErrors(parsedResponse);

          this.logger.debug("getHostedPaymentPageRequest response parsed successfully");

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
