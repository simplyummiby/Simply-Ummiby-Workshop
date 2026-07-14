window.SUW_INVENTORY_CATALOG = {
  categories: [
    {
      id: "raw-materials",
      name: "Raw Materials",
      description: "Purchased components and cord used to make products or fabrication kits."
    },
    {
      id: "fabrication-kits",
      name: "Fabrication Kits",
      description: "Product-and-color-specific kits prepared ahead of time."
    },
    {
      id: "finished-inventory",
      name: "Finished Inventory",
      description: "Completed products ready to assign to an order."
    },
    {
      id: "packaging",
      name: "Packaging Supplies",
      description: "Poly mailers, labels, and other packing materials."
    },
    {
      id: "print-supplies",
      name: "Print & Cricut Supplies",
      description: "Care sheets, product tags, company stickers, and printed resources."
    }
  ],
  items: [
    {
      id: "wood-rings",
      category: "raw-materials",
      name: "Wooden Rings",
      tracking: "quantity",
      quantity: 18,
      reorderAt: 8,
      preferredStock: 30,
      restockType: "purchase",
      supplier: "",
      purchaseUrl: "",
      notes: "Used for macramé paper towel and toilet paper holders."
    },
    {
      id: "paper-towel-dowels",
      category: "raw-materials",
      name: "Paper Towel Dowels",
      tracking: "quantity",
      quantity: 0,
      reorderAt: 4,
      preferredStock: 12,
      restockType: "purchase",
      supplier: "",
      purchaseUrl: "",
      notes: "Stored separately; not included in a paper towel holder fabrication kit."
    },
    {
      id: "end-caps",
      category: "raw-materials",
      name: "End Caps",
      tracking: "quantity",
      quantity: 4,
      reorderAt: 4,
      preferredStock: 24,
      restockType: "purchase",
      supplier: "",
      purchaseUrl: "",
      notes: "Two required per macramé paper towel holder."
    },
    {
      id: "cord-natural-beige",
      category: "raw-materials",
      name: "3 mm Macramé Cord — Natural/Beige",
      tracking: "condition",
      condition: "Getting Low",
      restockType: "purchase",
      supplier: "",
      purchaseUrl: "",
      notes: "Existing roll is tracked by condition. New rolls can later be tracked more precisely."
    },
    {
      id: "cord-white",
      category: "raw-materials",
      name: "3 mm Macramé Cord — White",
      tracking: "condition",
      condition: "Available",
      restockType: "purchase",
      supplier: "",
      purchaseUrl: "",
      notes: ""
    },
    {
      id: "cord-black",
      category: "raw-materials",
      name: "3 mm Macramé Cord — Black",
      tracking: "condition",
      condition: "Available",
      restockType: "purchase",
      supplier: "",
      purchaseUrl: "",
      notes: ""
    },
    {
      id: "cord-gray",
      category: "raw-materials",
      name: "3 mm Macramé Cord — Gray",
      tracking: "condition",
      condition: "Available",
      restockType: "purchase",
      supplier: "",
      purchaseUrl: "",
      notes: ""
    },

    {
      id: "kit-paper-towel-natural",
      category: "fabrication-kits",
      name: "Paper Towel Holder Kit — Natural/Beige",
      productId: "macrame-paper-towel-holder",
      color: "Natural/Beige",
      tracking: "quantity",
      quantity: 0,
      reorderAt: 2,
      preferredStock: 5,
      restockType: "make",
      contents: ["4 precut cords", "1 wooden ring", "2 end caps"],
      notes: "Paper towel dowel is stored separately."
    },
    {
      id: "kit-toilet-paper-natural",
      category: "fabrication-kits",
      name: "Toilet Paper Holder Kit — Natural/Beige",
      productId: "macrame-toilet-paper-holder",
      color: "Natural/Beige",
      tracking: "quantity",
      quantity: 0,
      reorderAt: 2,
      preferredStock: 5,
      restockType: "make",
      contents: ["Precut cord", "1 wooden ring"],
      notes: ""
    },
    {
      id: "kit-oven-door-natural",
      category: "fabrication-kits",
      name: "Oven-Door Towel Holder Kit — Natural",
      productId: "crochet-oven-door-towel-holder",
      color: "Natural",
      tracking: "quantity",
      quantity: 0,
      reorderAt: 2,
      preferredStock: 5,
      restockType: "make",
      contents: ["Prepared yarn and required notions"],
      notes: ""
    },

    {
      id: "finished-paper-towel-natural",
      category: "finished-inventory",
      name: "Paper Towel Holder — Natural/Beige",
      productId: "macrame-paper-towel-holder",
      color: "Natural/Beige",
      tracking: "quantity",
      quantity: 0,
      reorderAt: 1,
      preferredStock: 3,
      restockType: "make",
      notes: ""
    },
    {
      id: "finished-toilet-paper-natural",
      category: "finished-inventory",
      name: "Toilet Paper Holder — Natural/Beige",
      productId: "macrame-toilet-paper-holder",
      color: "Natural/Beige",
      tracking: "quantity",
      quantity: 0,
      reorderAt: 1,
      preferredStock: 3,
      restockType: "make",
      notes: ""
    },
    {
      id: "finished-oven-door-natural",
      category: "finished-inventory",
      name: "Oven-Door Towel Holder — Natural",
      productId: "crochet-oven-door-towel-holder",
      color: "Natural",
      tracking: "quantity",
      quantity: 0,
      reorderAt: 1,
      preferredStock: 3,
      restockType: "make",
      notes: ""
    },

    {
      id: "poly-mailer-large",
      category: "packaging",
      name: "Large Poly Mailers — Paper Towel Holder",
      tracking: "quantity",
      quantity: 0,
      reorderAt: 10,
      preferredStock: 40,
      restockType: "purchase",
      supplier: "",
      purchaseUrl: "",
      notes: "One paper towel holder per mailer."
    },
    {
      id: "poly-mailer-standard",
      category: "packaging",
      name: "Standard Poly Mailers — Toilet Paper & Oven-Door",
      tracking: "quantity",
      quantity: 0,
      reorderAt: 10,
      preferredStock: 40,
      restockType: "purchase",
      supplier: "",
      purchaseUrl: "",
      notes: ""
    },
    {
      id: "address-labels",
      category: "packaging",
      name: "Address / Shipping Labels",
      tracking: "quantity",
      quantity: 0,
      reorderAt: 20,
      preferredStock: 100,
      restockType: "purchase",
      supplier: "",
      purchaseUrl: "",
      notes: ""
    },

    {
      id: "paper-towel-tags",
      category: "print-supplies",
      name: "Paper Towel Holder Tags",
      tracking: "quantity",
      quantity: 7,
      reorderAt: 10,
      preferredStock: 30,
      restockType: "print",
      resourceUrl: "",
      notes: ""
    },
    {
      id: "toilet-paper-tags",
      category: "print-supplies",
      name: "Toilet Paper Holder Tags",
      tracking: "quantity",
      quantity: 10,
      reorderAt: 10,
      preferredStock: 30,
      restockType: "print",
      resourceUrl: "",
      notes: ""
    },
    {
      id: "oven-door-tags",
      category: "print-supplies",
      name: "Oven-Door Towel Holder Tags",
      tracking: "quantity",
      quantity: 10,
      reorderAt: 10,
      preferredStock: 30,
      restockType: "print",
      resourceUrl: "",
      notes: ""
    },
    {
      id: "care-sheets",
      category: "print-supplies",
      name: "Care Instruction Sheets",
      tracking: "quantity",
      quantity: 11,
      reorderAt: 10,
      preferredStock: 30,
      restockType: "print",
      resourceUrl: "",
      notes: "Shared by all three products."
    },
    {
      id: "company-stickers",
      category: "print-supplies",
      name: "Simply Ummiby Company Stickers",
      tracking: "quantity",
      quantity: 0,
      reorderAt: 15,
      preferredStock: 50,
      restockType: "print",
      resourceUrl: "",
      notes: ""
    }
  ]
};