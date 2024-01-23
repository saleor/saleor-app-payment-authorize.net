import * as Sentry from "@sentry/nextjs";
import { ZodError } from "zod";
import { createLogger } from "./lib/logger";
import { BaseError } from "./errors";

function normalizeError(error: unknown) {
  if (error instanceof ZodError) {
    return BaseError.normalize(error);
  }

  return BaseError.normalize(error);
}

function captureError(error: Error, logger = createLogger({ name: "errorUtils" })) {
  Sentry.captureException(error);
  logger.error(error, "Error caught:");
}

function buildErrorResponse(error: Error) {
  return {
    error: {
      message: error.message,
    },
  };
}

export const errorUtils = {
  capture: captureError,
  buildResponse: buildErrorResponse,
  normalize: normalizeError,
};
