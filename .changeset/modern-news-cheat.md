---
"saleor-app-authorize-net": patch
---

Fixed the bug with Authorize.net returning errors when the line item name is longer than the db field restrictions. The app will now slice the name.
