import { BaseError } from "@/errors";

export const AuthorizeNetError = BaseError.subclass("AuthorizeNetError");

export const AuthorizeNetCreateTransactionError = AuthorizeNetError.subclass(
  "AuthorizeNetCreateTransactionError",
);
