import { BaseError } from "@/errors";

export const AuthorizeNetError = BaseError.subclass("AuthorizeNetError");

export const AuthorizeNetUnexpectedDataError = AuthorizeNetError.subclass(
  "AuthorizeNetUnexpectedDataError",
);
