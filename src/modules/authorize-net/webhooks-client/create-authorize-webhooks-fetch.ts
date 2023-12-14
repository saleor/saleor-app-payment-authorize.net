import { type AuthorizeProviderConfig } from "@/modules/authorize-net/authorize-net-config";

/**
 * @description Create a value for Authorization: basic header for Authorize.net webhooks
 * @see https://developer.authorize.net/api/reference/features/webhooks.html
 */
function createAuthorizeAuthenticationKey(config: AuthorizeProviderConfig.FullShape): string {
  const concatenatedKey = `${config.apiLoginId}:${config.transactionKey}`;
  const encodedKey = Buffer.from(concatenatedKey).toString("base64");

  return encodedKey;
}

type AuthorizeWebhooksFetchParams = {
  path?: string;
  body?: Record<string, unknown>;
  method: Required<RequestInit["method"]>;
} & Omit<RequestInit, "body" | "method">;

export function createAuthorizeWebhooksFetch(config: AuthorizeProviderConfig.FullShape) {
  const authenticationKey = createAuthorizeAuthenticationKey(config);
  const url =
    config.environment === "sandbox"
      ? "https://apitest.authorize.net/rest/v1/webhooks"
      : "https://api.authorize.net/rest/v1/webhooks";

  return ({ path, body }: AuthorizeWebhooksFetchParams) => {
    const apiUrl = path ? `${url}/${path}` : url;
    return fetch(apiUrl, {
      headers: {
        Authorization: `Basic ${authenticationKey}`,
      },
      body: JSON.stringify(body),
    });
  };
}
