import { AcceptHostedGateway } from "../authorize-net/gateways/accept-hosted-gateway";
import { AcceptJsGateway } from "../authorize-net/gateways/accept-js-gateway";
import { type PaymentGatewayInitializeSessionData } from "@/pages/api/webhooks/payment-gateway-initialize-session";
import { type PaymentGatewayInitializeSessionEventFragment } from "generated/graphql";

export class PaymentGatewayInitializeSessionService {
  async execute(
    payload: PaymentGatewayInitializeSessionEventFragment,
  ): Promise<PaymentGatewayInitializeSessionData> {
    const acceptHostedGateway = new AcceptHostedGateway();
    const acceptJsGateway = new AcceptJsGateway();

    const initializeAcceptHosted = acceptHostedGateway.initializePaymentGateway(payload);
    const initializeAcceptJs = acceptJsGateway.initializePaymentGateway(payload);

    /**
     * @see: ApplePayGateway, PaypalGateway
     * Import once they are implemented.
     */

    const [acceptHosted, acceptJs] = await Promise.all([
      initializeAcceptHosted,
      initializeAcceptJs,
    ]);

    return {
      acceptHosted,
      acceptJs,
    };
  }
}
