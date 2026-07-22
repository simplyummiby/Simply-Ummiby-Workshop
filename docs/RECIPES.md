# Initial Product Recipes

This document records the confirmed business rules that future recipe screens must support.

## Macramé Paper Towel Holder

### Colors

Core:

- Natural/Beige
- White
- Black
- Gray

Additional:

- Midnight Blue
- Forest Green
- Chocolate Brown
- Dusty Rose
- Blush Pink
- Watermelon Pink
- Berry Pink
- Wine Red

### Known raw-material rules

- Uses 2 end caps
- Uses 1 wooden ring
- Uses a paper towel dowel
- The dowel is not included in a fabrication kit
- Cord is initially tracked by stock condition rather than exact yardage

### Packaging rule

- One paper towel holder per poly mailer
- A paper towel holder may share a shipment with a toilet paper holder or oven-door towel holder only when package size and actual packing allow it
- Two or more paper towel holders require separate mailers

## Macramé Toilet Paper Holder

### Colors

Uses the same color list as the paper towel holder.

### Known raw-material rules

- Uses 1 wooden ring
- Does not use paper towel end caps

### Packaging rule

Uses the smaller poly mailer size shared with the oven-door towel holder.

## Crochet Oven-Door Towel Holder

### Colors

- Natural

### Packaging rule

Uses the smaller poly mailer size shared with the toilet paper holder.

## Shared care sheet

All three products currently use the same care instruction sheet.

The usual rule is one care sheet per Etsy order. When one Etsy order must be divided into separate mailers, each mailer receives a care sheet.

## Product tags

Each product has a distinct tag type.

Tags are deducted during packing.

When multiple same-product items are grouped together in one package, they may share one tag. Different orders always use separate tags.

## Packing slip

One packing slip is normally used per Etsy order.

When an order is split into multiple mailers, a separate copy may be printed for each mailer and marked to show what is inside that package.


## Version 0.6.5 — Prepared Dowel Workflow

Paper towel dowels now have two inventory states: raw Paper Towel Dowels and Prepared Paper Towel Dowels. A prepared dowel is cut to length, fitted with two end caps, inspected, and ready for packing. Preparing one consumes one raw dowel and two end caps. Prepared dowels may be made in batches from Inventory or created directly for an order. A paper towel holder cannot complete Pack Mailer until its prepared-dowel requirement is resolved.

## Version 0.6.5.1 — Product-Specific Dowel Workflows

Paper Towel Holder and Toilet Paper Holder dowels are separate raw and prepared inventory items. Preparing a Paper Towel Holder dowel consumes one raw PTH dowel and two end caps. Preparing a Toilet Paper Holder dowel consumes one raw TPH dowel and no end caps. Both may be prepared in batches or directly for an order, and Pack Mailer remains blocked until the correct prepared dowel is assigned.



## Manufacturing vs. Packaging

Each recipe has two component groups:

- **Manufacturing Components**: cord, yarn, rings, dowels, end caps, and other supplies used to make the item.
- **Packaging Components**: mailers, labels, wrapping string, stickers, care sheets, and other supplies used after production.

Every row links to a permanent inventory ID. Counted rows store a quantity per product. Cut-length rows store pieces, length per piece, and the measurement unit. Manufacturing inventory is consumed when production begins. Packaging inventory is consumed when the completed order is marked packed.
