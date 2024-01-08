Important:

- The `example` Checkout UI relies on the "Authorize transactions instead of charging" setting in the Saleor Dashboard -> Configuration -> Channels -> [channel] settings.

- The Saleor transaction id is stored in Authorize transaction `order.description`. Ideally, we would store it in `refId` but that field is max. 20 characters long and the Saleor transaction id is longer than that.
