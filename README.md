# Simply Ummiby Workshop

**Version 0.6.3.2**

Version 0.6.3.2 aligns the unified Pack & Ship workspace with the actual Simply Ummiby packing-table routine. Product tags, the care sheet with Etsy packing slip, mailer loading, Shippo label printing, the branding sticker, sealing, and the final packed status now appear as one continuous sequence.

## Version 0.6.3.2 highlights

- Product-specific tag tasks remain linked to stable inventory-item IDs.
- **Prepare Care Sheet & Etsy Packing Slip** includes an **Open Etsy Orders** button on the same row.
- The Etsy packing slip is treated as printing on the reverse side of the single care sheet consumed for the order.
- Each **Pack Mailer** task lists all contents inserted together: tagged product, care sheet/packing slip, and prepared dowel when required.
- Pack Mailer consumes the correct product-specific mailer inventory.
- **Print & Attach Shipping Label** is one task with an **Open Shippo** button on the same row.
- Branding sticker application and package sealing follow the label step.
- The old item-level Confirm Finished and Mark Item Packed controls were removed from Step 3.
- One final **Mark Order Packed** action moves the completed order to **Ready to Mail**.
- Inventory quantities, low-stock warnings, safe reversals, and transaction history remain intact.

## Care-sheet printable

Place the approved care sheet PDF at:

```text
printables/caresheet-pt-tp.pdf
```

Opening the printable does not change inventory. Printed stock is added only after the successfully printed quantity is confirmed.

## Local data

Workshop data is stored in browser local storage. Download a backup before clearing browser data or moving to another computer.
