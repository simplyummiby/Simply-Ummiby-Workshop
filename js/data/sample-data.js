window.SUW_SAMPLE_DATA = {
  version: "0.6.4",
  products: [
    {
      id: "macrame-paper-towel-holder",
      name: "Macramé Paper Towel Holder",
      shortName: "Paper Towel Holder",
      colors: ["Natural/Beige","White","Black","Gray","Midnight Blue","Forest Green","Chocolate Brown","Dusty Rose","Blush Pink","Watermelon Pink","Berry Pink","Wine Red"],
      materials: [
        { id: "cord", name: "Macramé cord", defaultStatus: "Available" },
        { id: "wood-ring", name: "Wooden ring", defaultStatus: "Available" },
        { id: "wood-dowel", name: "Wooden dowel", defaultStatus: "Available" },
        { id: "end-caps", name: "End caps (2)", defaultStatus: "Available" }
      ],
      manufacturingSections: [
        {
          title: "Macramé",
          steps: [
            "Review the order and custom notes",
            "Prepare and arrange the cord",
            "Mount the work",
            "Complete the macramé pattern",
            "Adjust spacing and straighten the work",
            "Trim and finish the cord"
          ]
        },
        {
          title: "Assembly",
          steps: [
            "Attach the wooden ring",
            "Install the wooden dowel",
            "Install both end caps",
            "Complete a final visual inspection"
          ]
        }
      ],
      packingChecklist: [
        "Confirm this item is finished",
        "Attach the Paper Towel Holder product tag",
        "Place the item in its paper-towel-holder poly mailer",
        "Mark this item packed"
      ]
    },
    {
      id: "macrame-toilet-paper-holder",
      name: "Macramé Toilet Paper Holder",
      shortName: "Toilet Paper Holder",
      colors: ["Natural/Beige","White","Black","Gray","Midnight Blue","Forest Green","Chocolate Brown","Dusty Rose","Blush Pink","Watermelon Pink","Berry Pink","Wine Red"],
      materials: [
        { id: "cord", name: "Macramé cord", defaultStatus: "Available" },
        { id: "wood-ring", name: "Wooden ring", defaultStatus: "Available" }
      ],
      manufacturingSections: [
        {
          title: "Macramé",
          steps: [
            "Review the order and custom notes",
            "Prepare and arrange the cord",
            "Mount the work",
            "Complete the macramé pattern",
            "Adjust spacing and straighten the work",
            "Trim and finish the cord"
          ]
        },
        {
          title: "Assembly",
          steps: [
            "Attach the wooden ring",
            "Complete a final visual inspection"
          ]
        }
      ],
      packingChecklist: [
        "Confirm this item is finished",
        "Attach the Toilet Paper Holder product tag",
        "Place the item in the standard poly mailer",
        "Mark this item packed"
      ]
    },
    {
      id: "crochet-oven-door-towel-holder",
      name: "Crochet Oven-Door Towel Holder",
      shortName: "Oven-Door Towel Holder",
      colors: ["Natural"],
      materials: [
        { id: "yarn", name: "Yarn", defaultStatus: "Available" },
        { id: "hook", name: "Crochet hook", defaultStatus: "Available" },
        { id: "notions", name: "Required notions", defaultStatus: "Available" }
      ],
      manufacturingSections: [
        {
          title: "Crochet",
          steps: [
            "Review the order and custom notes",
            "Confirm the stitch pattern and starting count",
            "Crochet the main towel-holder section",
            "Complete the fastening section",
            "Weave in and secure all ends"
          ]
        },
        {
          title: "Finishing",
          steps: [
            "Check the shape and size",
            "Check the fastening",
            "Complete a final visual inspection"
          ]
        }
      ],
      packingChecklist: [
        "Confirm this item is finished",
        "Attach the Oven-Door Towel Holder product tag",
        "Place the item in the standard poly mailer",
        "Mark this item packed"
      ]
    }
  ],
  inventory: [
    { id: "end-caps", name: "End caps", quantity: 4, minimum: 4, category: "Purchase to Restock" },
    { id: "wood-rings", name: "Wood rings", quantity: 18, minimum: 8, category: "Purchase to Restock" },
    { id: "paper-towel-tags", name: "Paper towel holder tags", quantity: 7, minimum: 10, category: "Print to Restock" },
    { id: "toilet-paper-tags", name: "Toilet paper holder tags", quantity: 10, minimum: 10, category: "Print to Restock" },
    { id: "oven-door-tags", name: "Oven-door towel holder tags", quantity: 10, minimum: 10, category: "Print to Restock" },
    { id: "care-sheets", name: "Care instruction sheets", quantity: 11, minimum: 10, category: "Print to Restock" }
  ],
  orders: [],
  activity: [
    { text: "Simply Ummiby Workshop v0.6.4 is ready", time: "Today" }
  ],
  settings: {
    lastOpenedOrderId: null,
    lastOpenedItemId: null,
    externalLinks: {
      etsyOrders: "https://www.etsy.com/your/orders/sold",
      etsyCompleted: "https://www.etsy.com/your/orders/sold?order_status=completed",
      shippo: "https://app.goshippo.com/",
      cricut: "https://design.cricut.com/"
    }
  }
};