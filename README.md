# Authorize.net app

This app integrates Saleor with the [Authorize.net](https://www.authorize.net/) payment gateway.

Required Saleor version: **3.13**

> [!NOTE]
> This is an example implementation. Only community support is available.

## Development

### Prerequisites

#### Software

- Node.js 18

- pnpm 8.14.1

#### Access

An Authorize.net Sandbox account is required to run the app. You can create one [here](https://developer.authorize.net/hello_world/sandbox/).

### Installation

1. Copy `.env.example` to `.env` and fill in the required values.
2. `pnpm install`

### Usage

> [!IMPORTANT]
> The app needs to be [tunneled](https://docs.saleor.io/docs/3.x/developer/extending/apps/developing-with-tunnels).

To run the app on port 3000, use the following command:

```bash
pnpm dev
```

Each time you modify a `.graphql` file, you have to run:

```bash
pnpm generate
```

to regenerate the GraphQL types.

### Vendor software

The app uses the [official Authorize.net Node SDK](https://github.com/AuthorizeNet/sdk-node).

Credit cards payments are handled through [Accept Hosted](https://developer.authorize.net/api/reference/features/accept-hosted.html) - Authorize.net hosted payment form.

## Overview

### Features

- ✅ [Authorize transactions](https://docs.saleor.io/docs/3.x/developer/payments#authorization_success)
- ❌ [Charge transactions](https://docs.saleor.io/docs/3.x/developer/payments#charge_success)
- ✅ [Refund transactions](https://docs.saleor.io/docs/3.x/api-reference/webhooks/enums/webhook-event-type-sync-enum#code-style-fontweight-normal-webhookeventtypesyncenumbtransaction_refund_requestedbcode)
- ✅ [Cancel transactions](https://docs.saleor.io/docs/3.x/api-reference/webhooks/enums/webhook-event-type-sync-enum#code-style-fontweight-normal-webhookeventtypesyncenumbtransaction_cancelation_requestedbcode)
- ✅ [Initialize payment gateway](https://docs.saleor.io/docs/3.x/developer/payments#initialize-payment-gateway)
- ❌ [Saved payment methods](https://docs.saleor.io/docs/3.x/developer/payments#stored-payment-methods)
- ❌ [Storing config in metadata](https://docs.saleor.io/docs/3.x/developer/extending/apps/developing-apps/apps-patterns/persistence-with-metadata-manager)
- ✅ Two way webhook synchronization (Saleor → Service → Saleor)
- ✅ Front-end example (in this repository, see: `example`)
- Saving credit cards through [Authorize.net customer payment profiles](https://developer.authorize.net/api/reference/index.html#customer-profiles-create-customer-payment-profile)

#### Payment methods

- Credit card ([Accept Hosted](https://developer.authorize.net/api/reference/features/accept-hosted.html))
- PayPal (_in progress_)
- Apple Pay (_in progress_)

### Assumptions

- The app only authorizes the transactions. The CHARGE event is expected to happen outside of the app. The app will synchronize the CHARGE event with Saleor through webhooks.
- The Saleor transaction id is stored in Authorize.net transaction `order.description`. Ideally, we would store it in `refId`, but that field is max. 20 characters long and the Saleor transaction id is longer than that. **When the app synchronizes webhook calls from an external system, make sure this system stores Saleor transaction id in the `order.description` as well.** Otherwise, the transaction won't be mapped to Saleor.

### Limitations

- The app does not support multiple configurations. One configuration will be used to handle the transactions across all the channels.

## Configuration

The app has no configuration UI and is configured through environment variables. The required variables are described in the `env.mjs` file.
