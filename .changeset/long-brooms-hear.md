---
"saleor-app-authorize-net": patch
---

Refactored the way validation errors are thrown. Instead of throwing a raw Zod error, the app will now wrap it with a custom error and a message.
