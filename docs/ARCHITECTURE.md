## Version 0.8.2 — Inventory Section Navigation

Inventory remains a single local-first module backed by `inventoryCatalog`, `inventoryTransactions`, suppliers, product links, and managed material types. The section pages are SPA views controlled by internal state; they do not open external URLs or create parallel data stores. Filters are derived from live item records, including inferred item types used for page-level filtering.

# Architecture

Simply Ummiby Workshop remains a static, local-first web application.

## Technology

- HTML
- CSS
- Vanilla JavaScript
- Browser `localStorage`
- JSON backup download
