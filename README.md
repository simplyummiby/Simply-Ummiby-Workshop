# Simply Ummiby Workshop

**Version 0.6.5.2**

Version 0.6.5.2 reorganizes Inventory around the way supplies are found and prepared in the workshop. Existing quantities and custom inventory records are preserved through migration.

## Version 0.6.5.2 highlights

- Split Raw Materials into **Yarn & Cord** and **Accessories**.
- Renamed **Print & Cricut Supplies** to **Print & Branding**.
- Renamed **Fabrication Kits** to **Prepared Components**.
- Moved prepared dowels and precut cord sets into Prepared Components.
- Kept raw dowels, wooden rings, end caps, and future hardware under Accessories.
- Kept poly mailers in the dedicated Packaging Supplies category.
- Added safe category migration for existing and custom inventory records.

## Version 0.6.5.1 highlights

- Adds separate **Toilet Paper Dowels** and **Prepared Toilet Paper Dowels** inventory items.
- Preparing a Paper Towel Holder dowel uses 1 raw PTH dowel and 2 end caps.
- Preparing a Toilet Paper Holder dowel uses 1 raw TPH dowel and no end caps.
- Supports batch preparation and order-time preparation for both dowel types.
- Blocks Pack Mailer until the correct product-specific prepared dowel is assigned.
- Returns an undone or cancelled dowel to the correct prepared-component inventory.
