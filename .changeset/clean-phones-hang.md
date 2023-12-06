---
"saleor-app-authorize-net": minor
---

Added support for the `TRANSACTION_CANCELATION_REQUESTED` webhook that voids the transaction in Authorize.

Added support for the `TRANSACTION_REFUND_REQUESTED` webhook that refunds the transaction in Authorize.

The app now also saves the Authorize transaction id in the transaction metadata.

The frontend `example` allows you to complete the checkout and turn it into an order.
