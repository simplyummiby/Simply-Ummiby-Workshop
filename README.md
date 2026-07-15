# Simply Ummiby Workshop

**Version 0.6.3.1**

Version 0.6.3.1 adds product-specific tag inventory and unifies the Pack & Ship experience. Product Master stores a stable Product Tag Inventory Item ID for each product. The Pack & Ship workspace generates tag tasks from the actual Etsy order, groups identical product/color quantities, and safely consumes or restores the exact number of tags.

## Version 0.6.3.1 highlights

- Product tags are selected through stable Product Master inventory-item relationships.
- Order-aware tag tasks show product, color, quantity required, and current stock.
- Two identical items are grouped into one task that consumes two tags.
- Different products or colors receive separate, clearly labeled tag tasks.
- Tag deductions and reversals appear in Inventory History and cannot duplicate after refresh.
- Missing or out-of-stock tag configurations block completion without allowing negative inventory.
- Pack the Order and Ship the Order now appear together in one unified Pack & Ship workspace.
- The duplicate Whole Order / Final Shipping Checklist presentation has been removed.
- Mailers, care sheets, product tags, and branding stickers all show required and available quantities.
- Existing order data is migrated safely; previously checked legacy tag text does not silently consume stock.

## Care-sheet printable

Place the approved care sheet PDF at:

```text
printables/caresheet-pt-tp.pdf
```

Opening the printable does not change inventory. Printed stock is added only after the successfully printed quantity is confirmed.

## Local data

Workshop data is stored in browser local storage. Download a backup before clearing browser data or moving to another computer.
