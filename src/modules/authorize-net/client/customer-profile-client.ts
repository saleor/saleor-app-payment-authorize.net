import AuthorizeNet from "authorizenet";
import { z } from "zod";
import { AuthorizeNetResponseValidationError } from "../authorize-net-error";
import { AuthorizeNetClient, baseAuthorizeObjectSchema } from "./authorize-net-client";
import { type CustomerProfileReq, type CreateCustomerProfileReqType } from "@/lib/utils";

const ApiContracts = AuthorizeNet.APIContracts;
const ApiControllers = AuthorizeNet.APIControllers;

const createCustomerProfileSchema = baseAuthorizeObjectSchema.and(
  z.object({
    customerProfileId: z.string().min(1),
  }),
);

type CreateCustomerProfileResponse = z.infer<typeof createCustomerProfileSchema>;

const paymentProfileSchema = z.object({
  customerPaymentProfileId: z.string(),
  payment: z.object({
    creditCard: z.object({
      cardNumber: z.string(),
      expirationDate: z.string(),
      cardType: z.string(),
      issuerNumber: z.string().optional(),
    }),
  }),
});

const getCustomerProfileSchema = baseAuthorizeObjectSchema.and(
  z.object({
    profile: z.object({
      customerProfileId: z.string().min(1),
      paymentProfiles: z.array(paymentProfileSchema).optional(),
      profileType: z.string().optional(),
    }),
  }),
);

const getCustomerPaymentProfileSchema = baseAuthorizeObjectSchema.and(
  z.object({
    customerProfileId: z.string().default(""),
    customerPaymentProfileId: z.string().default(""),
  }),
);

const AuthorizeCreateCustomerProfileResponseError = AuthorizeNetResponseValidationError.subclass(
  "AuthorizeCreateCustomerProfileResponseError",
);

const AuthorizeGetCustomerProfileResponseError = AuthorizeNetResponseValidationError.subclass(
  "AuthorizeGetCustomerProfileResponseError",
);

export type GetCustomerProfileResponse = z.infer<typeof getCustomerProfileSchema>;
type GetCustomerPaymentProfileResponse = z.infer<typeof getCustomerPaymentProfileSchema>;

export class CustomerProfileClient extends AuthorizeNetClient {
  createCustomerProfile({
    user,
    guestEmail,
  }: CustomerProfileReq): Promise<CreateCustomerProfileResponse> {
    const createRequest = new ApiContracts.CreateCustomerProfileRequest();
    createRequest.setMerchantAuthentication(this.merchantAuthenticationType);
    createRequest.setProfile(new ApiContracts.CustomerProfileType());

    const customerProfileType = new ApiContracts.CustomerProfileType();

    // Set `MerchantCustomerId` on regular customerProfile when user is logged and set email in case of guest user
    if (!user) {
      customerProfileType.setEmail(guestEmail);
      customerProfileType.setDescription("Guest user profile");
      customerProfileType.setProfileType("guest");
    }
    if (user) {
      customerProfileType.setMerchantCustomerId(user.id);
      customerProfileType.setEmail(user.email);
      customerProfileType.setProfileType("regular");
      customerProfileType.setDescription("Regular user profile");
    }

    createRequest.setProfile(customerProfileType);

    const customerProfileController = new ApiControllers.CreateCustomerProfileController(
      createRequest.getJSON(),
    );

    customerProfileController.setEnvironment(this.getEnvironment());

    return new Promise((resolve, reject) => {
      customerProfileController.execute(() => {
        try {
          const apiResponse: unknown = customerProfileController.getResponse();
          const response = new ApiContracts.CreateCustomerProfileResponse(apiResponse);
          this.logger.trace({ response }, "createCustomerProfile response");
          const parseResult = createCustomerProfileSchema.safeParse(response);

          if (!parseResult.success) {
            throw new AuthorizeCreateCustomerProfileResponseError(
              "The response from Authorize.net CreateCustomerProfileResponse did not match the expected schema",
              {
                errors: parseResult.error.errors,
              },
            );
          }

          const parsedResponse = parseResult.data;
          this.resolveResponseErrors(parsedResponse);

          resolve(parsedResponse);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return reject(error.format());
          }
          return reject(error);
        }
      });
    });
  }

  getCustomerProfileByUser({
    user,
    guestEmail,
  }: CustomerProfileReq): Promise<GetCustomerProfileResponse> {
    const createRequest = new ApiContracts.GetCustomerProfileRequest();
    createRequest.setMerchantAuthentication(this.merchantAuthenticationType);

    createRequest.setEmail(user ? user.email : guestEmail);

    // @todo we should get customer profile by `MerchantCustomerId` but unfortunately Saleor user IDs are longer than 20 characters
    // and Authorize.net won't allow it

    const customerProfileController = new ApiControllers.GetCustomerProfileController(
      createRequest.getJSON(),
    );

    customerProfileController.setEnvironment(this.getEnvironment());

    return new Promise((resolve, reject) => {
      customerProfileController.execute(() => {
        try {
          const apiResponse: unknown = customerProfileController.getResponse();
          const response = new ApiContracts.GetCustomerProfileResponse(apiResponse);
          const parseResult = getCustomerProfileSchema.safeParse(response);

          if (!parseResult.success) {
            throw new AuthorizeGetCustomerProfileResponseError(
              "The response from Authorize.net GetCustomerProfileResponse did not match the expected schema",
              {
                errors: parseResult.error.errors,
              },
            );
          }

          const parsedResponse = parseResult.data;
          this.resolveResponseErrors(parsedResponse);

          resolve(parsedResponse);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return reject(error.format());
          }
          return reject(error);
        }
      });
    });
  }

  createCustomerPaymentProfile({
    customerProfileId,
    opaqueData,
    billTo,
  }: CreateCustomerProfileReqType): Promise<GetCustomerPaymentProfileResponse> {
    const createRequest = new ApiContracts.CreateCustomerPaymentProfileRequest();
    const profile = new ApiContracts.CustomerPaymentProfileType();
    profile.setPayment({ opaqueData });
    profile.setBillTo(billTo);
    createRequest.setMerchantAuthentication(this.merchantAuthenticationType);
    createRequest.setCustomerProfileId(customerProfileId);
    createRequest.setPaymentProfile(profile);

    const customerPaymentProfileController =
      new ApiControllers.CreateCustomerPaymentProfileController(createRequest.getJSON());

    return new Promise((resolve, reject) => {
      customerPaymentProfileController.execute(() => {
        try {
          const apiResponse: unknown = customerPaymentProfileController.getResponse();
          const response = new ApiContracts.CreateCustomerPaymentProfileResponse(apiResponse);
          const parseResult = getCustomerPaymentProfileSchema.safeParse(response);

          if (!parseResult.success) {
            throw new AuthorizeGetCustomerProfileResponseError(
              "The response from Authorize.net GetCustomerPaymentProfileResponse did not match the expected schema",
              {
                errors: parseResult.error.errors,
              },
            );
          }
          resolve(parseResult.data);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return reject(error.format());
          }
          return reject(error);
        }
      });
    });
  }

  updateCustomerProfile(
    { profileType, user }: CustomerProfileReq,
    customerProfileId: string,
    description: string,
  ): Promise<CreateCustomerProfileResponse> {
    const updateCustomerRequest = new ApiContracts.UpdateCustomerProfileRequest();
    updateCustomerRequest.setMerchantAuthentication(this.merchantAuthenticationType);

    // Note : always use below format to update the customer details to safe from invalid error from authorize.
    updateCustomerRequest.setProfile({
      merchantCustomerId: user?.id,
      description,
      email: user?.email,
      customerProfileId,
      profileType: profileType,
    });

    const customerProfileController = new ApiControllers.UpdateCustomerProfileController(
      updateCustomerRequest.getJSON(),
    );

    customerProfileController.setEnvironment(this.getEnvironment());

    return new Promise((resolve, reject) => {
      customerProfileController.execute(() => {
        try {
          const apiResponse: unknown = customerProfileController.getResponse();
          const response = new ApiContracts.CreateCustomerProfileResponse(apiResponse);
          this.logger.trace({ response }, "update customer response");

          const parseResult = createCustomerProfileSchema.safeParse({
            ...response,
            customerProfileId,
          });

          if (!parseResult.success) {
            throw new AuthorizeCreateCustomerProfileResponseError(
              "The response from Authorize.net UpdateCustomerProfileResponse did not match the expected schema",
              {
                errors: parseResult.error.errors,
              },
            );
          }

          const parsedResponse = parseResult.data;
          this.resolveResponseErrors(parsedResponse);

          resolve(parsedResponse);
        } catch (error) {
          if (error instanceof z.ZodError) {
            return reject(error.format());
          }
          return reject(error);
        }
      });
    });
  }
}
