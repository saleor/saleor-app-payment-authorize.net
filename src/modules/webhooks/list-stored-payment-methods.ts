import { AcceptJsGateway } from "../authorize-net/gateways/accept-js-gateway";
import { type ListStoredPaymentMethodsEventFragment } from "generated/graphql";

import { createLogger } from "@/lib/logger";
import { type ListStoredPaymentMethodsResponse } from "@/schemas/ListStoredPaymentMethods/ListStoredPaymentMethodsResponse.mjs";

export class ListStoredPaymentMethodsService {
  private logger = createLogger({
    name: "ListStoredPaymentMethodsService",
  });

  async execute(
    _payload: ListStoredPaymentMethodsEventFragment,
  ): Promise<ListStoredPaymentMethodsResponse> {
    const acceptJs = new AcceptJsGateway();

    console.log(_payload, "under ListStoredPaymentMethodsEventFragment ");
    const paymentMethods = await Promise.all([acceptJs.listStoredPaymentMethods(_payload)]);
    return {
      paymentMethods,
    };
  }
}
