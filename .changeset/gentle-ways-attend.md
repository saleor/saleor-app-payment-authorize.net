---
"saleor-app-authorize-net": minor
---

Changed the Authorize.net flow to use Accept Hosted payment form. The process is now the following:

1. Send `PaymentGatewayInitializeMutation` from the `example` frontend to fetch the data needed to render the Accept Hosted form (`formToken` and `environment`). The app responds to it in the `payment_gateway_initialize_session` webhook handler. The handler calls Authorize.net's `getHostedPaymentPageRequest` to set the payment page settings and obtain the `formToken`. The `environment` is set to `sandbox` or `production` depending on the configuration provided in metadata or environment variables.
2. Send `TransactionInitializeMutation` from the `example` frontend to initialize the transaction. The app responds to it in the `transaction_initialize_session` webhook handler. The handler returns the transaction payload expected by Saleor, including the `result: AUTHORIZATION_ACTION_REQUIRED` status.
3. Render the Accept Hosted form in the `example` frontend using the `formToken` and `environment` obtained in step 1.
4. The Authorize transaction is created in the Accept Hosted payment form. The `example` frontend listens to the callback `onTransactionResponse`. When it arrives, it means the transaction was created. We map the state of Authorize transaction to a Saleor transaction by sending `TransactionProcessMutation` with `data: { result: "AUTHORIZATION_SUCCESS" }`. If the transaction was cancelled, we send `TransactionProcessMutation` with `data: { result: "AUTHORIZATION_FAILED" }`. The app responds to it in the `transaction_process_payment` webhook handler. The handler returns the `data.result` field in the transaction payload expected by Saleor.
