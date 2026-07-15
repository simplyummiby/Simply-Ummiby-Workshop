# Simply Ummiby Workshop

**Version 0.6.7.2.1**

Version 0.6.7.2.1 is a corrective release for the Products category and catalog update. It fixes a startup initialization error that prevented the main app views from rendering in v0.6.7.2.

## Version 0.6.7.2.1 highlights

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
