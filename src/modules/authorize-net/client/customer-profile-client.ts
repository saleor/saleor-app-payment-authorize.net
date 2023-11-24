import AuthorizeNet from "authorizenet";
import { z } from "zod";
import { AuthorizeNetClient, baseAuthorizeObjectSchema } from "./authorize-net-client";

const ApiContracts = AuthorizeNet.APIContracts;
const ApiControllers = AuthorizeNet.APIControllers;

const createCustomerProfileSchema = baseAuthorizeObjectSchema.and(
  z.object({
    customerProfileId: z.string().min(1),
  }),
);

type CreateCustomerProfileResponse = z.infer<typeof createCustomerProfileSchema>;

const getCustomerProfileSchema = baseAuthorizeObjectSchema.and(z.object({}));

type GetCustomerProfileResponse = z.infer<typeof getCustomerProfileSchema>;

export class CustomerProfileClient extends AuthorizeNetClient {
  // todo: is it okay that I am saving something for somebody's email?
  createCustomerProfile({
    userEmail,
  }: {
    userEmail: string;
  }): Promise<CreateCustomerProfileResponse> {
    const createRequest = new ApiContracts.CreateCustomerProfileRequest();
    createRequest.setMerchantAuthentication(this.merchantAuthenticationType);
    createRequest.setProfile(new ApiContracts.CustomerProfileType());

    const customerProfileType = new ApiContracts.CustomerProfileType();
    customerProfileType.setEmail(userEmail);

    createRequest.setProfile(customerProfileType);

    const customerProfileController = new ApiControllers.CreateCustomerProfileController(
      createRequest.getJSON(),
    );

    customerProfileController.setEnvironment(this.getEnvironment());

    return new Promise((resolve, reject) => {
      customerProfileController.execute(() => {
        try {
          // eslint disabled because of insufficient types
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const apiResponse = customerProfileController.getResponse();
          const response = new ApiContracts.CreateCustomerProfileResponse(apiResponse);
          this.logger.trace({ response }, "createCustomerProfile response");
          const parsedResponse = createCustomerProfileSchema.parse(response);

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

  getCustomerProfile({
    customerProfileId,
  }: {
    customerProfileId: string;
  }): Promise<GetCustomerProfileResponse> {
    const createRequest = new ApiContracts.GetCustomerProfileRequest();
    createRequest.setMerchantAuthentication(this.merchantAuthenticationType);
    createRequest.setCustomerProfileId(customerProfileId);

    const customerProfileController = new ApiControllers.GetCustomerProfileController(
      createRequest.getJSON(),
    );

    customerProfileController.setEnvironment(this.getEnvironment());

    return new Promise((resolve, reject) => {
      customerProfileController.execute(() => {
        try {
          // eslint disabled because of insufficient types
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const apiResponse = customerProfileController.getResponse();
          const response = new ApiContracts.GetCustomerProfileResponse(apiResponse);
          const parsedResponse = getCustomerProfileSchema.parse(response);

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
