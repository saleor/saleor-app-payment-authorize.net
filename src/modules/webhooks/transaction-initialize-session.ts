import { BaseError } from "@/errors";
import { type SyncWebhookResponse } from "@/lib/webhook-response-builder";
import { type TransactionInitializeSessionEventFragment } from "generated/graphql";

export const TransactionInitializeError = BaseError.subclass("TransactionInitializeError");

export class TransactionInitializeSessionService {
  execute(
    payload: TransactionInitializeSessionEventFragment,
  ): SyncWebhookResponse<"TRANSACTION_INITIALIZE_SESSION"> {
    return {
      amount: payload.action.amount,
      result: "AUTHORIZATION_ACTION_REQUIRED",
      data: {},
    };
  }
}
