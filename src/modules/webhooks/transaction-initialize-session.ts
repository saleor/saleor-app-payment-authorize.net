import { type AuthorizeNetClient } from "../authorize-net/authorize-net-client";
import { BaseError } from "@/errors";
import { type SyncWebhookResponse } from "@/lib/webhook-response-builder";
import { type TransactionInitializeSessionEventFragment } from "generated/graphql";

export const TransactionInitializeError = BaseError.subclass("TransactionInitializeError");

export const TransactionInitializeUnexpectedDataError = TransactionInitializeError.subclass(
  "TransactionInitializeUnexpectedDataError",
);

export class TransactionInitializeSessionService {
  private client: AuthorizeNetClient;

  constructor(client: AuthorizeNetClient) {
    this.client = client;
  }

  async execute(
    payload: TransactionInitializeSessionEventFragment,
  ): Promise<SyncWebhookResponse<"TRANSACTION_INITIALIZE_SESSION">> {
    // todo: check payload for what is the transaction result
    const isOk = true;

    if (isOk) {
      return {
        amount: payload.action.amount,
        result: "AUTHORIZATION_SUCCESS",
        data: {
          foo: "bar",
        },
        message: "Success",
        // externalUrl: "https://example.com",
        // pspReference: "pspReference",
        // time: "",
      };
    }

    return {
      amount: 0,
      result: "AUTHORIZATION_FAILURE",
      message: "Failure",
      data: {
        foo: "bar",
      },
    };
  }
}
