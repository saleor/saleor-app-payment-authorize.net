import https from "node:https";
import { httpsPromisified } from "./httpsPromisify";
import {
  ApplePayHttpError,
  ApplePayInvalidMerchantDomainError,
  ApplePayMissingCertificateError,
} from "@/errors";
import { type JSONValue } from "@/types";
import { unpackPromise } from "@/lib/utils";
import { createLogger } from "@/lib/logger";

/**
 * https://developer.apple.com/documentation/apple_pay_on_the_web/setting_up_your_server#3172427
 */
const applePayValidateMerchantDomains = [
  // For production environment:
  "apple-pay-gateway.apple.com",
  "cn-apple-pay-gateway.apple.com",
  // Additional domain names and IP addresses:
  "apple-pay-gateway-nc-pod1.apple.com",
  "apple-pay-gateway-nc-pod2.apple.com",
  "apple-pay-gateway-nc-pod3.apple.com",
  "apple-pay-gateway-nc-pod4.apple.com",
  "apple-pay-gateway-nc-pod5.apple.com",
  "apple-pay-gateway-pr-pod1.apple.com",
  "apple-pay-gateway-pr-pod2.apple.com",
  "apple-pay-gateway-pr-pod3.apple.com",
  "apple-pay-gateway-pr-pod4.apple.com",
  "apple-pay-gateway-pr-pod5.apple.com",
  "cn-apple-pay-gateway-sh-pod1.apple.com",
  "cn-apple-pay-gateway-sh-pod2.apple.com",
  "cn-apple-pay-gateway-sh-pod3.apple.com",
  "cn-apple-pay-gateway-tj-pod1.apple.com",
  "cn-apple-pay-gateway-tj-pod2.apple.com",
  "cn-apple-pay-gateway-tj-pod3.apple.com",
  // For sandbox testing only:
  "apple-pay-gateway-cert.apple.com",
  "cn-apple-pay-gateway-cert.apple.com",
] as const;

export const validateMerchant = async ({
  validationURL,
  merchantName,
  merchantIdentifier,
  domain,
  applePayCertificate,
}: {
  /** Fully qualified validation URL that you receive in `onvalidatemerchant` */
  validationURL: string;
  /** A string of 64 or fewer UTF-8 characters containing the canonical name for your store, suitable for display. This needs to remain a consistent value for the store and shouldn’t contain dynamic values such as incrementing order numbers. Don’t localize the name. */
  merchantName: string;
  /** Your Apple merchant identifier (`partnerInternalMerchantIdentifier`) as described in https://developer.apple.com/documentation/apple_pay_on_the_web/applepayrequest/2951611-merchantidentifier */
  merchantIdentifier: string;
  /** Fully qualified domain name associated with your Apple Pay Merchant Identity Certificate. */
  domain: string;
  /** base64 encoded `apple-pay-cert.pem` file */
  applePayCertificate: string;
}) => {
  const logger = createLogger({ name: "validateMerchant" });

  logger.debug("Received validation URL", { validationURL, merchantName, merchantIdentifier });

  if (!applePayCertificate) {
    logger.error("Missing Apple Pay Merchant Identity Certificate");
    throw new ApplePayMissingCertificateError("Missing Apple Pay Merchant Identity Certificate");
  }

  const applePayURL = new URL(validationURL);
  const applePayDomain = applePayURL.hostname;

  logger.debug("Validation URL domain", { applePayDomain });
  if (!applePayValidateMerchantDomains.includes(applePayDomain)) {
    throw new ApplePayInvalidMerchantDomainError(`Invalid validationURL domain: ${applePayDomain}`);
  }

  const requestData = {
    merchantIdentifier,
    displayName: merchantName,
    initiative: "web",
    initiativeContext: domain,
  };

  logger.debug("requestData", {
    merchantIdentifier,
    displayName: merchantName,
    initiative: "web",
    initiativeContext: domain,
  });

  const cert = Buffer.from(applePayCertificate, "base64");

  const agent = new https.Agent({ cert, key: cert, requestCert: true, rejectUnauthorized: true });

  logger.debug("Created authenticated HTTPS agent");

  const [requestError, requestResult] = await unpackPromise(
    httpsPromisified(
      validationURL,
      {
        method: "POST",
        agent,
      },
      JSON.stringify(requestData),
    ),
  );

  if (requestError) {
    logger.error("Request failed", { requestError: requestError });
    throw requestError;
  }

  const { body, statusCode } = requestResult;

  logger.debug("Request done", { statusCode });

  if (statusCode < 200 || statusCode >= 300) {
    logger.error("Got error response from Apple Pay", { statusCode });

    throw new ApplePayHttpError(body, {
      props: {
        statusCode,
      },
    });
  }

  logger.info("Got successful response from Apple Pay", { statusCode });
  const json = JSON.parse(body) as JSONValue;

  return json;
};
