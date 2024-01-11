import { type TRPC_ERROR_CODE_KEY } from "@trpc/server/rpc";
import ModernError from "modern-errors";
import ModernErrorsSerialize from "modern-errors-serialize";
import { ZodError } from "zod";

// Http errors
type CommonProps = {
  errorCode?: string;
  statusCode?: number;
  name?: number;
};

export const BaseError = ModernError.subclass("BaseError", {
  plugins: [ModernErrorsSerialize],
  props: {} as CommonProps,
});
export const UnknownError = BaseError.subclass("UnknownError");

// TRPC Errors
interface TrpcErrorOptions {
  /** HTTP response code returned by TRPC */
  trpcCode?: TRPC_ERROR_CODE_KEY;
}
export const BaseTrpcError = BaseError.subclass("BaseTrpcError", {
  props: { trpcCode: "INTERNAL_SERVER_ERROR" } as TrpcErrorOptions,
});
export const JwtTokenExpiredError = BaseTrpcError.subclass("JwtTokenExpiredError", {
  props: { trpcCode: "UNAUTHORIZED" } as TrpcErrorOptions,
});
export const JwtInvalidError = BaseTrpcError.subclass("JwtInvalidError", {
  props: { trpcCode: "UNAUTHORIZED" } as TrpcErrorOptions,
});
export const ReqMissingSaleorApiUrlError = BaseTrpcError.subclass("ReqMissingSaleorApiUrlError", {
  props: { trpcCode: "BAD_REQUEST" } as TrpcErrorOptions,
});
export const ReqMissingAuthDataError = BaseTrpcError.subclass("ReqMissingSaleorApiUrlError", {
  props: { trpcCode: "UNAUTHORIZED" } as TrpcErrorOptions,
});
export const ReqMissingTokenError = BaseTrpcError.subclass("ReqMissingTokenError", {
  props: { trpcCode: "BAD_REQUEST" } as TrpcErrorOptions,
});
export const ReqMissingAppIdError = BaseTrpcError.subclass("ReqMissingAppIdError", {
  props: { trpcCode: "BAD_REQUEST" } as TrpcErrorOptions,
});

export function normalizeError(error: unknown) {
  if (error instanceof ZodError) {
    return BaseError.normalize(error.format());
  }

  return BaseError.normalize(error);
}
