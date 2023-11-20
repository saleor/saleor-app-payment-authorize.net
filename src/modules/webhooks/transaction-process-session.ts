import { z } from "zod";
import { BaseError } from "@/errors";
import { type SyncWebhookResponse } from "@/lib/webhook-response-builder";
import { type TransactionProcessSessionEventFragment } from "generated/graphql";

export const TransactionProcessError = BaseError.subclass("TransactionProcessError");

export const TransactionProcessUnexpectedDataError = TransactionProcessError.subclass(
  "TransactionProcessUnexpectedDataError",
);

const transactionProcessPayloadDataSchema = z.object({
  result: z.enum(["AUTORIZATION_SUCCESS", "AUTHORIZATION_FAILURE"]),
});

type WebhookResult = SyncWebhookResponse<"TRANSACTION_PROCESS_SESSION">["result"];

export class TransactionProcessSessionService {
  execute(
    payload: TransactionProcessSessionEventFragment,
  ): SyncWebhookResponse<"TRANSACTION_PROCESS_SESSION"> {
    const dataParseResult = transactionProcessPayloadDataSchema.safeParse(payload.data);

    if (!dataParseResult.success) {
      throw new TransactionProcessUnexpectedDataError("`data` object has unexpected structure.", {
        props: {
          detail: dataParseResult.error,
        },
      });
    }

    const { result } = dataParseResult.data;

    return {
      amount: payload.action.amount,
      result: result as WebhookResult,
      data: {},
    };
  }
}
