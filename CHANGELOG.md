# saleor-app-payment-template

## 0.1.0

### Minor Changes

- 23f24e2: Added basic scaffolding for Authorize.net payment app. Implemented two dummy webhook handlers: `payment-gateway-initialize-session` and `transaction-initialize-session`. Both return mocked values. Created dummy front-end checkout app under the "/example" directory. It triggers the `transaction-initialize-session` and completes the checkout after the transaction.
- 9e26ef1: The app now creates a transaction in Authorize.net on `TRANSACTION_INITIALIZE_SESSION` webhook call. The `data` payload object is expected to contain the `opaqueData`: `dataDescriptor` and `dataValue`. The Authorize.net `payment` object is then built based on the `opaqueData`. This means the webhook handler can be unaware of the chosen payment method.
- 3c8f656: Implement the `payment-gateway-initialize-session` logic. It now returns the data needed to start communication with Authorize.net on in the checkout UI.
- da0eada: Modified the UI flow in the `example` app. It now consists of: product page, cart page, pay page, and success page. The pay page contains a credit card form. The credit card data is sent straight to Authorize.net.

## 0.0.1

### Patch Changes

- 4756c82: Fixes tests that were failing from the template
