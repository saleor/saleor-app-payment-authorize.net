import { z } from "zod";
import { BaseError } from "@/errors";
import { type SyncWebhookResponse } from "@/lib/webhook-response-builder";
import { type TransactionProcessSessionEventFragment } from "generated/graphql";

export const TransactionProcessError = BaseError.subclass("TransactionProcessError");

export const TransactionProcessUnexpectedDataError = TransactionProcessError.subclass(
  "TransactionProcessUnexpectedDataError",
);

// todo: use transactionId to verify the state of transaction in Authorize
// todo: if customerProfileId is there, update the stored customerProfileId x userEmail mapping
const transactionProcessPayloadDataSchema = z.object({
  transactionId: z.string().min(1),
  customerProfileId: z.string().min(1).optional(),
});

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

    // todo: implement

    return {
      amount: payload.action.amount,
      result: "AUTHORIZATION_FAILURE",
      data: {},
    };
  }
}
