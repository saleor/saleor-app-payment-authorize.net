# Authorize.net App

## Setup

- The `example` Checkout UI relies on the "Authorize transactions instead of charging" setting in the Saleor Dashboard -> Configuration -> Channels -> [channel] settings.

- The Saleor transaction id is stored in Authorize transaction `order.description`. Ideally, we would store it in `refId` but that field is max. 20 characters long and the Saleor transaction id is longer than that.

### Connecting sandbox PayPal to sandbox Authorize.net

1. Create [PayPal Developer Account](https://developer.paypal.com). No need to hook up a credit card.
2. While logged in, open [Sandbox test accounts](https://developer.paypal.com/dashboard/accounts).
3. Choose "personal" (I thought it's going to be "business", but it didn't work 🤷).
4. Log in to your Authorize.net sandbox account.
5. Go to _Account_ -> _Digital Payment Solutions_ -> _PayPal_ -> _Sign up_.
6. Fill in the form with the _personal_ PayPal sandbox account credentials.

## Development

### Build

```bash
pnpm run build
```

### Run

#### Running the Authorize.net App

```bash
pnpm run dev
```

The app will run on port 8000.

#### Running the Authorize.net UI example

```bash
cd example
pnpm run dev
```

> [!IMPORTANT]
> Both the example and the app need to be [tunneled](https://docs.saleor.io/docs/3.x/developer/extending/apps/developing-with-tunnels).
