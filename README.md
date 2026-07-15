# Simply Ummiby Workshop

**Version 0.6.8**

Version 0.6.8 turns Recipes into a manageable workshop library. Recipes now have a scan-friendly table, filters and sorting, improved navigation, and a structured Add/Edit Recipe interface that persists changes in local storage and backups.

## Version 0.6.8 highlights

- Replaced the recipe cards with a searchable table.
- Added category, craft, and status filters.
- Added recipe sorting and direct Open, Edit, and Product actions.
- Added Back to Recipes and View Catalog navigation from recipe pages.
- Added a structured recipe editor for basics, methods, references, materials, tools, stages, wisdom, packing, and revision history.
- Migrated the bundled recipes into editable saved workshop data without breaking active-order recipe stage tracking.

## Version 0.6.8 highlights

- Restores normal Dashboard and app-content rendering.
- Initializes default product categories before saved-data migration runs.
- Preserves the v0.6.7.2 Categories & Codes module.
- Preserves Catalog filtering by category and craft.
- Preserves Catalog sorting by craft, category, product name, code, and status.
- Keeps existing products, orders, inventory, recipes, colors, and saved data intact.

## Product organization

Products includes **Catalog**, **Categories & Codes**, **Colors**, and **Recipes**. The Catalog can be filtered by product category and craft and defaults to sorting by Craft → Category → Product.

## Local data

The app stores workshop data in browser local storage and supports downloadable JSON backups. Keep backups before replacing or substantially changing the project.
