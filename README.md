# Simply Ummiby Workshop

**Version 0.4.1**

Version 0.4.1 integrates the Workshop Recipe directly into each active order’s Manufacturing & Assembly tab.

## Corrected workflow

### Production Planning

Now focuses on:

- fulfillment choice,
- current recorded inventory for the exact product and color,
- fabrication-kit contents,
- raw-material requirements,
- material status.

The three paths are visibly different:

- **Finished Inventory** skips manufacturing.
- **Fabrication Kit** skips Cord Preparation because the cords are already cut and the ring/end caps are in the kit.
- **Build From Raw Materials** includes Cord Preparation and shows individual material requirements.

Current kit and finished-product counts display as **0 recorded** until the full inventory module is populated.

### Manufacturing & Assembly

The live Production Traveler now embeds the working recipe directly inside the order.

It includes:

- quick-reference measurements,
- production milestones,
- expandable instructions,
- saved order-specific checkpoints,
- automatic opening of the next unfinished milestone.

The permanent Workshop Recipe remains separate and can be opened only when needed. A **Return to This Order** button preserves the order and item context.

### Pack & Ship

The Final Shipping Checklist now appears only inside the Pack & Ship tab.

It no longer appears below Production Planning or Manufacturing.

## Data behavior

Recipe milestone checks are saved to the specific production item and do not alter the master Workshop Recipe.
