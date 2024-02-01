# Authorize.net App

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

## Important

- The `example` Checkout UI relies on the "Authorize transactions instead of charging" setting in the Saleor Dashboard -> Configuration -> Channels -> [channel] settings.

- The Saleor transaction id is stored in Authorize.net transaction `order.description`. Ideally, we would store it in `refId` but that field is max. 20 characters long and the Saleor transaction id is longer than that. **When the app synchronizes webhook calls from an external system, make sure this system stores Saleor transaction id in the `order.description` as well.** Otherwise, the transaction won't be mapped to Saleor.
