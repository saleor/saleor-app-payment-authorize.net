---
"saleor-app-authorize-net": minor
---

Changed the Authorize.net flow to use Accept Hosted payment form. The process is now the following:

1. Send `TransactionInitializeMutation` from the `example` frontend to initialize the transaction.
2. The app responds to it in the `transaction_initialize_session` webhook handler. The handler does the following:

   1. Looks for stored user payment methods (`customerProfileId`).
   2. If `customerProfileId` is found, it is passed to the transaction used in `getHostedPaymentPageRequest`. This call returns the `formToken` needed to render the Accept Hosted payment form.
   3. Retrieves the `environment` (sandbox or production) from the app config.
   4. Returns the `formToken` and `environment` to the `example` frontend in the `data` field.

3. Render the Accept Hosted form in the `example` frontend using the `formToken` and `environment` obtained in step 2.
4. The Authorize transaction is created in the Accept Hosted payment form. The `example` frontend listens to the callback `onTransactionResponse`. When it arrives, it means the transaction was created.
5. Send `TransactionProcessMutation` from the `example` frontend to process the transaction. Pass `transactionId` in the `data` field.
6. The app responds to it in the `transaction_process_payment` webhook handler. The handler does the following:

   1. Retrieves the `transactionId` from the `data` field.
   2. Calls `getTransactionDetailsRequest` with the `transactionId` and `environment` to get the transaction details.
   3. The handler maps the state of the authorize transaction to a Saleor transaction result.

7. Based on the status of the transaction, the `example` frontend renders the appropriate message to the user.
