import { type NextApiRequest } from "next";
import { BaseError } from "@/errors";
import { env } from "@/lib/env.mjs";

const InvalidDomainError = BaseError.subclass("InvalidDomainError");

const MissingRefererError = BaseError.subclass("MissingRefererError");

export const ALLOWED_DOMAIN = ""; // todo: replace with domain from env config

export function validateDomainWhiteList(request: NextApiRequest, whiteListedDomain: string) {
  const referer = request.headers.referer ?? env.AUTHORIZE_PAYMENT_FORM_URL;

  if (!referer) {
    throw new MissingRefererError(
      "Referer not found on the request. Make sure the request is coming from the same domain and 'strict-origin-when-cross-origin' referrerPolicy is set.",
    );
  }

  const isOriginAllowed = whiteListedDomain.includes(origin);

  if (!isOriginAllowed) {
    throw new InvalidDomainError(`Origin ${origin} is not allowed`);
  }
}
