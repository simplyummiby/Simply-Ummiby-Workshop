window.SUW_PRODUCT_MASTERS = [
  {
    id: "macrame-paper-towel-holder",
    name: "Macramé Paper Towel Holder",
    shortName: "Paper Towel Holder",
    craft: "Macramé",
    status: "Active",
    imageData: "",
    colors: ["Natural/Beige","White","Black","Gray","Midnight Blue","Forest Green","Chocolate Brown","Dusty Rose","Blush Pink","Watermelon Pink","Berry Pink","Wine Red"],
    recipeId: "macrame-paper-towel-holder",
    packaging: {
      mailerType: "Large Poly Mailer",
      productTagInventoryId: "paper-towel-tags",
      careSheetInventoryId: "care-sheets",
      companyStickerInventoryId: "company-stickers",
      notes: "One paper towel holder per mailer. Two or more paper towel holders require separate mailers."
    },
    materials: [
      { inventoryItemId: "prepared-cord-paper-towel-natural", quantity: 1, role: "kit", colorSpecific: true },
      { inventoryItemId: "wood-rings", quantity: 1, role: "kit", colorSpecific: false },
      { inventoryItemId: "prepared-paper-towel-dowels", quantity: 1, role: "separate", colorSpecific: false }
    ],
    kitDefinition: {
      inventoryItemId: "kit-paper-towel-natural",
      contents: [
        { inventoryItemId: "prepared-cord-paper-towel-natural", quantity: 1 },
        { inventoryItemId: "wood-rings", quantity: 1 }
      ],
      separateMaterials: [
        { inventoryItemId: "prepared-paper-towel-dowels", quantity: 1 }
      ]
    }
  },
  {
    id: "macrame-toilet-paper-holder",
    name: "Macramé Toilet Paper Holder",
    shortName: "Toilet Paper Holder",
    craft: "Macramé",
    status: "Active",
    imageData: "",
    colors: ["Natural/Beige","White","Black","Gray","Midnight Blue","Forest Green","Chocolate Brown","Dusty Rose","Blush Pink","Watermelon Pink","Berry Pink","Wine Red"],
    recipeId: "macrame-toilet-paper-holder",
    packaging: {
      mailerType: "Standard Poly Mailer",
      productTagInventoryId: "toilet-paper-tags",
      careSheetInventoryId: "care-sheets",
      companyStickerInventoryId: "company-stickers",
      notes: ""
    },
    materials: [
      { inventoryItemId: "prepared-cord-toilet-paper-natural", quantity: 1, role: "kit", colorSpecific: true },
      { inventoryItemId: "wood-rings", quantity: 1, role: "kit", colorSpecific: false }
    ],
    kitDefinition: {
      inventoryItemId: "kit-toilet-paper-natural",
      contents: [
        { inventoryItemId: "prepared-cord-toilet-paper-natural", quantity: 1 },
        { inventoryItemId: "wood-rings", quantity: 1 }
      ],
      separateMaterials: []
    }
  },
  {
    id: "crochet-oven-door-towel-holder",
    name: "Crochet Oven-Door Towel Holder",
    shortName: "Oven-Door Towel Holder",
    craft: "Crochet",
    status: "Active",
    imageData: "",
    colors: ["Natural"],
    recipeId: "crochet-oven-door-towel-holder",
    packaging: {
      mailerType: "Standard Poly Mailer",
      productTagInventoryId: "oven-door-tags",
      careSheetInventoryId: "care-sheets",
      companyStickerInventoryId: "company-stickers",
      notes: ""
    },
    materials: [],
    kitDefinition: {
      inventoryItemId: "kit-oven-door-natural",
      contents: [],
      separateMaterials: []
    }
  }
];