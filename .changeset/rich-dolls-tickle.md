---
"saleor-app-authorize-net": patch
---

Fixed the evaluation of webhook signature. It now uses `timingSafeEqual`.
