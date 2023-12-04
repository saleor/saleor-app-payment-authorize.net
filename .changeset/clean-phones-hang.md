---
"saleor-app-authorize-net": minor
---

Added support for the `TRANSACTION_CANCELATION_REQUESTED` webhook that voids the transaction in Authorize. The app now also saves the Authorize transaction id in the transaction metadata.
