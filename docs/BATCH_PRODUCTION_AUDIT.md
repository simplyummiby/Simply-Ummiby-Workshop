# Batch Production Audit — v0.8.2.2

## Finding

The Batch Production module was only a placeholder page. It did not contain an independent production workflow, saved records, or unique controls.

## Capabilities reviewed

- **Build and unpack Ready Packs:** already available from Inventory → Ready Packs.
- **Prepare dowels and other make-ahead components in batches:** already available from the relevant Inventory rows.
- **Print care sheets and replenish printed supplies:** already available from Print & Branding and the Pack & Ship care-sheet workflow.
- **Receive and adjust stock:** already available from Inventory Quick Actions and item rows.
- **Create finished inventory:** finished-product records and adjustments remain in Inventory → Finished; no finished-product batch builder existed in Batch Production.
- **Order-specific manufacturing:** remains in Orders → Order Workspace.

## Decision

Remove the Batch Production menu item and placeholder page. Preserve all working batch actions in Inventory. Replace the Dashboard shortcut with **Build Ready Packs**, which opens the Ready Packs section directly.

## Data safety

No Batch Production records required migration because the module never stored its own data. Existing inventory transactions remain intact. New Ready Pack preparation transactions use `ready-packs` as their source; older `batch-production` history entries remain readable.
