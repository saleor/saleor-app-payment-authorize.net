---
"saleor-app-authorize-net": minor
---

Added the implementation of `PAYMENT_GATEWAY_INITIALIZE_SESSION` webhook which returns all the implemented payment methods with data needed to render them. Then, the transaction must be created with `TRANSACTION_INITIALIZE_SESSION`. The process requires an extra step for Accept Hosted payment method. To render the payment form, you must first call the `TRANSACTION_INITIALIZE_SESSION`, which returns result `AUTHORIZATION_ACTION_REQUIRED` with `data` needed to render the Accept Hosted form. Then, `TRANSACTION_PROCESS_SESSION` must be called.
