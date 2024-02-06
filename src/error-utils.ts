import * as Sentry from "@sentry/nextjs";
import { type z } from "zod";
import { BaseError } from "./errors";

function normalizeError(error: unknown) {
  return BaseError.normalize(error);
}

function captureError(error: Error) {
  Sentry.captureException(error);
}

function buildErrorResponse(error: Error) {
  return {
    error: {
      message: error.message,
    },
  };
}

function formatZodErrorToCause(error: z.ZodError): string {
  return error.errors.map((e) => e.message).join(", ");
}

export const errorUtils = {
  capture: captureError,
  buildResponse: buildErrorResponse,
  normalize: normalizeError,
  formatZodErrorToCause,
};
