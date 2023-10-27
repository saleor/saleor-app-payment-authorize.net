---
"saleor-app-authorize-net": minor
---

The app now creates a transaction in Authorize.net on `TRANSACTION_INITIALIZE_SESSION` webhook call. The `data` payload object is expected to contain the `opaqueData`: `dataDescriptor` and `dataValue`. The Authorize.net `payment` object is then built based on the `opaqueData`. This means the webhook handler can be unaware of the chosen payment method.
