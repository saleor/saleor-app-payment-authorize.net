---
"saleor-app-authorize-net": minor
---

Added basic scaffolding for Authorize.net payment app. Implemented two dummy webhook handlers: `payment-gateway-initialize-session` and `transaction-initialize-session`. Both return mocked values. Created dummy front-end checkout app under the "/example" directory. It triggers the `transaction-initialize-session` and completes the checkout after the transaction.
