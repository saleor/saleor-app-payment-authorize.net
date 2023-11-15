---
"saleor-app-authorize-net": minor
---

Added support for reading the full `AppConfig` from `.env`, not just the provider configuration. In order to initialize the app with env config, you must now provide `AUTHORIZE_SALEOR_CHANNEL_SLUG` environment variable with the slug of the channel.
