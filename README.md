# Simply Ummiby Workshop

**Version 0.6.6**

Version 0.6.6 introduces a dedicated Products module with a table-based Catalog, reusable Colors, and direct access to Recipes.

## Version 0.6.6 highlights

- Products is now a main navigation module.
- Catalog replaces product cards with a structured table.
- Each catalog row can open the product or its linked recipe.
- Colors are reusable records with stable IDs and product usage.
- Existing product colors migrate automatically without changing order color names.
- Recipes remain available inside the Products module.

## Version 0.6.5.1 highlights

- Adds separate **Toilet Paper Dowels** and **Prepared Toilet Paper Dowels** inventory items.
- Preparing a Paper Towel Holder dowel uses 1 raw PTH dowel and 2 end caps.
- Preparing a Toilet Paper Holder dowel uses 1 raw TPH dowel and no end caps.
- Supports batch preparation and order-time preparation for both dowel types.
- Blocks Pack Mailer until the correct product-specific prepared dowel is assigned.
- Returns an undone or cancelled dowel to the correct prepared-component inventory.
