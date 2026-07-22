(() => {
  const STORAGE_KEY = "simplyUmmibyWorkshopData";
  const VERSION = "0.8.3.2";
  const ITEM_STATUSES = ["New","Preparing","Manufacturing","Waiting on Material","Ready for Packing","Packed","Ready to Mail","Completed"];
  const STATUS_PROGRESS = {
    "New": 5, "Preparing": 20, "Manufacturing": 50, "Waiting on Material": 35,
    "Ready for Packing": 70, "Packed": 85, "Ready to Mail": 95, "Completed": 100
  };
  const DEFAULT_PRODUCT_CATEGORIES = [
    {id:"paper-towel-holders",name:"Paper Towel Holders",codePrefix:"M-PTH",defaultCraft:"Macramé",status:"Active",notes:"Macramé paper towel holder products."},
    {id:"toilet-paper-holders",name:"Toilet Paper Holders",codePrefix:"M-TPH",defaultCraft:"Macramé",status:"Active",notes:"Macramé toilet paper holder products."},
    {id:"oven-door-towel-holders",name:"Oven Door Towel Holders",codePrefix:"C-ODTH",defaultCraft:"Crochet",status:"Active",notes:"Crochet oven-door towel holder products."}
  ];

  const data = loadData();
  syncInventoryProductLinks();
  saveData();
  const viewContainer = document.getElementById("viewContainer");
  const pageTitle = document.getElementById("pageTitle");
  const sidebar = document.getElementById("sidebar");
  let currentWorkshopFilter = "Active";
  let orderSearch = "";
  let orderStageFilter = "All";
  let orderShipFilter = "All";
  let orderSort = "ship-date";
  let productsModuleView = "catalog";
  let productCatalogCategoryFilter = "All";
  let productCatalogCraftFilter = "All";
  let productCatalogSort = "craft-category-name";
  let recipeCategoryFilter = "All";
  let recipeCraftFilter = "All";
  let recipeStatusFilter = "All";
  let recipeSearch = "";
  let recipeSort = "craft-category-name";
  let editingOrderId = null;
  let inventoryViewState = {
    category: "overview", search: "", craft: "All", materialType: "All", itemType: "All", supplier: "All",
    stock: "All", lifecycle: "Active", sort: "name-asc", group: "none"
  };

  const viewContent = {
    inventory: { title: "Inventory", copy: "Track yarn and cord, accessories, ready packs, finished products, packaging, and branded print supplies.", card: "Purchase to Restock is now working. Full counted inventory and deductions arrive in Version 0.5." },
    products: { title: "Products & Recipes", copy: "Each product now supplies its preparation, manufacturing, and packing checklists.", card: "Recipe editing will be added later. The current recipes are stored in js/data/sample-data.js." },
    resources: { title: "Resources", copy: "Your print-and-link toolbox for Etsy, Shippo, Cricut Design Space, care instructions, packing slips, and supplier links.", card: "The Processing workspace already includes working external shortcuts and a temporary printable care sheet." },
    settings: { title: "Settings", copy: "Manage stock thresholds, shop preferences, backups, and future Google Drive integration.", card: "Version 0.3 stores all workflow progress locally and supports downloadable JSON backups." }
  };

  function uid(prefix = "id") {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function loadData() {
    let parsed;
    try { parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (_) {}
    const initial = parsed || structuredClone(window.SUW_SAMPLE_DATA);
    initial.version = VERSION;
    initial.products = mergeProducts(initial.products || [], window.SUW_SAMPLE_DATA.products);
    initial.inventory ||= structuredClone(window.SUW_SAMPLE_DATA.inventory);
    initial.orders ||= [];
    initial.activity ||= [];
    initial.settings ||= {};
    initial.settings.lastOpenedOrderId ||= null;
    initial.settings.lastOpenedItemId ||= null;
    initial.settings.externalLinks = {
      ...window.SUW_SAMPLE_DATA.settings.externalLinks,
      ...(initial.settings.externalLinks || {})
    };

    initial.inventoryCatalog = migrateInventoryCatalog(initial.inventoryCatalog, initial.inventory);
    initial.inventoryMaterialTypes = migrateInventoryMaterialTypes(initial.inventoryMaterialTypes, initial.inventoryCatalog.items);
    initial.inventoryCatalog.items.forEach(item => migrateYarnTracking(item));
    initial.suppliers = migrateSuppliers(initial.suppliers, initial.inventoryCatalog.items);
    initial.inventoryTransactions ||= [];
    initial.productMasters = migrateProductMasters(initial.productMasters);
    initial.recipes = migrateRecipes(initial.recipes, initial.productMasters);
    initial.productCategoryCatalog = migrateProductCategoryCatalog(initial.productCategoryCatalog, initial.productMasters);
    initial.productMasters.forEach(master => {
      master.categoryId ||= inferProductCategoryId(master);
    });
    initial.colorCatalog = migrateColorCatalog(initial.colorCatalog, initial.productMasters);
    initial.productMasters.forEach(master => {
      if (!Array.isArray(master.colorIds) || !master.colorIds.length) {
        master.colorIds = (master.colors || []).map(name => colorByNameFrom(initial.colorCatalog,name)?.id).filter(Boolean);
      }
      master.colors = master.colorIds.map(id => initial.colorCatalog.find(color => color.id === id)?.name).filter(Boolean);
    });
    initial.products = initial.productMasters.map(master => ({
      id: master.id,
      name: master.name,
      colors: master.colors || []
    }));

    initial.orders = initial.orders.map(order => ({
      id: order.id || uid("order"),
      customerName: order.customerName || "Unnamed Customer",
      etsyOrderNumber: order.etsyOrderNumber || "",
      shipByDate: order.shipByDate || "",
      notes: order.notes || "",
      status: order.status || calculateOrderStatus(order.items || []),
      createdAt: order.createdAt || new Date().toISOString(),
      updatedAt: order.updatedAt || order.createdAt || new Date().toISOString(),
      shipping: {
        careSheetPrinted: Boolean(order.shipping?.careSheetPrinted),
        packingSlipPrinted: Boolean(order.shipping?.packingSlipPrinted),
        shippoOpened: Boolean(order.shipping?.shippoOpened),
        labelAttached: Boolean(order.shipping?.labelAttached),
        companyStickerAttached: Boolean(order.shipping?.companyStickerAttached),
        mailerSealed: Boolean(order.shipping?.mailerSealed),
        packedAt: order.shipping?.packedAt || null,
        mailedAt: order.shipping?.mailedAt || null,
        shipDate: order.shipping?.shipDate || (order.shipping?.mailedAt ? String(order.shipping.mailedAt).slice(0,10) : null),
        productTagChecks: { ...(order.shipping?.productTagChecks || {}) },
        inventoryTaskTransactions: { ...(order.shipping?.inventoryTaskTransactions || {}) }
      },
      items: (order.items || []).map((item, index) => migrateItem(item, index))
    }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  function mergeProducts(existing, defaults) {
    return defaults.map(def => ({
      ...def,
      ...(existing.find(p => p.id === def.id) || {}),
      materials: def.materials,
      manufacturingSections: def.manufacturingSections,
      packingChecklist: def.packingChecklist
    }));
  }


  function migrateInventoryCatalog(savedCatalog, legacyInventory) {
    const defaults = structuredClone(window.SUW_INVENTORY_CATALOG);
    const savedItems = savedCatalog?.items || [];
    const legacyMap = new Map((legacyInventory || []).map(item => [item.id, item]));

    defaults.items = defaults.items.map(defaultItem => {
      const saved = savedItems.find(item => item.id === defaultItem.id);
      const legacy = legacyMap.get(defaultItem.id);
      const merged = {...defaultItem, ...(legacy || {}), ...(saved || {})};
      merged.id = defaultItem.id;
      merged.category = defaultItem.category;
      merged.name = defaultItem.id === "care-sheets" && ["Care Instruction Sheets","Care Instruction Sheet"].includes(saved?.name)
        ? defaultItem.name
        : (saved?.name || defaultItem.name);
      merged.materialType = saved?.materialType || defaultItem.materialType || "Other";
      merged.craft = saved?.craft || defaultItem.craft || "Shared";
      merged.imageData = saved?.imageData || defaultItem.imageData || "";
      merged.linkedProductIds = saved?.linkedProductIds || defaultItem.linkedProductIds || [];
      merged.components = defaultItem.components || saved?.components || [];
      merged.status = saved?.status || defaultItem.status || "Active";
      return merged;
    });

    savedItems.forEach(item => {
      if (defaults.items.some(existing => existing.id === item.id)) return;
      const migrated = { ...item };
      if (migrated.category === "raw-materials") {
        const type = String(migrated.materialType || "").toLowerCase();
        const name = String(migrated.name || "").toLowerCase();
        if (migrated.restockType === "make" || type.includes("prepared") || type.includes("kit")) {
          migrated.category = "prepared-components";
        } else if (type.includes("cord") || type.includes("yarn") || name.includes("cord") || name.includes("yarn")) {
          migrated.category = "yarn-cord";
        } else {
          migrated.category = "accessories";
        }
      } else if (migrated.category === "fabrication-kits") {
        migrated.category = "prepared-components";
      } else if (migrated.category === "print-supplies") {
        migrated.category = "print-branding";
      }
      migrated.status ||= "Active";
      defaults.items.push(migrated);
    });

    return defaults;
  }

  function slugifyMaterialType(value) {
    return String(value || "material-type").trim().toLowerCase().replace(/&/g,"and").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || uid("material-type");
  }

  function defaultInventoryMaterialTypes() {
    return [
      {id:"yarn-cord",name:"Yarn & Cord",categoryId:"yarn-cord",showAsTab:true,status:"Active"},
      {id:"wood",name:"Wood",categoryId:"accessories",showAsTab:true,status:"Active"},
      {id:"hardware",name:"Hardware",categoryId:"accessories",showAsTab:true,status:"Active"},
      {id:"ready-pack",name:"Ready Pack",categoryId:"prepared-components",showAsTab:false,status:"Active"},
      {id:"kit",name:"Kit",categoryId:"prepared-components",showAsTab:false,status:"Active"},
      {id:"finished-product",name:"Finished Product",categoryId:"finished-inventory",showAsTab:false,status:"Active"},
      {id:"mailer",name:"Mailer",categoryId:"packaging",showAsTab:false,status:"Active"},
      {id:"label",name:"Label",categoryId:"packaging",showAsTab:false,status:"Active"},
      {id:"care-sheet",name:"Care Sheet",categoryId:"print-branding",showAsTab:false,status:"Active"},
      {id:"product-tag",name:"Product Tag",categoryId:"print-branding",showAsTab:false,status:"Active"},
      {id:"sticker",name:"Sticker",categoryId:"print-branding",showAsTab:false,status:"Active"}
    ];
  }

  function migrateInventoryMaterialTypes(savedTypes, items) {
    const records = Array.isArray(savedTypes) ? structuredClone(savedTypes) : defaultInventoryMaterialTypes();
    const byName = new Map(records.map(type => [String(type.name || "").toLowerCase(), type]));
    const cordAlias = byName.get("cord/yarn");
    if (cordAlias) cordAlias.name = "Yarn & Cord";
    const preparedAlias = byName.get("prepared component");
    if (preparedAlias) { preparedAlias.name = "Ready Pack"; preparedAlias.id = "ready-pack"; byName.set("ready pack", preparedAlias); }
    const kitAlias = byName.get("kit");
    if (kitAlias) kitAlias.status = "Inactive";
    (items || []).forEach(item => {
      if (item.materialType === "Cord/Yarn") item.materialType = "Yarn & Cord";
      if (["Prepared Component","Kit"].includes(item.materialType)) item.materialType = "Ready Pack";
      const name = String(item.materialType || "").trim();
      if (!name) return;
      if (byName.has(name.toLowerCase())) return;
      const categoryId = item.category || "accessories";
      const showAsTab = ["yarn-cord","accessories"].includes(categoryId);
      const record = {id:slugifyMaterialType(name),name,categoryId,showAsTab,status:"Active"};
      records.push(record);
      byName.set(name.toLowerCase(),record);
    });
    return records;
  }

  function inventoryMaterialTypes() { return data.inventoryMaterialTypes || []; }
  function inventoryMaterialTypeByName(name) { return inventoryMaterialTypes().find(type => type.name === name); }
  function visibleMaterialTypeTabs() { return inventoryMaterialTypes().filter(type => type.status !== "Inactive" && type.showAsTab).sort((a,b) => a.name.localeCompare(b.name)); }

  function normalizeExternalUrl(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const parsed = new URL(withProtocol);
      if (!/^https?:$/.test(parsed.protocol)) return "";
      return parsed.href;
    } catch (error) {
      return "";
    }
  }

  function normalizeSupplierWebsite(value) {
    const normalized = normalizeExternalUrl(value);
    if (!normalized) return "";
    try {
      const parsed = new URL(normalized);
      return `${parsed.origin}/`;
    } catch (error) {
      return "";
    }
  }

  function migrateSuppliers(savedSuppliers, items) {
    const suppliers = Array.isArray(savedSuppliers) ? structuredClone(savedSuppliers) : [];
    suppliers.forEach(supplier => {
      supplier.website = normalizeSupplierWebsite(supplier.website);
    });
    const byName = new Map(suppliers.map(supplier => [String(supplier.name || "").trim().toLowerCase(), supplier]));
    (items || []).forEach(item => {
      const legacyName = String(item.supplier || "").trim();
      if (!item.supplierId && legacyName) {
        const key = legacyName.toLowerCase();
        let supplier = byName.get(key);
        if (!supplier) {
          supplier = {
            id: uid("supplier"),
            name: legacyName,
            website: normalizeSupplierWebsite(item.purchaseUrl),
            contactName: "",
            email: "",
            phone: "",
            leadTimeDays: "",
            minimumOrder: "",
            freeShippingThreshold: "",
            status: "Active",
            notes: ""
          };
          suppliers.push(supplier);
          byName.set(key, supplier);
        }
        item.supplierId = supplier.id;
      }
      const linked = suppliers.find(supplier => supplier.id === item.supplierId);
      item.supplier = linked?.name || legacyName || "";
    });
    return suppliers;
  }

  function suppliers() { return data.suppliers || []; }
  function supplierById(id) { return suppliers().find(supplier => supplier.id === id); }
  function supplierNameForItem(item) { return supplierById(item?.supplierId)?.name || item?.supplier || ""; }
  function itemsForSupplier(supplierId) { return inventoryItems().filter(item => item.supplierId === supplierId); }

  const YARN_LEVELS = ["Full","¾ Full","½ Full","¼ Full","Low","Scrap"];
  function isYarnOrCord(item) {
    const type = String(item?.materialType || "").toLowerCase();
    return type.includes("yarn") || type.includes("cord") || item?.category === "yarn-cord";
  }
  function migrateYarnTracking(item) {
    if (!isYarnOrCord(item)) return item;
    item.yarnTrackingMode ||= "simple";
    item.yarnApproximateLevel ||= item.condition === "Getting Low" ? "Low" : "Full";
    item.yarnLengthUnit ||= "yd";
    item.yarnOriginalLength = Number(item.yarnOriginalLength || 0);
    item.yarnRemainingLength = Number(item.yarnRemainingLength || 0);
    item.yarnUsageHistory = Array.isArray(item.yarnUsageHistory) ? item.yarnUsageHistory : [];
    // v0.8.3.2 repair: precise records created with an original length but a blank
    // remaining field were previously saved as zero. Only repair untouched records
    // so a genuinely depleted roll with usage history is never replenished.
    if (item.yarnTrackingMode === "precise" && item.yarnOriginalLength > 0 && item.yarnRemainingLength === 0 && item.yarnUsageHistory.length === 0) {
      item.yarnRemainingLength = item.yarnOriginalLength;
    }
    return item;
  }
  function yarnTrackingLabel(item) {
    if (!isYarnOrCord(item)) return "";
    const mode = item.yarnTrackingMode || "simple";
    if (mode === "precise") return `${formatInventoryNumber(item.yarnRemainingLength)} ${item.yarnLengthUnit || "yd"} remaining`;
    if (mode === "approximate") return `Approximate: ${item.yarnApproximateLevel || "Not set"}`;
    return item.tracking === "quantity" ? `${Number(item.quantity || 0)} roll${Number(item.quantity || 0) === 1 ? "" : "s"}` : (item.condition || "Available");
  }
  function formatInventoryNumber(value) {
    const number = Number(value || 0);
    return Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }

  function inventoryItems() {
    return data.inventoryCatalog?.items || [];
  }

  function activeInventoryItems() {
    return inventoryItems().filter(item => item.status !== "Archived");
  }

  function inventoryCategories() {
    return data.inventoryCatalog?.categories || [];
  }

  function inventoryItemById(id) {
    return inventoryItems().find(item => item.id === id);
  }

  function inventoryStatus(item) {
    if (isYarnOrCord(item)) {
      const mode = item.yarnTrackingMode || "simple";
      if (mode === "precise") {
        const remaining = Number(item.yarnRemainingLength || 0);
        const original = Number(item.yarnOriginalLength || 0);
        if (remaining <= 0) return "Out";
        if (original > 0 && remaining / original <= 0.25) return "Low";
        return "Good";
      }
      if (mode === "approximate") {
        const level = item.yarnApproximateLevel || "Full";
        if (["¼ Full","Low","Scrap"].includes(level)) return "Low";
        return "Good";
      }
    }
    if (item.tracking === "condition") {
      if (item.condition === "Out") return "Out";
      if (["Replace Soon","Getting Low"].includes(item.condition)) return "Low";
      return "Good";
    }
    const quantity = Number(item.quantity || 0);
    const reorderAt = Number(item.reorderAt || 0);
    if (quantity <= 0) return "Out";
    if (quantity <= reorderAt) return "Low";
    return "Good";
  }

  function inventoryNeedsAttention(item) {
    return inventoryStatus(item) !== "Good";
  }

  function inventoryNeedsCount(item) {
    return item?.status !== "Archived" && item?.tracking === "quantity" && !item.lastCountedAt;
  }

  function inventoryAttentionSummary(items = activeInventoryItems()) {
    return items.reduce((summary,item) => {
      const status = inventoryStatus(item);
      summary.total += 1;
      summary[status.toLowerCase()] += 1;
      if (inventoryNeedsCount(item)) summary.needsCount += 1;
      return summary;
    }, {total:0,good:0,low:0,out:0,needsCount:0});
  }

  function inventoryRestockBuckets(items = activeInventoryItems().filter(inventoryNeedsAttention)) {
    const buckets = {print:[],purchase:[],make:[]};
    items.forEach(item => (buckets[item.restockType] || buckets.purchase).push(item));
    Object.values(buckets).forEach(bucket => bucket.sort((a,b) => statusRank(inventoryStatus(a)) - statusRank(inventoryStatus(b)) || String(a.name||"").localeCompare(String(b.name||""))));
    return buckets;
  }

  function categoryTotal(categoryId) {
    return inventoryItems()
      .filter(item => item.category === categoryId)
      .reduce((sum,item) => sum + (item.tracking === "quantity" ? Number(item.quantity || 0) : 0), 0);
  }


  function productNameById(productId) {
    return data.products.find(product => product.id === productId)?.name || productId;
  }

  function kitItems() {
    return activeInventoryItems().filter(item => item.category === "prepared-components");
  }

  function allocatedInKits(rawItemId) {
    return kitItems().reduce((total, kit) => {
      const component = (kit.components || []).find(entry => entry.itemId === rawItemId);
      return total + (component ? Number(component.quantity || 0) * Number(kit.quantity || 0) : 0);
    }, 0);
  }

  function totalOwned(item) {
    if (item.tracking !== "quantity") return null;
    return Number(item.quantity || 0) + allocatedInKits(item.id);
  }

  function recordInventoryTransaction({
    type,itemId,quantity,reason,details = "",relatedItemId = "",
    orderId = "",etsyOrderNumber = "",orderItemId = "",checklistTaskId = "",
    source = "",relatedTransactionId = ""
  }) {
    const item = inventoryItemById(itemId);
    const transaction = {
      id: uid("txn"),
      createdAt: new Date().toISOString(),
      type,
      itemId,
      itemName: item?.name || itemId,
      quantity: Number(quantity || 0),
      reason: reason || "",
      details,
      relatedItemId,
      orderId,
      etsyOrderNumber,
      orderItemId,
      checklistTaskId,
      source,
      relatedTransactionId
    };
    data.inventoryTransactions.unshift(transaction);
    data.inventoryTransactions = data.inventoryTransactions.slice(0,250);
    return transaction;
  }

  function mailerInventoryIdForProduct(productId) {
    const master = productMasterById(productId);
    const mailerType = String(master?.packaging?.mailerType || "").toLowerCase();
    if (mailerType.includes("large")) return "poly-mailer-large";
    if (mailerType.includes("standard") || mailerType.includes("small")) return "poly-mailer-standard";
    return "";
  }

  function companyStickerInventoryIdForOrder(order) {
    const configured = (order?.items || [])
      .map(item => productMasterById(item.productId)?.packaging?.companyStickerInventoryId)
      .filter(Boolean);
    return configured[0] || "company-stickers";
  }

  function careSheetInventoryIdForOrder(order) {
    const configured = (order?.items || [])
      .map(item => productMasterById(item.productId)?.packaging?.careSheetInventoryId)
      .filter(Boolean);
    return configured[0] || "care-sheets";
  }

  function productTagGroupsForOrder(order) {
    const groups = new Map();
    (order?.items || []).forEach(item => {
      const master = productMasterById(item.productId);
      const inventoryItemId = master?.packaging?.productTagInventoryId || "";
      const color = item.color || "Not specified";
      const groupKey = `${item.productId}::${color}`;
      const existing = groups.get(groupKey) || {
        groupKey,
        taskKey:`shipping-product-tag-${encodeURIComponent(item.productId)}-${encodeURIComponent(color)}`,
        productId:item.productId,
        productName:master?.name || item.productName,
        shortName:master?.shortName || item.productName,
        color,
        inventoryItemId,
        quantity:0,
        orderItemIds:[]
      };
      existing.quantity += 1;
      existing.orderItemIds.push(item.id);
      groups.set(groupKey,existing);
    });
    return [...groups.values()];
  }

  function restoreProductTagTasksForOrder(order) {
    productTagGroupsForOrder(order).forEach(group => {
      if (order.shipping?.productTagChecks?.[group.taskKey]) {
        restoreInventoryForTask({order,taskKey:group.taskKey,label:"Product tag"});
      }
    });
    order.shipping.productTagChecks = {};
  }

  function inventoryTaskStore(order,item) {
    if (item) {
      item.workflow.inventoryTaskTransactions ||= {};
      return item.workflow.inventoryTaskTransactions;
    }
    order.shipping.inventoryTaskTransactions ||= {};
    return order.shipping.inventoryTaskTransactions;
  }

  function consumeInventoryForTask({order,item=null,taskKey,inventoryItemId,quantity=1,label}) {
    const store = inventoryTaskStore(order,item);
    const existingId = store[taskKey];
    if (existingId && data.inventoryTransactions.some(tx => tx.id === existingId && tx.quantity < 0)) return true;
    const inventoryItem = inventoryItemById(inventoryItemId);
    if (!inventoryItem || inventoryItem.tracking !== "quantity") {
      showToast(`${label} is not linked to a valid counted inventory item.`);
      return false;
    }
    quantity = Math.max(1,Number(quantity || 1));
    if (Number(inventoryItem.quantity || 0) < quantity) {
      showToast(`${inventoryItem.name} is out of stock. Add inventory before completing this step.`);
      return false;
    }
    inventoryItem.quantity = Number(inventoryItem.quantity || 0) - quantity;
    const tx = recordInventoryTransaction({
      type:"consume",
      itemId:inventoryItem.id,
      quantity:-quantity,
      reason:"Pack & Ship",
      details:`Used ${quantity} ${inventoryItem.name} for Etsy order ${order.etsyOrderNumber || order.id}.`,
      relatedItemId:item?.id || order.id,
      orderId:order.id,
      etsyOrderNumber:order.etsyOrderNumber || "",
      orderItemId:item?.id || "",
      checklistTaskId:taskKey,
      source:"pack-and-ship"
    });
    store[taskKey] = tx.id;
    return true;
  }

  function restoreInventoryForTask({order,item=null,taskKey,label}) {
    const store = inventoryTaskStore(order,item);
    const transactionId = store[taskKey];
    if (!transactionId) return { restored:false, legacy:true };
    const original = data.inventoryTransactions.find(tx => tx.id === transactionId);
    if (!original || original.quantity >= 0) {
      delete store[taskKey];
      return { restored:false, legacy:true };
    }
    const inventoryItem = inventoryItemById(original.itemId);
    if (!inventoryItem || inventoryItem.tracking !== "quantity") {
      showToast(`${label} could not be returned because its inventory item is missing.`);
      return { restored:false, error:true };
    }
    const quantity = Math.abs(Number(original.quantity || 0));
    inventoryItem.quantity = Number(inventoryItem.quantity || 0) + quantity;
    const reversal = recordInventoryTransaction({
      type:"restore",
      itemId:inventoryItem.id,
      quantity,
      reason:"Pack & Ship reversal",
      details:`Returned ${quantity} ${inventoryItem.name} from Etsy order ${order.etsyOrderNumber || order.id}.`,
      relatedItemId:item?.id || order.id,
      orderId:order.id,
      etsyOrderNumber:order.etsyOrderNumber || "",
      orderItemId:item?.id || "",
      checklistTaskId:taskKey,
      source:"pack-and-ship",
      relatedTransactionId:original.id
    });
    original.reversedByTransactionId = reversal.id;
    delete store[taskKey];
    return { restored:true, quantity, itemName:inventoryItem.name };
  }

  function packingInventoryConfig(item,index,label) {
    if (!/poly mailer/i.test(label)) return null;
    const inventoryItemId = mailerInventoryIdForProduct(item.productId);
    return inventoryItemId ? { taskKey:`packing-mailer-${index}`, inventoryItemId, quantity:1 } : null;
  }
  function restoreAllInventoryTasksForItem(order,item) {
    if (item?.workflow?.preparedDowelReady) returnPreparedDowel(order,item);
    const keys = Object.keys(item?.workflow?.inventoryTaskTransactions || {});
    keys.forEach(taskKey => restoreInventoryForTask({order,item,taskKey,label:"Packing supply"}));
  }

  function restoreAllInventoryTasksForOrder(order) {
    (order?.items || []).forEach(item => restoreAllInventoryTasksForItem(order,item));
    Object.keys(order?.shipping?.inventoryTaskTransactions || {}).forEach(taskKey =>
      restoreInventoryForTask({order,taskKey,label:"Shipping supply"})
    );
  }


  function kitAvailability(kit, count = 1) {
    const shortages = [];
    (kit.components || []).forEach(component => {
      const raw = inventoryItemById(component.itemId);
      const needed = Number(component.quantity || 0) * Number(count || 1);
      if (!raw || raw.tracking !== "quantity" || Number(raw.quantity || 0) < needed) {
        shortages.push({
          name: raw?.name || component.itemId,
          needed,
          available: Number(raw?.quantity || 0)
        });
      }
    });
    return shortages;
  }

  function buildKit(kitId, count = 1) {
    const kit = inventoryItemById(kitId);
    count = Math.max(1, Number(count || 1));
    if (!kit || kit.category !== "prepared-components") return;
    const shortages = kitAvailability(kit,count);
    if (shortages.length) {
      return showModal(
        "Not enough loose materials",
        `<p>The kit cannot be built yet.</p><div class="transaction-shortage-list">${shortages.map(row => `<div><strong>${escapeHTML(row.name)}</strong><span>Need ${row.needed}; ${row.available} loose</span></div>`).join("")}</div>`,
        [{label:"Close"}]
      );
    }
    (kit.components || []).forEach(component => {
      const raw = inventoryItemById(component.itemId);
      const used = Number(component.quantity || 0) * count;
      raw.quantity = Math.max(0,Number(raw.quantity || 0) - used);
      recordInventoryTransaction({
        type:"move-to-kit",
        itemId:raw.id,
        quantity:-used,
        reason:"Moved into prepared component",
        details:`Built ${count} × ${kit.name}`,
        relatedItemId:kit.id
      });
    });
    kit.quantity = Number(kit.quantity || 0) + count;
    recordInventoryTransaction({
      type:"build-kit",
      itemId:kit.id,
      quantity:count,
      reason:"Fabrication kit built",
      details:`Components moved from loose inventory`
    });
    data.activity.unshift({text:`Built ${count} ${kit.name}${count === 1 ? "" : "s"}`,time:"Just now"});
    saveData();
    renderInventoryCatalog("prepared-components");
    showToast(`${count} kit${count === 1 ? "" : "s"} built.`);
  }

  function breakKit(kitId, count = 1) {
    const kit = inventoryItemById(kitId);
    count = Math.max(1,Number(count || 1));
    if (!kit || kit.category !== "prepared-components") return;
    if (Number(kit.quantity || 0) < count) return showToast("Not enough complete kits to break apart.");
    kit.quantity -= count;
    (kit.components || []).forEach(component => {
      const raw = inventoryItemById(component.itemId);
      const returned = Number(component.quantity || 0) * count;
      if (raw) {
        raw.quantity = Number(raw.quantity || 0) + returned;
        recordInventoryTransaction({
          type:"return-from-kit",
          itemId:raw.id,
          quantity:returned,
          reason:"Returned from dismantled kit",
          details:`Broke apart ${count} × ${kit.name}`,
          relatedItemId:kit.id
        });
      }
    });
    recordInventoryTransaction({
      type:"break-kit",
      itemId:kit.id,
      quantity:-count,
      reason:"Fabrication kit dismantled",
      details:"Components returned to loose inventory"
    });
    data.activity.unshift({text:`Broke apart ${count} ${kit.name}${count === 1 ? "" : "s"}`,time:"Just now"});
    saveData();
    renderInventoryCatalog("prepared-components");
    showToast(`${count} kit${count === 1 ? "" : "s"} broken apart.`);
  }

  function showKitTransaction(kitId, mode) {
    const kit = inventoryItemById(kitId);
    if (!kit) return;
    const components = (kit.components || []).map(component => {
      const raw = inventoryItemById(component.itemId);
      return `<div class="kit-component-row"><strong>${escapeHTML(raw?.name || component.itemId)}</strong><span>${component.quantity} per kit · ${Number(raw?.quantity || 0)} loose</span></div>`;
    }).join("") || `<p>No component recipe is attached to this kit yet.</p>`;
    showModal(
      mode === "build" ? "Build Ready Packs" : "Unpack Ready Packs",
      `<div class="kit-transaction-form">
        <p><strong>${escapeHTML(kit.name)}</strong></p>
        <label>Number of kits<input id="kitTransactionCount" type="number" min="1" value="1"></label>
        <div class="kit-component-list">${components}</div>
        ${mode === "break" ? `<p class="modal-note">Breaking a kit returns every listed component to loose inventory.</p>` : `<p class="modal-note">Building a kit moves these components out of loose inventory. They are not counted twice.</p>`}
      </div>`,
      [
        {label:"Cancel"},
        {label:mode === "build" ? "Build Packs" : "Unpack",kind:"primary",onClick:() => {
          const count = Number(document.getElementById("kitTransactionCount")?.value || 1);
          mode === "build" ? buildKit(kitId,count) : breakKit(kitId,count);
        }}
      ]
    );
  }

  function showStockAdjustment(itemId) {
    const item = inventoryItemById(itemId);
    if (!item || item.tracking !== "quantity") return;
    showModal(
      "Adjust Stock",
      `<form id="stockAdjustmentForm" class="stock-adjustment-form">
        <p><strong>${escapeHTML(item.name)}</strong></p>
        <p>Current loose inventory: <strong>${Number(item.quantity || 0)}</strong></p>
        <label>Change in quantity
          <input name="delta" type="number" value="-1" required>
        </label>
        <label>Reason
          <select name="reason">
            <option>Damaged or broken</option>
            <option>Count correction</option>
            <option>Used outside an order</option>
            <option>Returned to inventory</option>
            <option>Received new stock</option>
            <option>Other</option>
          </select>
        </label>
        <label>Notes<textarea name="details" rows="3"></textarea></label>
      </form>`,
      [
        {label:"Cancel"},
        {label:"Save Adjustment",kind:"primary",onClick:() => {
          const form = document.getElementById("stockAdjustmentForm");
          const fd = new FormData(form);
          const delta = Number(fd.get("delta") || 0);
          if (Number(item.quantity || 0) + delta < 0) return showToast("Inventory cannot go below zero.");
          item.quantity = Number(item.quantity || 0) + delta;
          recordInventoryTransaction({
            type:"adjustment",
            itemId:item.id,
            quantity:delta,
            reason:fd.get("reason"),
            details:fd.get("details")
          });
          data.activity.unshift({text:`Adjusted ${item.name} by ${delta}`,time:"Just now"});
          saveData();
          renderInventoryCatalog(inventoryViewState.category || "overview");
        }}
      ]
    );
  }

  function showReceiveStock() {
    const items = activeInventoryItems().filter(item => item.tracking === "quantity").sort((a,b)=>a.name.localeCompare(b.name));
    showModal("Receive Stock", `<form id="receiveStockForm" class="stock-adjustment-form"><label>Inventory Item<select name="itemId" required><option value="">Select an item...</option>${items.map(item=>`<option value="${item.id}">${escapeHTML(item.name)} · ${Number(item.quantity||0)} on hand</option>`).join("")}</select></label><label>Quantity Received<input name="quantity" type="number" min="1" value="1" required></label><label>Notes<textarea name="details" rows="3" placeholder="Shipment, purchase, or receiving notes"></textarea></label></form>`, [{label:"Cancel"},{label:"Receive Stock",kind:"primary",onClick:()=>{const fd=new FormData(document.getElementById("receiveStockForm"));const item=inventoryItemById(fd.get("itemId"));const qty=Number(fd.get("quantity")||0);if(!item||qty<1)return showToast("Choose an item and enter a quantity.");item.quantity=Number(item.quantity||0)+qty;item.lastCountedAt=new Date().toISOString();recordInventoryTransaction({type:"received-stock",itemId:item.id,quantity:qty,reason:"Received new stock",details:fd.get("details")});data.activity.unshift({text:`Received ${qty} ${item.name}`,time:"Just now"});saveData();renderInventoryCatalog(inventoryViewState.category||"overview");showToast(`${qty} added to ${item.name}.`);}}]);
  }

  function showAdjustStockPicker() {
    const items = activeInventoryItems().filter(item => item.tracking === "quantity").sort((a,b)=>a.name.localeCompare(b.name));
    showModal("Adjust Inventory", `<form id="adjustStockPickerForm"><label>Inventory Item<select name="itemId" required><option value="">Select an item...</option>${items.map(item=>`<option value="${item.id}">${escapeHTML(item.name)} · ${Number(item.quantity||0)} on hand</option>`).join("")}</select></label></form>`, [{label:"Cancel"},{label:"Continue",kind:"primary",onClick:()=>{const id=new FormData(document.getElementById("adjustStockPickerForm")).get("itemId");if(!id)return showToast("Choose an inventory item.");hideModal();showStockAdjustment(id);}}]);
  }

  function printInventoryList() {
    document.body.classList.add("printing-inventory");
    window.print();
    setTimeout(()=>document.body.classList.remove("printing-inventory"),300);
  }

  function renderRecentTransactions(limit = 12) {
    const rows = (data.inventoryTransactions || []).slice(0,limit);
    return `<section class="panel inventory-transactions">
      <div class="panel-heading"><div><p class="eyebrow">Movement history</p><h3>Recent Inventory Transactions</h3></div></div>
      ${rows.length ? `<div class="transaction-list">${rows.map(tx => `
        <div class="transaction-row">
          <div><strong>${escapeHTML(tx.itemName)}</strong><span>${escapeHTML(tx.reason)}${tx.details ? ` · ${escapeHTML(tx.details)}` : ""}</span></div>
          <div class="transaction-quantity ${tx.quantity < 0 ? "negative" : "positive"}">${tx.quantity > 0 ? "+" : ""}${tx.quantity}</div>
        </div>`).join("")}</div>` : `<p>No inventory movements have been recorded yet.</p>`}
    </section>`;
  }


  function migrateProductMasters(savedMasters) {
    const defaults = structuredClone(window.SUW_PRODUCT_MASTERS || []);
    const saved = savedMasters || [];
    const merged = defaults.map(master => ({
      ...master,
      ...(saved.find(item => item.id === master.id) || {}),
      packaging: {
        ...(master.packaging || {}),
        ...(saved.find(item => item.id === master.id)?.packaging || {})
      },
      materials: master.id === "macrame-paper-towel-holder" ? (master.materials || []) : (saved.find(item => item.id === master.id)?.materials || master.materials || []),
      kitDefinition: master.id === "macrame-paper-towel-holder" ? (master.kitDefinition || {contents:[],separateMaterials:[]}) : (saved.find(item => item.id === master.id)?.kitDefinition || master.kitDefinition || {contents:[],separateMaterials:[]})
    }));
    saved.forEach(master => {
      if (!merged.some(item => item.id === master.id)) merged.push(master);
    });
    return merged;
  }

  function inferProductCategoryId(master) {
    const value=`${master?.id||""} ${master?.name||""} ${master?.shortName||""}`.toLowerCase();
    if (value.includes("paper-towel") || value.includes("paper towel")) return "paper-towel-holders";
    if (value.includes("toilet-paper") || value.includes("toilet paper")) return "toilet-paper-holders";
    if (value.includes("oven-door") || value.includes("oven door")) return "oven-door-towel-holders";
    return "";
  }

  function migrateProductCategoryCatalog(savedCatalog, masters) {
    const saved=Array.isArray(savedCatalog)?savedCatalog:[];
    const catalog=DEFAULT_PRODUCT_CATEGORIES.map(def=>({...def,...(saved.find(item=>item.id===def.id)||{})}));
    saved.forEach(item=>{ if(!catalog.some(existing=>existing.id===item.id)) catalog.push({...item}); });
    (masters||[]).forEach(master=>{
      const categoryId=master.categoryId || inferProductCategoryId(master);
      if(categoryId && !catalog.some(item=>item.id===categoryId)){
        catalog.push({id:categoryId,name:categoryId.split("-").map(x=>x[0].toUpperCase()+x.slice(1)).join(" "),codePrefix:master.code||productCode(master),defaultCraft:master.craft||"Other",status:"Active",notes:"Migrated from an existing product."});
      }
    });
    return catalog;
  }

  function productCategories(){ return data.productCategoryCatalog || []; }
  function productCategoryById(id){ return productCategories().find(category=>category.id===id); }
  function productsUsingCategory(categoryId){ return productMasters().filter(master=>master.categoryId===categoryId); }
  function categorySlug(name){ return String(name||"category").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || uid("category"); }

  function colorSlug(name) {
    return String(name || "color").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || uid("color");
  }

  function colorByNameFrom(catalog,name) {
    const target=String(name||"").trim().toLowerCase();
    return (catalog||[]).find(color => String(color.name||"").trim().toLowerCase() === target);
  }

  const COLOR_FAMILIES = ["Neutrals","Black & White","Grays","Browns","Pinks","Reds","Oranges","Yellows","Greens","Blues","Purples","Multicolor","Other"];
  let colorFamilyFilter = "All";

  function inferColorFamily(name) {
    const value=String(name||"").toLowerCase();
    if (/black|white/.test(value)) return "Black & White";
    if (/gray|grey|silver/.test(value)) return "Grays";
    if (/brown|chocolate|chestnut|tan|camel|coffee|mocha/.test(value)) return "Browns";
    if (/pink|rose|blush|watermelon|berry/.test(value)) return "Pinks";
    if (/red|wine|burgundy|maroon/.test(value)) return "Reds";
    if (/orange|coral|peach/.test(value)) return "Oranges";
    if (/yellow|gold|mustard/.test(value)) return "Yellows";
    if (/green|sage|olive|forest|mint/.test(value)) return "Greens";
    if (/blue|navy|teal|aqua|turquoise/.test(value)) return "Blues";
    if (/purple|lavender|plum|aubergine/.test(value)) return "Purples";
    if (/multi|rainbow|variegated/.test(value)) return "Multicolor";
    if (/natural|beige|cream|ivory|oat|ecru/.test(value)) return "Neutrals";
    return "Other";
  }

  function migrateColorCatalog(savedCatalog, masters) {
    const catalog=(savedCatalog || []).map(color => ({
      id: color.id || colorSlug(color.name),
      name: color.name || "Unnamed Color",
      family: color.family || inferColorFamily(color.name),
      craft: color.craft || "Shared",
      active: color.active !== false,
      notes: color.notes || "",
      swatch: color.swatch || "",
      inventoryItemId: color.inventoryItemId || ""
    }));
    (masters || []).forEach(master => (master.colors || []).forEach(name => {
      let color=colorByNameFrom(catalog,name);
      if (!color) {
        let id=colorSlug(name), base=id, n=2;
        while(catalog.some(item => item.id===id)) id=`${base}-${n++}`;
        catalog.push({id,name,family:inferColorFamily(name),craft:master.craft || "Shared",active:true,notes:"",swatch:"",inventoryItemId:""});
      } else if (color.craft !== master.craft && color.craft !== "Shared") color.craft="Shared";
    }));
    return catalog;
  }

  function colorsCatalog() { return data.colorCatalog || []; }
  function colorById(id) { return colorsCatalog().find(color => color.id === id); }
  function productsUsingColor(colorId) { return productMasters().filter(master => (master.colorIds || []).includes(colorId)); }

  function productMasters() {
    return data.productMasters || [];
  }

  function productMasterById(id) {
    return productMasters().find(master => master.id === id);
  }

  function productUsesInventoryItemAutomatically(master, itemId) {
    return (master.kitDefinition?.contents || []).some(row => row.inventoryItemId === itemId) ||
      (master.kitDefinition?.separateMaterials || []).some(row => row.inventoryItemId === itemId) ||
      Object.values(master.packaging || {}).includes(itemId);
  }

  function productsUsingInventoryItem(itemId) {
    const item = inventoryItemById(itemId);
    const explicitIds = new Set(item?.linkedProductIds || []);
    return productMasters().filter(master =>
      explicitIds.has(master.id) ||
      (master.materials || []).some(row => row.inventoryItemId === itemId) ||
      productUsesInventoryItemAutomatically(master, itemId)
    );
  }

  function syncInventoryProductLinks() {
    inventoryItems().forEach(item => {
      const linked = new Set(item.linkedProductIds || []);
      productMasters().forEach(master => {
        if ((master.materials || []).some(row => row.inventoryItemId === item.id) || productUsesInventoryItemAutomatically(master, item.id)) linked.add(master.id);
      });
      item.linkedProductIds = [...linked].filter(id => productMasterById(id));
    });
  }

  function syncProductLinksFromInventoryItem(item, selectedProductIds) {
    const selected = new Set(selectedProductIds || []);
    productMasters().forEach(master => {
      const automatic = productUsesInventoryItemAutomatically(master, item.id);
      const hasMaterial = (master.materials || []).some(row => row.inventoryItemId === item.id);
      if (selected.has(master.id) && !automatic && !hasMaterial) {
        master.materials ||= [];
        master.materials.push({inventoryItemId:item.id, quantity:1, role:"Linked inventory item", linkedFromInventory:true});
      }
      if (!selected.has(master.id) && !automatic) {
        master.materials = (master.materials || []).filter(row => row.inventoryItemId !== item.id);
      }
    });
    item.linkedProductIds = productMasters().filter(master => selected.has(master.id) || productUsesInventoryItemAutomatically(master, item.id)).map(master => master.id);
  }

  function migrateItem(item, index) {
    const product = productById(item.productId) || productByName(item.productName) || window.SUW_SAMPLE_DATA.products[0];
    const workflow = item.workflow || {};
    return {
      id: item.id || uid("item"),
      unitNumber: item.unitNumber || index + 1,
      productId: product.id,
      productName: item.productName || product.name,
      color: item.color || "Not specified",
      status: item.status || statusFromLegacy(item.progress),
      notes: item.notes || "",
      custom: Boolean(item.custom),
      recipeVersion: item.recipeVersion || recipeByProductId(product.id)?.version || "0.1",
      recipeStageChecks: item.recipeStageChecks || {},
      updatedAt: item.updatedAt || new Date().toISOString(),
      workflow: {
        activeTab: workflow.activeTab || tabForStatus(item.status || "New"),
        fulfillmentMethod: workflow.fulfillmentMethod || "",
        materialStatuses: normalizeMaterialStatuses(workflow.materialStatuses, product.materials),
        manufacturingChecks: normalizeManufacturingChecks(workflow.manufacturingChecks, workflow.manufacturingChecks, product.manufacturingSections),
        packingChecks: normalizeChecks(workflow.packingChecks, product.packingChecklist),
        preparedDowelReady: Boolean(workflow.preparedDowelReady),
        preparedDowelMode: workflow.preparedDowelMode || "",
        inventoryTaskTransactions: { ...(workflow.inventoryTaskTransactions || {}) }
      }
    };
  }

  function normalizeMaterialStatuses(saved, materials) {
    const map = {};
    materials.forEach(material => {
      map[material.id] = saved?.[material.id] || material.defaultStatus || "Available";
    });
    return map;
  }

  function normalizeManufacturingChecks(saved, legacy, sections) {
    const map = {};
    let flatIndex = 0;
    sections.forEach((section, sectionIndex) => {
      section.steps.forEach((step, stepIndex) => {
        const key = `${sectionIndex}-${stepIndex}`;
        map[key] = Boolean(saved?.[key] ?? legacy?.[flatIndex]);
        flatIndex += 1;
      });
    });
    return map;
  }

  function normalizeChecks(saved, labels) {
    const map = {};
    labels.forEach((label, i) => map[i] = Boolean(saved?.[i]));
    return map;
  }

  function productById(id) { return window.SUW_SAMPLE_DATA.products.find(p => p.id === id); }
  function productByName(name) { return window.SUW_SAMPLE_DATA.products.find(p => p.name === name); }
  function productIdFromName(name = "") { return productByName(name)?.id || ""; }

  function statusFromLegacy(progress = "") {
    if (/ready for packing/i.test(progress)) return "Ready for Packing";
    if (/manufactur/i.test(progress) || /\d+\s+of\s+\d+/i.test(progress)) return "Manufacturing";
    return "New";
  }

  function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

  function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
  }

  function parseLocalDate(dateString) {
    if (!dateString) return null;
    const [year,month,day] = String(dateString).split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year,month-1,day);
  }

  function formatShipByDate(dateString) {
    const date=parseLocalDate(dateString);
    return date ? date.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}) : "Not set";
  }

  function shipByState(order) {
    if (!order?.shipByDate) return {className:"missing",label:"Ship by date not set",shortLabel:"No ship date"};
    const due=parseLocalDate(order.shipByDate);
    const today=new Date(); today.setHours(0,0,0,0);
    const days=Math.round((due-today)/86400000);
    if (order.status === "Completed") return {className:"mailed",label:`Ship by ${formatShipByDate(order.shipByDate)}`,shortLabel:`Ship by ${formatShipByDate(order.shipByDate)}`};
    if (days < 0) { const n=Math.abs(days); return {className:"overdue",label:`Overdue by ${n} day${n===1?"":"s"}`,shortLabel:`Overdue ${n}d`}; }
    if (days === 0) return {className:"today",label:"Ship today",shortLabel:"Ship today"};
    if (days === 1) return {className:"soon",label:"Ships tomorrow",shortLabel:"Tomorrow"};
    if (days <= 3) return {className:"soon",label:`Ship in ${days} days`,shortLabel:`${days} days`};
    return {className:"normal",label:`Ship by ${formatShipByDate(order.shipByDate)}`,shortLabel:`Ship by ${formatShipByDate(order.shipByDate)}`};
  }

  function renderShipByBadge(order,{compact=false}={}) {
    const state=shipByState(order);
    return `<span class="ship-by-badge ${state.className}" title="${escapeHTML(order.shipByDate ? `Ship by ${formatShipByDate(order.shipByDate)}` : "Ship by date not set")}">${escapeHTML(compact ? state.shortLabel : state.label)}</span>`;
  }

  function calculateOrderStatus(items = []) {
    if (!items.length) return "New";
    if (items.every(i => i.status === "Completed")) return "Completed";
    if (items.every(i => ["Ready to Mail","Completed"].includes(i.status))) return "Ready to Mail";
    if (items.some(i => i.status === "Waiting on Material")) return "Waiting on Material";
    if (items.some(i => i.status === "Manufacturing")) return "Manufacturing";
    if (items.some(i => ["Ready for Packing","Packed"].includes(i.status))) return "Packing";
    if (items.some(i => i.status === "Preparing")) return "Preparing";
    return "New";
  }

  function activeOrders() { return data.orders.filter(o => o.status !== "Completed"); }

  function touchOrder(order, item = null) {
    const now = new Date().toISOString();
    order.updatedAt = now;
    if (item) item.updatedAt = now;
    order.status = calculateOrderStatus(order.items);
    data.settings.lastOpenedOrderId = order.id;
    if (item) data.settings.lastOpenedItemId = item.id;
  }

  function tabForStatus(status) {
    if (["New","Preparing","Waiting on Material"].includes(status)) return "prepare";
    if (status === "Manufacturing") return "manufacture";
    return "pack";
  }

  function setActiveNav(view) {
    document.querySelectorAll(".nav-link").forEach(button => button.classList.toggle("active", button.dataset.view === view));
  }

  function showView(view) {
    setActiveNav(view);
    sidebar.classList.remove("open");
    editingOrderId = null;
    if (view === "dashboard") return renderDashboardView();
    if (view === "workshop") return renderWorkshopView();
    if (view === "inventory") return renderInventoryCatalog();
    if (view === "products") { productsModuleView = "catalog"; return renderProductsModule(); }

    const config = viewContent[view];
    if (!config) return;
    pageTitle.textContent = config.title;
    const template = document.getElementById("placeholderTemplate");
    const fragment = template.content.cloneNode(true);
    fragment.querySelector("h3").textContent = config.title;
    fragment.querySelector(".placeholder-copy").textContent = config.copy;
    const card = fragment.querySelector(".placeholder-card");
    card.textContent = config.card;
    Object.assign(card.style, {display:"grid", placeItems:"center", padding:"26px", color:"var(--muted)"});
    viewContainer.replaceChildren(fragment);
  }


  function getRestockGroups() {
    const groups = new Map();
    data.orders.forEach(order => {
      if (order.status === "Completed") return;
      order.items.forEach(item => {
        const product = productById(item.productId);
        if (!product) return;
        product.materials.forEach(material => {
          const status = item.workflow.materialStatuses[material.id] || "Available";
          if (status === "Available") return;
          const key = material.id;
          if (!groups.has(key)) {
            groups.set(key, {
              id: material.id,
              name: material.name,
              statuses: new Set(),
              items: []
            });
          }
          const group = groups.get(key);
          group.statuses.add(status);
          group.items.push({
            orderId: order.id,
            itemId: item.id,
            customerName: order.customerName,
            etsyOrderNumber: order.etsyOrderNumber,
            productName: item.productName,
            color: item.color,
            status
          });
        });
      });
    });
    return [...groups.values()].sort((a,b) => a.name.localeCompare(b.name));
  }

  function groupPrimaryStatus(group) {
    if (group.statuses.has("Backordered")) return "Backordered";
    if (group.statuses.has("Need to Buy")) return "Need to Buy";
    if (group.statuses.has("Ordered")) return "Ordered";
    return "Available";
  }


  const INVENTORY_SECTION_ORDER = ["overview","yarn-cord","accessories","prepared-components","packaging","print-branding","finished-inventory"];
  const INVENTORY_TOOL_ORDER = ["suppliers","restock"];

  function inventoryPageMeta(pageId) {
    const category = inventoryCategories().find(item => item.id === pageId);
    const meta = {
      overview:{title:"Inventory",eyebrow:"Workshop stockroom",copy:"Keeping your workshop stocked and ready for every order."},
      suppliers:{title:"Suppliers",eyebrow:"Inventory directory",copy:"Trusted sources for the materials that keep your workshop moving."},
      restock:{title:"Restock Center",eyebrow:"Inventory planning",copy:"Review what is low, unavailable, or ready to replenish."}
    };
    return meta[pageId] || {title:category?.name || "Inventory",eyebrow:"Inventory section",copy:category?.description || "Manage this part of your workshop stockroom."};
  }

  function renderInventorySubnav(activePage) {
    const labels = {
      overview:["🏠","Overview"], "yarn-cord":["🧶","Yarn & Cord"], accessories:["🪵","Accessories"],
      "prepared-components":["📦","Ready Packs"], packaging:["✉️","Packaging"], "print-branding":["🖨️","Print & Branding"],
      "finished-inventory":["🎁","Finished"], suppliers:["🚚","Suppliers"], restock:["📋","Restock Center"]
    };
    const button = id => `<button class="inventory-section-link ${activePage===id?"active":""}" data-action="inventory-category" data-category="${id}"><span aria-hidden="true">${labels[id][0]}</span><span>${escapeHTML(labels[id][1])}</span></button>`;
    return `<div class="inventory-subnav-wrap">
      <div class="inventory-subnav-heading"><span>Inventory sections</span></div>
      <nav class="inventory-section-nav" aria-label="Inventory sections">${INVENTORY_SECTION_ORDER.map(button).join("")}</nav>
      <div class="inventory-tools-row"><span class="inventory-tools-label">Inventory tools</span>${INVENTORY_TOOL_ORDER.map(button).join("")}</div>
    </div>`;
  }

  function renderInventoryCatalog(activeCategory = inventoryViewState.category || "overview") {
    inventoryViewState.category = activeCategory;
    const meta = inventoryPageMeta(activeCategory);
    pageTitle.textContent = meta.title;
    setActiveNav("inventory");
    const attentionItems = activeInventoryItems().filter(inventoryNeedsAttention);
    const orderNeeds = getRestockGroups();
    const isHome = activeCategory === "overview";
    viewContainer.innerHTML = `
      <section class="page-section wide inventory-experience-page ${isHome?"inventory-home-page":"inventory-subpage"}">
        <section class="inventory-experience-hero ${isHome?"is-home":"is-subpage"}" aria-labelledby="inventoryHeroTitle">
          <div class="inventory-experience-copy">
            ${!isHome?`<button class="inventory-back-link" data-action="inventory-category" data-category="overview">← Back to Inventory</button>`:""}
            <p class="eyebrow">${escapeHTML(meta.eyebrow)}</p>
            <h3 id="inventoryHeroTitle">${escapeHTML(meta.title)}</h3>
            <p>${escapeHTML(meta.copy)}</p>
          </div>
          ${isHome?`<button class="button secondary inventory-settings-button" data-view="settings">Inventory Settings</button>`:""}
        </section>
        ${renderInventorySubnav(activeCategory)}
        <div id="inventoryContent">${isHome ? renderInventoryOverview(attentionItems,orderNeeds) : activeCategory === "restock" ? renderCombinedRestockCenter(attentionItems,orderNeeds) : activeCategory === "suppliers" ? renderSuppliersPage() : renderInventorySectionPage(activeCategory)}</div>
      </section>`;
  }

  function renderInventorySummaryCards(attentionItems) {
    const summary = inventoryAttentionSummary();
    return `<section class="inventory-summary-grid inventory-home-summary">
      <button class="inventory-summary-card" data-action="inventory-category" data-category="restock"><span class="inventory-summary-icon red">×</span><span><small>Out of Stock</small><strong>${summary.out}</strong><em>${summary.out ? "Needs immediate action" : "Nothing is out"}</em></span></button>
      <button class="inventory-summary-card" data-action="inventory-category" data-category="restock"><span class="inventory-summary-icon amber">!</span><span><small>Low Stock</small><strong>${summary.low}</strong><em>${summary.low ? "Plan replenishment" : "Nothing is low"}</em></span></button>
      <button class="inventory-summary-card" data-action="inventory-count-review"><span class="inventory-summary-icon lavender">↻</span><span><small>Needs Count</small><strong>${summary.needsCount}</strong><em>${summary.needsCount ? "Quantity not yet verified" : "Counts are up to date"}</em></span></button>
      <button class="inventory-summary-card" data-action="inventory-category" data-category="yarn-cord"><span class="inventory-summary-icon green">✓</span><span><small>Healthy</small><strong>${summary.good}</strong><em>${summary.total} active inventory items</em></span></button>
    </section>`;
  }

  function inventoryItemKind(item) {
    const text = `${item?.name||""} ${item?.materialType||""}`.toLowerCase();
    if (text.includes("dowel")) return "Dowels";
    if (text.includes("keyring") || text.includes("key ring")) return "Keyrings";
    if (text.includes("end cap") || text.includes("endcap")) return "End Caps";
    if (text.includes("ring")) return "Rings";
    if (text.includes("bead")) return "Beads";
    if (text.includes("cord")) return "Cord";
    if (text.includes("yarn")) return "Yarn";
    if (text.includes("mailer")) return "Mailers";
    if (text.includes("care sheet")) return "Care Sheets";
    if (text.includes("tag")) return "Product Tags";
    if (text.includes("sticker")) return "Stickers";
    if (text.includes("label")) return "Labels";
    if (text.includes("kit")) return "Kits";
    return item?.materialType || "Other";
  }

  function filteredAllInventoryItems(){
    let items=inventoryItems();
    if(inventoryViewState.lifecycle!=="All") items=items.filter(item=>inventoryViewState.lifecycle==="Archived" ? item.status==="Archived" : item.status!=="Archived");
    const q=inventoryViewState.search.trim().toLowerCase();
    if(q) items=items.filter(item=>[item.name,item.materialType,inventoryItemKind(item),item.craft,item.color,item.notes,supplierNameForItem(item)].filter(Boolean).some(v=>String(v).toLowerCase().includes(q)));
    if(inventoryViewState.craft!=="All") items=items.filter(item=>(item.craft||"Shared")===inventoryViewState.craft);
    if(inventoryViewState.materialType!=="All") items=items.filter(item=>(item.materialType||"Other")===inventoryViewState.materialType);
    if(inventoryViewState.itemType!=="All") items=items.filter(item=>inventoryItemKind(item)===inventoryViewState.itemType);
    if(inventoryViewState.supplier!=="All") items=items.filter(item=>(item.supplierId||"")===inventoryViewState.supplier);
    if(inventoryViewState.stock!=="All") items=items.filter(item=>inventoryStatus(item)===inventoryViewState.stock);
    const [field,dir]=inventoryViewState.sort.split("-");
    items.sort((a,b)=>{let av,bv;if(field==="quantity"){av=a.tracking==="quantity"?Number(a.quantity||0):statusRank(inventoryStatus(a));bv=b.tracking==="quantity"?Number(b.quantity||0):statusRank(inventoryStatus(b));}else if(field==="stock"){av=statusRank(inventoryStatus(a));bv=statusRank(inventoryStatus(b));}else{av=String(a.name||"").toLowerCase();bv=String(b.name||"").toLowerCase();}if(typeof av==="number"&&typeof bv==="number")return dir==="desc"?bv-av:av-bv;return dir==="desc"?String(bv).localeCompare(String(av)):String(av).localeCompare(String(bv));});
    return items;
  }

  function renderInventoryQuickActions() {
    return `<section class="inventory-action-toolbar" aria-label="Inventory quick actions">
      <div><p class="eyebrow">Quick actions</p><h3>What would you like to do?</h3></div>
      <div class="inventory-action-buttons">
        <button class="button primary" data-action="add-inventory-item">+ New Inventory Item</button>
        <button class="button secondary" data-action="receive-stock">Receive Stock</button>
        <button class="button secondary" data-action="adjust-stock-picker">Adjust Inventory</button>
        <button class="button secondary" data-action="inventory-category" data-category="restock">Restock Center</button>
        <button class="button secondary" data-action="print-inventory-list">Print List</button>
      </div>
    </section>`;
  }

  function renderInventoryRecentActivity() {
    const rows=(data.inventoryTransactions||[]).slice(0,6);
    return `<article class="panel inventory-home-panel"><div class="panel-heading"><div><p class="eyebrow">Latest movements</p><h3>Recent Inventory Activity</h3></div></div><div class="inventory-activity-list">${rows.length?rows.map(tx=>{const item=inventoryItemById(tx.itemId);const quantity=Number(tx.quantity||0);return `<div class="inventory-activity-row"><span class="inventory-activity-quantity ${quantity<0?"negative":"positive"}">${quantity>0?"+":""}${quantity}</span><div><strong>${escapeHTML(item?.name||tx.itemName||"Inventory item")}</strong><small>${escapeHTML(tx.reason||tx.type||"Inventory update")}</small></div><time>${new Date(tx.date||tx.createdAt||Date.now()).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</time></div>`;}).join(""):`<p>No inventory activity has been recorded yet.</p>`}</div></article>`;
  }

  function renderInventoryActionBucket(title,type,items) {
    const visible = items.slice(0,3);
    const labels = {print:"Print",purchase:"Purchase",make:"Make"};
    return `<section class="inventory-action-bucket"><div class="inventory-action-bucket-heading"><div><span class="inventory-action-icon ${type}">${type==="print"?"▤":type==="make"?"◇":"↗"}</span><div><small>${labels[type]}</small><h4>${escapeHTML(title)}</h4></div></div><strong>${items.length}</strong></div><div class="inventory-action-items">${visible.length ? visible.map(renderInventoryAlert).join("") : `<p class="inventory-action-empty">Nothing to ${type} right now.</p>`}</div>${items.length>visible.length?`<button class="text-button" data-action="inventory-category" data-category="restock">View all ${items.length} ${type} needs →</button>`:""}</section>`;
  }

  function renderInventoryCategorySnapshot() {
    const categories = inventoryCategories().filter(category => INVENTORY_SECTION_ORDER.includes(category.id) && category.id !== "overview");
    const rows = categories.map(category => {
      const items = activeInventoryItems().filter(item => item.category === category.id);
      const summary = inventoryAttentionSummary(items);
      return `<button class="inventory-snapshot-row" data-action="inventory-category" data-category="${category.id}"><span><strong>${escapeHTML(category.name)}</strong><small>${summary.total} item${summary.total===1?"":"s"}</small></span><span>${summary.low}</span><span>${summary.out}</span><span>${summary.needsCount}</span></button>`;
    }).join("");
    return `<article class="panel inventory-home-panel inventory-snapshot-card"><div class="panel-heading"><div><p class="eyebrow">Workshop snapshot</p><h3>Inventory by Category</h3><p>Open a category when you need the full item table.</p></div></div><div class="inventory-snapshot-table"><div class="inventory-snapshot-head"><span>Category</span><span>Low</span><span>Out</span><span>Count</span></div>${rows}</div></article>`;
  }

  function renderInventoryCountNotice() {
    const needsCount = activeInventoryItems().filter(inventoryNeedsCount);
    return `<article class="inventory-count-notice"><div><span class="inventory-count-notice-icon">↻</span><div><p class="eyebrow">Inventory check</p><h3>${needsCount.length ? `${needsCount.length} item${needsCount.length===1?"":"s"} need a verified count` : "Inventory counts are verified"}</h3><p>${needsCount.length ? "These items are separated from true low-stock alerts until you confirm their quantities." : "Future quantity edits and stock counts will keep this status current."}</p></div></div>${needsCount.length?`<button class="button secondary" data-action="inventory-count-review">Start Inventory Check</button>`:""}</article>`;
  }

  function renderInventoryOverview(attentionItems, orderNeeds) {
    const buckets = inventoryRestockBuckets(attentionItems);
    return `${renderInventorySummaryCards(attentionItems)}${renderInventoryQuickActions()}${renderInventoryCountNotice()}<section class="panel inventory-attention-panel"><div class="panel-heading"><div><p class="eyebrow">Attention needed</p><h3>What needs to happen next</h3><p>Grouped by the action you need to take—not by catalog order.</p></div><button class="text-button" data-action="inventory-category" data-category="restock">Open full Restock Center</button></div><div class="inventory-action-buckets">${renderInventoryActionBucket("Print supplies", "print", buckets.print)}${renderInventoryActionBucket("Order supplies", "purchase", buckets.purchase)}${renderInventoryActionBucket("Prepare ahead", "make", buckets.make)}</div></section><section class="inventory-home-grid inventory-home-lower">${renderInventoryCategorySnapshot()}${renderInventoryRecentActivity()}</section>`;
  }

  function inventoryFilterValues(categoryId) {
    const items=inventoryItems().filter(item=>(categoryId === "overview" || item.category===categoryId) && (inventoryViewState.lifecycle==="All" || (inventoryViewState.lifecycle==="Archived" ? item.status==="Archived" : item.status!=="Archived")));
    return {
      crafts:[...new Set(items.map(item=>item.craft||"Shared"))].sort(),
      materialTypes:[...new Set(items.map(item=>item.materialType||"Other"))].sort(),
      itemTypes:[...new Set(items.map(inventoryItemKind))].sort(),
      supplierIds:[...new Set(items.map(item=>item.supplierId).filter(Boolean))]
    };
  }
  function statusRank(status){ return status==="Out"?0:status==="Low"?1:2; }
  function filteredInventoryItems(categoryId){
    let items=inventoryItems().filter(item=>item.category===categoryId);
    if(inventoryViewState.lifecycle!=="All") items=items.filter(item=>inventoryViewState.lifecycle==="Archived" ? item.status==="Archived" : item.status!=="Archived");
    const q=inventoryViewState.search.trim().toLowerCase();
    if(q) items=items.filter(item=>[item.name,item.materialType,inventoryItemKind(item),item.craft,item.color,item.notes,supplierNameForItem(item)].filter(Boolean).some(v=>String(v).toLowerCase().includes(q)));
    if(inventoryViewState.craft!=="All") items=items.filter(item=>(item.craft||"Shared")===inventoryViewState.craft);
    if(inventoryViewState.materialType!=="All") items=items.filter(item=>(item.materialType||"Other")===inventoryViewState.materialType);
    if(inventoryViewState.itemType!=="All") items=items.filter(item=>inventoryItemKind(item)===inventoryViewState.itemType);
    if(inventoryViewState.supplier!=="All") items=items.filter(item=>(item.supplierId||"")===inventoryViewState.supplier);
    if(inventoryViewState.stock!=="All") items=items.filter(item=>inventoryStatus(item)===inventoryViewState.stock);
    const [field,dir]=inventoryViewState.sort.split("-");
    items.sort((a,b)=>{let av,bv;if(field==="quantity"){av=a.tracking==="quantity"?Number(a.quantity||0):statusRank(inventoryStatus(a));bv=b.tracking==="quantity"?Number(b.quantity||0):statusRank(inventoryStatus(b));}else if(field==="stock"){av=statusRank(inventoryStatus(a));bv=statusRank(inventoryStatus(b));}else if(field==="product"){av=a.productId||a.name;bv=b.productId||b.name;}else{av=String(a.name||"").toLowerCase();bv=String(b.name||"").toLowerCase();}if(typeof av==="number"&&typeof bv==="number")return dir==="desc"?bv-av:av-bv;return dir==="desc"?String(bv).localeCompare(String(av)):String(av).localeCompare(String(bv));});
    return items;
  }

  function renderInventoryControls(categoryId,options={}){
    const values=inventoryFilterValues(categoryId);
    const showMaterial=values.materialTypes.length>1 || categoryId==="accessories";
    const showItemType=values.itemTypes.length>1;
    const showSupplier=values.supplierIds.length>1;
    return `<section class="inventory-controls panel"><div class="inventory-control-grid">
      <label class="inventory-search">Search<input type="search" value="${escapeHTML(inventoryViewState.search)}" data-action="inventory-search" placeholder="Search ${escapeHTML(inventoryPageMeta(categoryId).title.toLowerCase())}..."></label>
      <label>Craft<select data-action="inventory-filter" data-filter="craft"><option value="All">All crafts</option>${values.crafts.map(v=>`<option value="${escapeHTML(v)}" ${inventoryViewState.craft===v?"selected":""}>${escapeHTML(v)}</option>`).join("")}</select></label>
      ${showMaterial?`<label>Material<select data-action="inventory-filter" data-filter="materialType"><option value="All">All materials</option>${values.materialTypes.map(v=>`<option value="${escapeHTML(v)}" ${inventoryViewState.materialType===v?"selected":""}>${escapeHTML(v)}</option>`).join("")}</select></label>`:""}
      ${showItemType?`<label>Item Type<select data-action="inventory-filter" data-filter="itemType"><option value="All">All item types</option>${values.itemTypes.map(v=>`<option value="${escapeHTML(v)}" ${inventoryViewState.itemType===v?"selected":""}>${escapeHTML(v)}</option>`).join("")}</select></label>`:""}
      ${showSupplier?`<label>Supplier<select data-action="inventory-filter" data-filter="supplier"><option value="All">All suppliers</option>${values.supplierIds.map(id=>{const supplier=supplierById(id);return supplier?`<option value="${id}" ${inventoryViewState.supplier===id?"selected":""}>${escapeHTML(supplier.name)}</option>`:"";}).join("")}</select></label>`:""}
      <label>Stock<select data-action="inventory-filter" data-filter="stock">${["All","Good","Low","Out"].map(v=>`<option value="${v}" ${inventoryViewState.stock===v?"selected":""}>${v==="All"?"All stock levels":v}</option>`).join("")}</select></label>
      <label>Items<select data-action="inventory-filter" data-filter="lifecycle">${["Active","Archived","All"].map(v=>`<option value="${v}" ${inventoryViewState.lifecycle===v?"selected":""}>${v}</option>`).join("")}</select></label>
      <label>Sort<select data-action="inventory-sort"><option value="name-asc" ${inventoryViewState.sort==="name-asc"?"selected":""}>A–Z</option><option value="name-desc" ${inventoryViewState.sort==="name-desc"?"selected":""}>Z–A</option><option value="quantity-asc" ${inventoryViewState.sort==="quantity-asc"?"selected":""}>Lowest quantity</option><option value="quantity-desc" ${inventoryViewState.sort==="quantity-desc"?"selected":""}>Highest quantity</option><option value="stock-asc" ${inventoryViewState.sort==="stock-asc"?"selected":""}>Urgent stock first</option><option value="product-asc" ${inventoryViewState.sort==="product-asc"?"selected":""}>Product order</option></select></label>
      ${options.allowGroup?`<label>Group<select data-action="inventory-group"><option value="none" ${inventoryViewState.group==="none"?"selected":""}>No grouping</option><option value="product" ${inventoryViewState.group==="product"?"selected":""}>Group by product</option><option value="color" ${inventoryViewState.group==="color"?"selected":""}>Group by color</option><option value="stock" ${inventoryViewState.group==="stock"?"selected":""}>Group by stock</option></select></label>`:""}
      <button class="button secondary inventory-clear-button" data-action="clear-inventory-filters">Clear Filters</button>
    </div></section>`;
  }

  function renderInventorySectionSummary(categoryId,items) {
    const active=items.filter(item=>item.status!=="Archived");
    const low=active.filter(item=>inventoryStatus(item)==="Low");
    const out=active.filter(item=>inventoryStatus(item)==="Out");
    const label=categoryId==="prepared-components"?"Ready Packs":(inventoryCategories().find(category=>category.id===categoryId)?.name||"Items");
    return `<section class="inventory-section-summary inventory-section-summary-compact"><article><small>Total ${escapeHTML(label)}</small><strong>${active.length}</strong></article><article><small>Low Stock</small><strong>${low.length}</strong></article><article><small>Out of Stock</small><strong>${out.length}</strong></article></section>`;
  }

  function renderInventorySectionPage(categoryId) {
    const category=inventoryCategories().find(c=>c.id===categoryId);
    const items=filteredInventoryItems(categoryId);
    return `<section class="inventory-page-toolbar"><div><p class="eyebrow">${escapeHTML(category?.name||"Inventory")}</p><h3>Manage ${escapeHTML((category?.name||"inventory").toLowerCase())}</h3></div><button class="button primary" data-action="add-inventory-item">+ New Item</button></section>${renderInventorySectionSummary(categoryId,inventoryItems().filter(item=>item.category===categoryId))}${renderInventoryControls(categoryId)}${renderInventoryTable(items,categoryId)}`;
  }

  function renderSuppliersPage() {
    return `<section class="inventory-page-toolbar"><div><p class="eyebrow">Supplier directory</p><h3>Manage Suppliers</h3></div><button class="button primary" data-action="add-supplier">+ Add Supplier</button></section>${renderSuppliersTable()}`;
  }

  function renderInventoryMaterialType(typeId) {
    const type = inventoryMaterialTypes().find(entry => entry.id === typeId);
    if (!type) return `<div class="inventory-empty-filter">This material type could not be found.</div>`;
    const categoryId = type.categoryId || "accessories";
    const previousType = inventoryViewState.materialType;
    inventoryViewState.materialType = type.name;
    const items = filteredInventoryItems(categoryId);
    inventoryViewState.materialType = previousType;
    return `<section class="inventory-category-heading"><div><p class="eyebrow">Material type</p><h3>${escapeHTML(type.name)}</h3><p>Inventory items assigned to ${escapeHTML(type.name)}.</p></div></section>${renderInventoryControls(categoryId)}${renderInventoryTable(items)}`;
  }

  function renderInventoryCategory(categoryId){const category=inventoryCategories().find(c=>c.id===categoryId);const items=filteredInventoryItems(categoryId);return `<section class="inventory-category-heading"><div><p class="eyebrow">Inventory category</p><h3>${escapeHTML(category?.name||"Inventory")}</h3><p>${escapeHTML(category?.description||"")}</p></div></section>${renderInventoryControls(categoryId)}${renderInventoryTable(items,categoryId)}`;}
  function readyPackCanMake(item) {
    if (!(item.components || []).length) return 0;
    const capacities = item.components.map(component => {
      const source = inventoryItemById(component.itemId);
      const required = Number(component.quantity || 0);
      if (!source || source.tracking !== "quantity" || required <= 0) return 0;
      return Math.floor(Number(source.quantity || 0) / required);
    });
    return capacities.length ? Math.max(0, Math.min(...capacities)) : 0;
  }

  function inventoryTableLabels(categoryId) {
    if (categoryId === "prepared-components") return ["Ready Pack", "Available", "Can Make", "Status", "Actions"];
    if (categoryId === "finished-inventory") return ["Finished Product", "On Hand", "Reorder At", "Status", "Actions"];
    if (categoryId === "yarn-cord") return ["Yarn or Cord", "On Hand", "Reorder At", "Status", "Actions"];
    if (categoryId === "accessories") return ["Accessory", "On Hand", "Reorder At", "Status", "Actions"];
    if (categoryId === "packaging") return ["Packaging", "On Hand", "Reorder At", "Status", "Actions"];
    if (categoryId === "print-branding") return ["Print or Branding Item", "On Hand", "Reorder At", "Status", "Actions"];
    return ["Item", "On Hand", "Reorder At", "Status", "Actions"];
  }

  function renderInventoryTable(items, categoryId = inventoryViewState.category) {
    const labels = inventoryTableLabels(categoryId);
    return `<section class="inventory-table-card inventory-table-polished inventory-section-table" data-category="${escapeHTML(categoryId || "inventory")}">
      <div class="inventory-data-table inventory-data-table-head inventory-data-table-polished">${labels.map(label => `<span>${escapeHTML(label)}</span>`).join("")}</div>
      ${items.length ? items.map(item => {
        const allocated = item.tracking === "quantity" ? allocatedInKits(item.id) : 0;
        const supplierName = supplierNameForItem(item);
        const linkedProducts = productsUsingInventoryItem(item.id);
        const purchaseUrl = normalizeExternalUrl(item.purchaseUrl || item.resourceUrl);
        const archived = item.status === "Archived";
        const isReadyPack = categoryId === "prepared-components";
        const canMake = isReadyPack ? readyPackCanMake(item) : null;
        const productName = item.productId ? productDisplayName(item.productId) : "";
        const details = [];
        if (productName && productName !== "Other") details.push(productName);
        if (item.color) details.push(item.color);
        const componentSummary = isReadyPack && (item.components || []).length ? (item.components || []).map(component => {
          const raw = inventoryItemById(component.itemId);
          return `${Number(component.quantity || 0)} ${raw?.name || component.itemId}`;
        }).join(" · ") : "";
        return `<article class="inventory-data-table inventory-data-table-polished ${archived ? "is-archived" : ""}">
          <div class="inventory-name-cell inventory-name-cell-polished">
            ${item.imageData ? `<img class="inventory-thumb inventory-thumb-photo" src="${item.imageData}" alt="">` : ""}
            <div class="inventory-item-copy">
              <strong>${escapeHTML(item.name)}</strong>
              <div class="inventory-item-meta">
                <span>${escapeHTML(item.materialType || "Other")}</span>
                <span>${escapeHTML(item.craft || "Shared")}</span>
                ${supplierName ? `<span>${escapeHTML(supplierName)}</span>` : ""}
                ${archived ? `<span class="inventory-archived-label">Archived</span>` : ""}
              </div>
              ${details.length ? `<div class="inventory-table-detail-line">${details.map(detail => `<span>${escapeHTML(detail)}</span>`).join("")}</div>` : ""}
              ${componentSummary ? `<small class="inventory-component-summary"><strong>Contains:</strong> ${escapeHTML(componentSummary)}</small>` : ""}
              ${purchaseUrl ? `<button type="button" class="inventory-buy-link" data-action="open-inventory-link" data-item-id="${item.id}">Open Listing ↗</button>` : ""}
              ${linkedProducts.length ? `<div class="inventory-product-pills">${linkedProducts.map(master => `<button type="button" class="product-link-pill" data-action="open-product-master" data-product-id="${master.id}">${escapeHTML(master.name)}</button>`).join("")}</div>` : ""}
              ${item.notes ? `<small class="inventory-item-description" title="${escapeHTML(item.notes)}">${escapeHTML(item.notes)}</small>` : ""}
            </div>
          </div>
          <div class="inventory-count-cell">${isYarnOrCord(item) ? `<strong>${escapeHTML(yarnTrackingLabel(item))}</strong><small>${item.yarnTrackingMode === "precise" ? "Precise length tracking" : item.yarnTrackingMode === "approximate" ? "Flexible estimate" : "Simple tracking"}</small>` : item.tracking === "quantity" ? `<strong>${Number(item.quantity || 0)}</strong>${allocated ? `<small>${allocated} in ready packs · ${totalOwned(item)} total owned</small>` : `<small>${isReadyPack ? "Ready to use" : "Loose stock"}</small>`}` : `<strong>${escapeHTML(item.condition || "Not set")}</strong><small>Condition tracked</small>`}</div>
          <div class="inventory-reorder-cell">${isReadyPack ? `<strong>${canMake}</strong><small>From current materials</small>` : item.tracking === "quantity" ? `<strong>${Number(item.reorderAt || 0)}</strong><small>Preferred ${Number(item.preferredStock || 0)}</small>` : "<strong>—</strong>"}</div>
          <div><span class="inventory-stock-badge ${archived ? "archived" : inventoryStatus(item).toLowerCase()}">${archived ? "Archived" : escapeHTML(inventoryStatus(item))}</span></div>
          <div class="inventory-row-actions inventory-row-actions-polished">
            ${!archived && isReadyPack ? `<button class="button primary small" data-action="kit-transaction" data-mode="build" data-item-id="${item.id}">Build Packs</button><button class="button secondary small" data-action="kit-transaction" data-mode="break" data-item-id="${item.id}">Unpack</button>` : ""}
            ${!archived && !isReadyPack && item.restockType === "make" && (item.components || []).length ? `<button class="button primary small" data-action="prepare-component" data-item-id="${item.id}">Prepare Batch</button>` : ""}
            ${!archived && item.tracking === "quantity" ? `<div class="inventory-quick-adjust" aria-label="Quick quantity adjustment"><button title="Subtract one" aria-label="Subtract one ${escapeHTML(item.name)}" data-action="adjust-inventory" data-item-id="${item.id}" data-delta="-1">−</button><button title="Add one" aria-label="Add one ${escapeHTML(item.name)}" data-action="adjust-inventory" data-item-id="${item.id}" data-delta="1">+</button></div><button class="button secondary small" data-action="stock-adjustment" data-item-id="${item.id}">Adjust</button>` : ""}
            ${!archived && isYarnOrCord(item) && item.yarnTrackingMode === "precise" ? `<button class="button primary small" data-action="record-yarn-use" data-item-id="${item.id}">Record Use</button>` : ""}
            <button class="button secondary small" data-action="edit-inventory-item" data-item-id="${item.id}">Edit</button>
            ${archived ? `<button class="button secondary small" data-action="restore-inventory-item" data-item-id="${item.id}">Restore</button>` : `<button class="button secondary small" data-action="archive-inventory-item" data-item-id="${item.id}">Archive</button>`}
            <button class="button secondary small danger-outline" data-action="delete-inventory-item" data-item-id="${item.id}">Delete</button>
          </div>
        </article>`;
      }).join("") : `<div class="inventory-empty-filter">No inventory items match these filters.</div>`}
    </section>`;
  }

  function renderGroupedInventoryCards(items){if(!items.length)return `<div class="inventory-empty-filter">No inventory items match these filters.</div>`;if(inventoryViewState.group==="none")return `<div class="inventory-catalog-grid">${items.map(renderInventoryCard).join("")}</div>`;const groups=new Map();items.forEach(item=>{const key=inventoryViewState.group==="product"?productDisplayName(item.productId):inventoryViewState.group==="color"?(item.color||"No color"):inventoryStatus(item);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);});return [...groups.entries()].map(([label,groupItems])=>`<section class="inventory-card-group"><div class="inventory-card-group-heading"><h4>${escapeHTML(label)}</h4><span>${groupItems.length} item${groupItems.length===1?"":"s"}</span></div><div class="inventory-catalog-grid">${groupItems.map(renderInventoryCard).join("")}</div></section>`).join("");}
  function productDisplayName(productId){return data.products.find(p=>p.id===productId)?.name||"Other";}
  function renderInventoryThumb(item){return item.imageData?`<img class="inventory-thumb" src="${item.imageData}" alt="">`:"";}
  function renderInventoryCard(item){const archived=item.status==="Archived";const status=archived?"Archived":inventoryStatus(item);return `<article class="inventory-item-card ${archived?"is-archived":""}"><div class="inventory-card-image">${renderInventoryThumb(item)}</div><div class="inventory-item-top"><div><p class="eyebrow">${escapeHTML(item.restockType==="purchase"?"Purchase to restock":item.restockType==="make"?"Make to restock":"Print to restock")}</p><h4>${escapeHTML(item.name)}</h4><small>${escapeHTML(item.craft||"Shared")} · ${escapeHTML(item.materialType||"Other")}</small></div><span class="inventory-stock-badge ${status.toLowerCase()}">${escapeHTML(status)}</span></div>${item.tracking==="quantity"?`<div class="inventory-quantity"><button data-action="adjust-inventory" data-item-id="${item.id}" data-delta="-1">−</button><strong>${Number(item.quantity||0)}</strong><button data-action="adjust-inventory" data-item-id="${item.id}" data-delta="1">+</button></div><div class="inventory-thresholds"><span>Reorder at <strong>${Number(item.reorderAt||0)}</strong></span><span>Preferred <strong>${Number(item.preferredStock||0)}</strong></span></div>`:`<label class="inventory-condition-label">Stock condition<select data-action="inventory-condition" data-item-id="${item.id}">${["Available","Getting Low","Replace Soon","Out"].map(v=>`<option value="${v}" ${item.condition===v?"selected":""}>${v}</option>`).join("")}</select></label>`}${item.contents?.length?`<div class="kit-contents"><strong>Contains</strong><ul>${item.contents.map(c=>`<li>${escapeHTML(c)}</li>`).join("")}</ul></div>`:""}${item.category==="prepared-components"&&item.components?.length?`<div class="kit-allocation-note"><strong>Component allocation</strong><span>${(item.components||[]).map(component=>{const raw=inventoryItemById(component.itemId);return `${component.quantity} ${raw?.name||component.itemId}`;}).join(" · ")}</span></div>`:""}<div class="inventory-card-actions">${item.category==="prepared-components"?`<button class="button primary small" data-action="kit-transaction" data-mode="build" data-item-id="${item.id}">Build Packs</button><button class="button secondary small" data-action="kit-transaction" data-mode="break" data-item-id="${item.id}">Unpack</button>`:item.restockType==="make"&&item.components?.length?`<button class="button primary small" data-action="prepare-component" data-item-id="${item.id}">Prepare Batch</button>`:""}<button class="button secondary small" data-action="edit-inventory-item" data-item-id="${item.id}">Edit Details</button>${item.purchaseUrl?`<button class="button secondary small" data-action="open-inventory-link" data-item-id="${item.id}">Open Supplier</button>`:""}${archived?`<button class="button secondary small" data-action="restore-inventory-item" data-item-id="${item.id}">Restore</button>`:`<button class="button secondary small" data-action="archive-inventory-item" data-item-id="${item.id}">Archive</button>`}<button class="button secondary small danger-outline" data-action="delete-inventory-item" data-item-id="${item.id}">Delete</button></div></article>`;}
  function preparedComponentAvailability(component,count=1){
    return (component.components||[]).map(entry=>{const source=inventoryItemById(entry.itemId);const needed=Number(entry.quantity||0)*Number(count||1);return {source,needed,available:Number(source?.quantity||0)};}).filter(row=>!row.source||row.source.tracking!=="quantity"||row.available<row.needed);
  }
  function prepareComponentBatch(componentId,count=1){
    const component=inventoryItemById(componentId); count=Math.max(1,Number(count||1));
    if(!component||component.tracking!=="quantity"||!(component.components||[]).length)return false;
    const shortages=preparedComponentAvailability(component,count);
    if(shortages.length){showToast(`Not enough materials to prepare ${count} ${component.name}.`);return false;}
    (component.components||[]).forEach(entry=>{const source=inventoryItemById(entry.itemId);const qty=Number(entry.quantity||0)*count;source.quantity=Number(source.quantity||0)-qty;recordInventoryTransaction({type:"consume",itemId:source.id,quantity:-qty,reason:"Prepared component",details:`Used to prepare ${count} ${component.name}.`,relatedItemId:component.id,source:"ready-packs"});});
    component.quantity=Number(component.quantity||0)+count;
    recordInventoryTransaction({type:"build",itemId:component.id,quantity:count,reason:"Prepared component",details:`Prepared ${count} ${component.name}.`,relatedItemId:component.id,source:"ready-packs"});
    saveData(); return true;
  }
  function showPrepareComponent(componentId){
    const component=inventoryItemById(componentId); if(!component)return;
    showModal(`Prepare ${component.name}`,`<form id="prepareComponentForm"><label>Quantity<input name="quantity" type="number" min="1" value="1"></label><div class="shipping-rule"><strong>Each one uses:</strong> ${(component.components||[]).map(entry=>`${entry.quantity} ${escapeHTML(inventoryItemById(entry.itemId)?.name||entry.itemId)}`).join(" · ")}</div></form>`,[{label:"Cancel"},{label:"Prepare",kind:"primary",onClick:()=>{const count=Number(new FormData(document.getElementById("prepareComponentForm")).get("quantity")||1);if(prepareComponentBatch(componentId,count)){renderInventoryCatalog(inventoryViewState.category||"prepared-components");showToast(`${count} ${component.name} prepared.`);}}}]);
  }

  function renderInventoryAlert(item){return `<div class="inventory-alert-row"><div><strong>${escapeHTML(item.name)}</strong><span>${item.tracking==="quantity"?`${Number(item.quantity||0)} on hand · reorder at ${Number(item.reorderAt||0)}`:escapeHTML(item.condition||"Not set")}</span></div><button class="text-button" data-action="edit-inventory-item" data-item-id="${item.id}">Update</button></div>`;}
  function renderCombinedRestockCenter(attentionItems,orderNeeds){const purchase=attentionItems.filter(i=>i.restockType==="purchase"),make=attentionItems.filter(i=>i.restockType==="make"),print=attentionItems.filter(i=>i.restockType==="print");return `<section class="restock-section-group">${renderRestockBucket("Purchase to Restock","Supplies to order from a vendor.",purchase,"purchase")}${renderRestockBucket("Make to Restock","Fabrication kits or finished products to make ahead.",make,"make")}${renderRestockBucket("Print to Restock","Tags, care sheets, and company stickers to print or cut.",print,"print")}<section class="panel"><div class="panel-heading"><div><p class="eyebrow">Active-order needs</p><h3>Materials Needed for Current Orders</h3></div></div>${orderNeeds.length?orderNeeds.map(renderRestockGroup).join(""):"<p>No active order materials are currently flagged.</p>"}</section></section>`;}
  function renderRestockBucket(title,description,items,type){return `<section class="panel restock-bucket"><div class="panel-heading"><div><p class="eyebrow">${escapeHTML(type)}</p><h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p></div></div><div class="inventory-alert-stack">${items.length?items.map(item=>`<div class="inventory-alert-row"><div><strong>${escapeHTML(item.name)}</strong><span>${item.tracking==="quantity"?`${Number(item.quantity||0)} on hand · target ${Number(item.preferredStock||0)}`:escapeHTML(item.condition||"Not set")}</span></div><button class="button secondary small" data-action="edit-inventory-item" data-item-id="${item.id}">${type==="purchase"?"Update / Supplier":type==="make"?"Adjust Stock":"Adjust / Print Link"}</button></div>`).join(""):`<p>Nothing currently needs to be ${type==="purchase"?"purchased":type==="make"?"made":"printed"}.</p>`}</div></section>`;}

  function adjustInventory(itemId,delta) {
    const item = inventoryItemById(itemId);
    if (!item || item.tracking !== "quantity") return;
    const next = Math.max(0, Number(item.quantity || 0) + Number(delta));
    const actualDelta = next - Number(item.quantity || 0);
    if (!actualDelta) return;
    item.quantity = next;
    item.lastCountedAt = new Date().toISOString();
    recordInventoryTransaction({
      type:"quick-adjustment",
      itemId:item.id,
      quantity:actualDelta,
      reason:"Quick quantity adjustment"
    });
    data.activity.unshift({text:`Adjusted ${item.name} to ${next}`,time:"Just now"});
    saveData();
    renderInventoryCatalog(inventoryViewState.category || "overview");
  }

  function updateInventoryCondition(itemId,condition) {
    const item = inventoryItemById(itemId);
    if (!item) return;
    item.condition = condition;
    data.activity.unshift({text:`Marked ${item.name} as ${condition}`,time:"Just now"});
    saveData();
    renderInventoryCatalog(inventoryViewState.category || "overview");
  }


  function showRecordYarnUse(itemId) {
    const item=inventoryItemById(itemId);
    if (!item || !isYarnOrCord(item) || item.yarnTrackingMode !== "precise") return;
    const unit=item.yarnLengthUnit || "yd";
    const history=(item.yarnUsageHistory || []).slice(0,8);
    showModal("Record Yarn or Cord Use", `<form id="recordYarnUseForm" class="stock-adjustment-form yarn-use-form"><div class="yarn-current-balance"><span>Current remaining</span><strong>${formatInventoryNumber(item.yarnRemainingLength)} ${escapeHTML(unit)}</strong></div><label><span>Amount Just Used</span><input name="amountUsed" type="number" min="0.01" step="0.01" inputmode="decimal" autofocus><small>Workshop will subtract this from the current remaining amount.</small></label><label><span>Note (optional)</span><input name="note" placeholder="Example: Paper towel holder order"></label><details class="yarn-recalibrate"><summary>Recorded amount is no longer accurate</summary><label><span>Set current remaining amount</span><input name="recalibratedRemaining" type="number" min="0" step="0.01" inputmode="decimal"></label><small>Use this to restart from what is actually left. Earlier history stays saved.</small></details></form>${history.length?`<div class="yarn-usage-history"><h4>Recent History</h4>${history.map(entry=>`<div><span>${escapeHTML(new Date(entry.date).toLocaleDateString())}</span><strong>${entry.type==="recalibration"?"Adjusted":`−${formatInventoryNumber(entry.amount)} ${escapeHTML(unit)}`}</strong><span>${formatInventoryNumber(entry.remaining)} ${escapeHTML(unit)} left</span><small>${escapeHTML(entry.note||"")}</small></div>`).join("")}</div>`:""}`, [{label:"Cancel"},{label:"Record Usage",kind:"primary",keepOpen:true,onClick:()=>saveYarnUse(itemId)}]);
  }

  function saveYarnUse(itemId) {
    const item=inventoryItemById(itemId); const form=document.getElementById("recordYarnUseForm");
    if (!item || !form) return;
    const fd=new FormData(form); const recalibrated=String(fd.get("recalibratedRemaining")||"").trim(); const used=Number(fd.get("amountUsed")||0); const note=String(fd.get("note")||"").trim();
    item.yarnUsageHistory ||= [];
    if (recalibrated !== "") {
      const next=Math.max(0,Number(recalibrated)); const previous=Number(item.yarnRemainingLength||0); item.yarnRemainingLength=next;
      item.yarnUsageHistory.unshift({id:uid("yarn-use"),date:new Date().toISOString(),type:"recalibration",previous,remaining:next,note:note||"Manual recalibration"});
    } else {
      if (!(used > 0)) return showToast("Enter the amount used.");
      if (used > Number(item.yarnRemainingLength||0)) return showToast("Usage cannot be more than the recorded amount remaining. Recalibrate instead.");
      item.yarnRemainingLength=Number(item.yarnRemainingLength||0)-used;
      item.yarnUsageHistory.unshift({id:uid("yarn-use"),date:new Date().toISOString(),type:"usage",amount:used,remaining:item.yarnRemainingLength,note});
    }
    data.activity.unshift({text:`Updated yarn remaining for ${item.name}`,time:"Just now"}); saveData(); hideModal(); renderInventoryCatalog(inventoryViewState.category||"overview"); showToast("Yarn inventory updated.");
  }

  function setupRelationshipMultiselect(root) {
    if (!root) return;
    const update = () => {
      const checked = [...root.querySelectorAll('input[type="checkbox"]:checked')];
      const count = root.querySelector('.relationship-summary-count');
      const label = root.querySelector('.relationship-summary-label');
      if (count) count.textContent = checked.length ? `${checked.length} selected` : "None selected";
      if (label) label.textContent = checked.length === 1 ? checked[0].closest('label')?.querySelector('strong')?.textContent || "1 selected" : "Select linked items";
    };
    root.querySelectorAll('input[type="checkbox"]').forEach(input => input.addEventListener('change', update));
    update();
  }

  function showNewInventoryItemChooser() {
    const choices = [
      {id:"yarn-cord",icon:"🧶",title:"Yarn or Cord",copy:"Cord, yarn, fiber, or another stocked material.",draft:{materialType:"Yarn & Cord",craft:"Macramé",tracking:"condition",restockType:"purchase"}},
      {id:"accessory",icon:"🪵",title:"Accessory",copy:"Wood, hardware, rings, dowels, beads, or notions.",draft:{materialType:"Wood",craft:"Shared",tracking:"quantity",restockType:"purchase"}},
      {id:"ready-pack",icon:"📦",title:"Ready Pack",copy:"A prepared set or component ready for production.",draft:{materialType:"Ready Pack",craft:"Macramé",tracking:"quantity",restockType:"make"}},
      {id:"packaging",icon:"✉️",title:"Packaging",copy:"Mailers, labels, or other packing supplies.",draft:{materialType:"Mailer",craft:"Shared",tracking:"quantity",restockType:"purchase"}},
      {id:"print-branding",icon:"🖨️",title:"Print or Branding",copy:"Care sheets, tags, stickers, or printed materials.",draft:{materialType:"Care Sheet",craft:"Shared",tracking:"quantity",restockType:"print"}},
      {id:"finished",icon:"🎁",title:"Finished Product",copy:"A completed product held in finished inventory.",draft:{materialType:"Finished Product",craft:"Shared",tracking:"quantity",restockType:"make"}},
      {id:"other",icon:"＋",title:"Other",copy:"Start with a blank inventory item.",draft:{craft:"Shared",tracking:"quantity",restockType:"purchase"}}
    ];
    showModal("What would you like to add?", `<div class="inventory-type-chooser">${choices.map(choice=>`<button type="button" class="inventory-type-choice" data-action="choose-inventory-type" data-choice="${choice.id}"><span class="inventory-type-choice-icon" aria-hidden="true">${choice.icon}</span><span><strong>${escapeHTML(choice.title)}</strong><small>${escapeHTML(choice.copy)}</small></span></button>`).join("")}</div>`, [{label:"Cancel"}]);
    window.__inventoryTypeChoices = Object.fromEntries(choices.map(choice=>[choice.id,choice.draft]));
  }

  function showInventoryItemEditor(itemId = null, draft = null) {
    const existingItem=itemId?inventoryItemById(itemId):null;
    const item=draft?{...(existingItem||{}),...draft}:existingItem;
    const currentType=item?.materialType||"";
    const typeOptions=inventoryMaterialTypes().filter(type=>type.status!=="Inactive" || type.name===currentType).sort((a,b)=>a.name.localeCompare(b.name)).map(type=>`<option value="${escapeHTML(type.name)}" ${currentType===type.name?"selected":""}>${escapeHTML(type.name)}</option>`).join("");
    const isCondition=item?.tracking==="condition";
    const whereUsed=existingItem?inventoryReferenceSummary(existingItem.id):`<p class="where-used-empty">Save this item to see where it is used.</p>`;
    const footer=[{label:"Cancel"}];
    if(existingItem){footer.push({label:existingItem.status==="Archived"?"Restore":"Archive",kind:"secondary",onClick:()=>{hideModal();existingItem.status==="Archived"?setInventoryItemArchived(existingItem.id,false):confirmArchiveInventoryItem(existingItem.id);}});footer.push({label:"Delete",kind:"danger",onClick:()=>{hideModal();confirmDeleteInventoryItem(existingItem.id);}});}
    footer.push({label:existingItem?"Save Changes":"Add Item",kind:"primary",keepOpen:true,onClick:()=>saveInventoryItem(itemId)});
    showModal(existingItem?"Edit Inventory Item":"Add Inventory Item",`<form id="inventoryItemForm" class="inventory-editor-form inventory-editor-redesign">
      <section class="inventory-form-section inventory-basics-section"><div class="inventory-form-heading"><span>Inventory basics</span><h4>Item Details</h4><p>Name the item and decide where it belongs in your workshop inventory.</p></div><div class="inventory-form-grid"><label class="inventory-field"><span>Item Name <em>*</em></span><input name="name" value="${escapeHTML(item?.name||"")}" required></label><label class="inventory-field"><span>Material / Item Type <em>*</em></span><select name="materialType" required><option value="">Select a material type</option>${typeOptions}<option value="__new__">+ Add a new material type…</option></select><small>The selected type controls its Inventory tab.</small></label><label class="inventory-field full-width inventory-new-type-field"><span>New Material Type</span><input name="newMaterialType" value="${escapeHTML(item?.newMaterialType||"")}" placeholder="Example: Beads, Fabric, Ribbon"><small>New raw-material types appear as Inventory tabs.</small></label><label class="inventory-field"><span>Craft</span><select name="craft">${["Macramé","Crochet","Shared","Other"].map(v=>`<option value="${v}" ${item?.craft===v?"selected":""}>${v}</option>`).join("")}</select></label><label class="inventory-field"><span>Status</span><select name="status"><option value="Active" ${item?.status!=="Archived"?"selected":""}>Active</option><option value="Archived" ${item?.status==="Archived"?"selected":""}>Archived</option></select></label></div></section>
      <section class="inventory-form-section inventory-stock-section"><div class="inventory-form-heading"><span>Stock & reordering</span><h4>Inventory Levels</h4><p>Track counted stock or the condition of reusable workshop items.</p></div><div class="inventory-form-grid"><label class="inventory-field"><span>Tracking</span><select name="tracking"><option value="quantity" ${!isCondition?"selected":""}>Quantity</option><option value="condition" ${isCondition?"selected":""}>Condition</option></select></label><label class="inventory-field"><span>Restock Method</span><select name="restockType"><option value="purchase" ${item?.restockType==="purchase"?"selected":""}>Purchase</option><option value="make" ${item?.restockType==="make"?"selected":""}>Make</option><option value="print" ${item?.restockType==="print"?"selected":""}>Print</option></select></label><label class="inventory-field quantity-field"><span>Current Quantity</span><input name="quantity" type="number" min="0" value="${Number(item?.quantity||0)}"></label><label class="inventory-field quantity-field"><span>Reorder At</span><input name="reorderAt" type="number" min="0" value="${Number(item?.reorderAt||0)}"></label><label class="inventory-field quantity-field"><span>Preferred Stock</span><input name="preferredStock" type="number" min="0" value="${Number(item?.preferredStock||0)}"></label><label class="inventory-field condition-field"><span>Condition</span><select name="condition">${["Available","Getting Low","Replace Soon","Out"].map(v=>`<option value="${v}" ${item?.condition===v?"selected":""}>${v}</option>`).join("")}</select></label></div></section>
      <section class="inventory-form-section inventory-yarn-section" ${isYarnOrCord(item) ? "" : "hidden"}><div class="inventory-form-heading"><span>Yarn & cord tracking</span><h4>Choose Your Detail Level</h4><p>Use simple inventory, a quick visual estimate, or precise length. You can switch modes later without deleting prior history.</p></div><div class="inventory-form-grid"><label class="inventory-field"><span>Inventory Tracking</span><select name="yarnTrackingMode"><option value="simple" ${(item?.yarnTrackingMode||"simple")==="simple"?"selected":""}>Simple</option><option value="approximate" ${item?.yarnTrackingMode==="approximate"?"selected":""}>Approximate</option><option value="precise" ${item?.yarnTrackingMode==="precise"?"selected":""}>Precise</option></select></label><label class="inventory-field yarn-approximate-field"><span>Current Level</span><select name="yarnApproximateLevel">${YARN_LEVELS.map(level=>`<option value="${level}" ${item?.yarnApproximateLevel===level?"selected":""}>${level}</option>`).join("")}</select></label><label class="inventory-field yarn-precise-field"><span>Original Length</span><input name="yarnOriginalLength" type="number" min="0" step="0.01" value="${Number(item?.yarnOriginalLength||0)}"></label><label class="inventory-field yarn-precise-field"><span>Remaining Length</span><input name="yarnRemainingLength" type="number" min="0" step="0.01" value="${Number(item?.yarnRemainingLength||0)}"><small>Use this for setup or recalibration—not for everyday subtraction.</small></label><label class="inventory-field yarn-precise-field"><span>Unit</span><select name="yarnLengthUnit"><option value="yd" ${item?.yarnLengthUnit!=="m"?"selected":""}>Yards</option><option value="m" ${item?.yarnLengthUnit==="m"?"selected":""}>Meters</option></select></label></div><div class="yarn-record-use-callout yarn-precise-field"><div><strong>Used some yarn or cord?</strong><p>Enter the amount used through Record Use and Workshop will subtract it automatically.</p></div>${existingItem&&item?.yarnTrackingMode==="precise"?`<button type="button" class="button primary small" data-action="record-yarn-use" data-item-id="${existingItem.id}">Record Use</button>`:`<small>Save this item with Precise tracking first. Then Record Use will appear in its inventory row.</small>`}</div></section>
      <section class="inventory-form-section inventory-purchasing-section"><div class="inventory-form-heading"><span>Supplier & purchasing</span><h4>Where It Comes From</h4><p>Keep the supplier directory separate from the exact product purchase link.</p></div><div class="inventory-form-grid"><div class="inventory-field supplier-picker-field"><span>Supplier</span><div class="supplier-picker-row"><select name="supplierId"><option value="">No supplier selected</option>${suppliers().filter(supplier=>supplier.status!=="Inactive" || supplier.id===item?.supplierId).sort((a,b)=>a.name.localeCompare(b.name)).map(supplier=>`<option value="${supplier.id}" ${item?.supplierId===supplier.id?"selected":""}>${escapeHTML(supplier.name)}</option>`).join("")}</select><button type="button" class="button secondary small supplier-inline-add" data-action="add-supplier-from-inventory" data-item-id="${itemId||""}">+ Add New Supplier</button></div><small>Create a supplier without losing this inventory form.</small></div><label class="inventory-field"><span>Purchase URL</span><input name="purchaseUrl" value="${escapeHTML(item?.purchaseUrl||item?.resourceUrl||"")}" placeholder="Exact item listing"></label></div></section>
      <section class="inventory-form-section inventory-print-section"><div class="inventory-form-heading"><span>Print settings</span><h4>Printable Inventory</h4><p>These fields appear for care sheets, product tags, stickers, and other printed supplies.</p></div><div class="inventory-form-grid"><label class="inventory-field"><span>Default Print Quantity</span><input name="defaultPrintQuantity" type="number" min="1" value="${Number(item?.defaultPrintQuantity||10)}"></label><label class="inventory-field"><span>Printable File</span><input name="printableFile" value="${escapeHTML(item?.printableFile||"")}" placeholder="printables/example.pdf"></label></div></section>
      <section class="inventory-form-section inventory-photo-section"><div class="inventory-form-heading"><span>Photo</span><h4>Item Image</h4><p>Add a workshop reference photo when it helps distinguish similar supplies.</p></div><div class="inventory-photo-layout"><label class="inventory-photo-control"><span>Choose Photo</span><input id="inventoryImageInput" type="file" accept="image/*"></label><div class="inventory-image-preview" id="inventoryImagePreview">${item?.imageData?`<img src="${item.imageData}" alt="">`:`<span>No photo added</span>`}</div></div></section>
      <section class="inventory-form-section inventory-product-links-section"><div class="inventory-form-heading"><span>Products</span><h4>Linked Products</h4><p>Choose one or more products from the dropdown. Automatic packaging and prepared-component connections remain protected.</p></div><details class="relationship-multiselect" id="inventoryLinkedProducts"><summary><span class="relationship-summary-label">Select linked products</span><span class="relationship-summary-count"></span></summary><div class="relationship-options">${productMasters().slice().sort((a,b)=>a.name.localeCompare(b.name)).map(master=>{const checked=(item?.linkedProductIds||productsUsingInventoryItem(existingItem?.id||"").map(product=>product.id)).includes(master.id);const automatic=existingItem?productUsesInventoryItemAutomatically(master,existingItem.id):false;return `<label class="relationship-option ${automatic?"is-automatic":""}"><input type="checkbox" name="linkedProductIds" value="${master.id}" ${checked?"checked":""} ${automatic?"disabled":""}><span><strong>${escapeHTML(master.name)}</strong><small>${escapeHTML(master.code||master.craft||"")}${automatic?" · Automatic connection":""}</small></span>${automatic?`<input type="hidden" name="linkedProductIds" value="${master.id}">`:""}</label>`;}).join("")}</div></details></section>
      <section class="inventory-form-section inventory-notes-section"><div class="inventory-form-heading"><span>Notes</span><h4>Workshop Notes</h4><p>Record dimensions, supplier details, or anything useful when restocking.</p></div><label class="inventory-field"><span>Description / Notes</span><textarea name="notes" rows="4">${escapeHTML(item?.notes||"")}</textarea></label></section>
      <aside class="inventory-where-used connects-to-panel"><div class="inventory-form-heading"><span>Connections</span><h4>Connects To</h4><p>A live summary of the products selected above and the item’s other saved relationships.</p></div><div class="reference-summary" id="inventoryConnectsToSummary">${whereUsed}</div></aside>
    </form>`,footer);
    const form=document.getElementById("inventoryItemForm");
    setupRelationshipMultiselect(document.getElementById("inventoryLinkedProducts"));
    const updateInventoryConnectsSummary = () => {
      const target=document.getElementById("inventoryConnectsToSummary");
      if(!target) return;
      const selected=[...form.querySelectorAll('input[name="linkedProductIds"]:checked, input[type="hidden"][name="linkedProductIds"]')].map(input=>productMasterById(input.value)).filter(Boolean);
      const unique=[...new Map(selected.map(product=>[product.id,product])).values()];
      const savedOther=existingItem?inventoryReferenceSummary(existingItem.id,{excludeProducts:true}):"";
      target.innerHTML=`${unique.length?`<div class="connection-summary-group"><strong>Products</strong><div class="connection-pill-list">${unique.map(product=>`<span class="connection-pill">${escapeHTML(product.name)}</span>`).join("")}</div></div>`:`<p class="where-used-empty">No products selected yet.</p>`}${savedOther?`<div class="saved-connection-details">${savedOther}</div>`:""}`;
    };
    form?.querySelectorAll('input[name="linkedProductIds"]').forEach(input=>input.addEventListener("change",updateInventoryConnectsSummary));
    updateInventoryConnectsSummary();
    const typeSelect=form?.querySelector('select[name="materialType"]');
    const newTypeField=form?.querySelector(".inventory-new-type-field");
    const trackingSelect=form?.querySelector('select[name="tracking"]');
    const restockSelect=form?.querySelector('select[name="restockType"]');
    const sync=()=>{if(newTypeField)newTypeField.hidden=typeSelect?.value!=="__new__";const condition=trackingSelect?.value==="condition";form?.querySelectorAll(".quantity-field").forEach(el=>el.hidden=condition);form?.querySelectorAll(".condition-field").forEach(el=>el.hidden=!condition);const printable=restockSelect?.value==="print" || ["Care Sheet","Product Tag","Sticker"].includes(typeSelect?.value);form?.querySelector(".inventory-print-section")?.toggleAttribute("hidden",!printable);const yarn=/yarn|cord/i.test(typeSelect?.value||"");form?.querySelector(".inventory-yarn-section")?.toggleAttribute("hidden",!yarn);const yarnMode=form?.querySelector('[name="yarnTrackingMode"]')?.value||"simple";form?.querySelectorAll(".yarn-approximate-field").forEach(el=>el.hidden=yarnMode!=="approximate");form?.querySelectorAll(".yarn-precise-field").forEach(el=>el.hidden=yarnMode!=="precise");};
    typeSelect?.addEventListener("change",sync); trackingSelect?.addEventListener("change",sync); restockSelect?.addEventListener("change",sync); form?.querySelector('[name="yarnTrackingMode"]')?.addEventListener("change",sync); sync();
    const input=document.getElementById("inventoryImageInput"); if(input)input.addEventListener("change",async()=>{const file=input.files?.[0];if(!file)return;const compressed=await compressInventoryImage(file);input.dataset.imageData=compressed;document.getElementById("inventoryImagePreview").innerHTML=`<img src="${compressed}" alt="">`;});
  }
  function compressInventoryImage(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const image=new Image();image.onerror=reject;image.onload=()=>{const max=480,scale=Math.min(1,max/Math.max(image.width,image.height)),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/jpeg",.72));};image.src=reader.result;};reader.readAsDataURL(file);});}


  function inventoryItemReferences(itemId) {
    const products = productsUsingInventoryItem(itemId);
    const components = inventoryItems().filter(item => item.id !== itemId && (item.components || []).some(component => component.itemId === itemId));
    const colors = colorsCatalog().filter(color => color.inventoryItemId === itemId);
    const transactions = (data.inventoryTransactions || []).filter(tx => tx.itemId === itemId);
    const orderIds = [...new Set(transactions.map(tx => tx.orderId).filter(Boolean))];
    const orders = (data.orders || []).filter(order => orderIds.includes(order.id));
    return {products,components,colors,transactions,orders};
  }

  function inventoryReferenceSummary(itemId, options = {}) {
    const refs=inventoryItemReferences(itemId);
    const groups=[];
    if(!options.excludeProducts && refs.products.length) groups.push(`<div><strong>Products</strong><span>${refs.products.map(product=>escapeHTML(product.name)).join(", ")}</span></div>`);
    if(refs.components.length) groups.push(`<div><strong>Ready packs</strong><span>${refs.components.map(item=>escapeHTML(item.name)).join(", ")}</span></div>`);
    if(refs.colors.length) groups.push(`<div><strong>Colors</strong><span>${refs.colors.map(color=>escapeHTML(color.name)).join(", ")}</span></div>`);
    if(refs.orders.length) groups.push(`<div><strong>Orders</strong><span>${refs.orders.length} linked order${refs.orders.length===1?"":"s"}</span></div>`);
    if(refs.transactions.length) groups.push(`<div><strong>Inventory history</strong><span>${refs.transactions.length} transaction${refs.transactions.length===1?"":"s"}</span></div>`);
    return groups.length?groups.join(""):`<p class="where-used-empty">No product, color, prepared-component, order, or transaction references.</p>`;
  }

  function confirmArchiveInventoryItem(itemId) {
    const item=inventoryItemById(itemId); if(!item)return;
    showModal("Archive inventory item?",`<p><strong>${escapeHTML(item.name)}</strong> will be hidden from active inventory lists, reorder views, and new dropdown selections. Historical links remain intact.</p><div class="reference-summary">${inventoryReferenceSummary(itemId)}</div>`,[{label:"Keep Active"},{label:"Archive Item",kind:"primary",onClick:()=>setInventoryItemArchived(itemId,true)}]);
  }

  function setInventoryItemArchived(itemId,archived) {
    const item=inventoryItemById(itemId); if(!item)return;
    item.status=archived?"Archived":"Active";
    data.activity.unshift({text:`${archived?"Archived":"Restored"} inventory item: ${item.name}`,time:"Just now"});
    saveData(); renderInventoryCatalog(inventoryViewState.category||"overview"); showToast(archived?"Inventory item archived.":"Inventory item restored.");
  }

  function confirmDeleteInventoryItem(itemId) {
    const item=inventoryItemById(itemId); if(!item)return;
    const refs=inventoryItemReferences(itemId);
    const blocked=refs.products.length||refs.components.length||refs.colors.length||refs.orders.length||refs.transactions.length;
    if(blocked) return showModal("This item cannot be deleted",`<p><strong>${escapeHTML(item.name)}</strong> is still connected to workshop records. Archive it instead to preserve those relationships.</p><div class="reference-summary">${inventoryReferenceSummary(itemId)}</div>`,[{label:"Close"},{label:item.status==="Archived"?"Already Archived":"Archive Instead",kind:"primary",onClick:item.status==="Archived"?null:()=>setInventoryItemArchived(itemId,true)}].filter(button=>button.onClick||button.label!=="Already Archived"));
    showModal("Delete inventory item?",`<p>This permanently removes <strong>${escapeHTML(item.name)}</strong>. This item has no linked products, colors, components, orders, or transaction history.</p>`,[{label:"Keep Item"},{label:"Delete Item",kind:"danger",onClick:()=>deleteInventoryItem(itemId)}]);
  }

  function deleteInventoryItem(itemId) {
    const item=inventoryItemById(itemId); if(!item)return;
    data.inventoryCatalog.items=data.inventoryCatalog.items.filter(entry=>entry.id!==itemId);
    data.activity.unshift({text:`Deleted inventory item: ${item.name}`,time:"Just now"});
    saveData(); renderInventoryCatalog(inventoryViewState.category||"overview"); showToast("Inventory item deleted.");
  }

  function saveInventoryItem(itemId) {
    const form = document.getElementById("inventoryItemForm");
    if (!form) return;
    const formData = new FormData(form);
    const tracking = formData.get("tracking");
    const existing = itemId ? inventoryItemById(itemId) : null;
    let materialType = String(formData.get("materialType") || "").trim();
    if (materialType === "__new__") {
      const newName = String(formData.get("newMaterialType") || "").trim();
      if (!newName) { showToast("Enter a name for the new material type."); return; }
      const duplicate = inventoryMaterialTypes().find(type => type.name.toLowerCase() === newName.toLowerCase());
      if (duplicate) materialType = duplicate.name;
      else {
        const record = {id:slugifyMaterialType(newName),name:newName,categoryId:"accessories",showAsTab:true,status:"Active"};
        data.inventoryMaterialTypes.push(record);
        materialType = newName;
      }
    }
    if (!materialType) { showToast("Material Type is required."); return; }
    const typeRecord = inventoryMaterialTypeByName(materialType);
    const category = typeRecord?.categoryId || "accessories";
    const yarnMode = isYarnOrCord({materialType,category}) ? (formData.get("yarnTrackingMode") || existing?.yarnTrackingMode || "simple") : undefined;
    const originalLength = Math.max(0, Number(formData.get("yarnOriginalLength") || existing?.yarnOriginalLength || 0));
    const remainingLengthInput = String(formData.get("yarnRemainingLength") ?? "").trim();
    const remainingLength = remainingLengthInput === ""
      ? (existing ? Math.max(0, Number(existing.yarnRemainingLength || 0)) : (yarnMode === "precise" ? originalLength : 0))
      : Math.max(0, Number(remainingLengthInput));
    const updated = {
      ...(existing || {}),
      id: existing?.id || uid("inventory"),
      name: formData.get("name").trim(),
      category,
      materialType,
      craft: formData.get("craft"),
      status: formData.get("status") || "Active",
      tracking,
      restockType: formData.get("restockType"),
      quantity: Math.max(0, Number(formData.get("quantity") || 0)),
      reorderAt: Math.max(0, Number(formData.get("reorderAt") || 0)),
      preferredStock: Math.max(0, Number(formData.get("preferredStock") || 0)),
      defaultPrintQuantity: Math.max(1, Number(formData.get("defaultPrintQuantity") || existing?.defaultPrintQuantity || 10)),
      printableFile: formData.get("printableFile").trim(),
      condition: formData.get("condition"),
      supplierId: formData.get("supplierId") || "",
      supplier: supplierById(formData.get("supplierId"))?.name || "",
      purchaseUrl: normalizeExternalUrl(formData.get("purchaseUrl")),
      notes: formData.get("notes").trim(),
      imageData: document.getElementById("inventoryImageInput")?.dataset.imageData || existing?.imageData || "",
      linkedProductIds: [...new Set(formData.getAll("linkedProductIds"))],
      lastCountedAt: tracking === "quantity" ? new Date().toISOString() : existing?.lastCountedAt || null,
      yarnTrackingMode: yarnMode,
      yarnApproximateLevel: formData.get("yarnApproximateLevel") || existing?.yarnApproximateLevel || "Full",
      yarnOriginalLength: originalLength,
      yarnRemainingLength: remainingLength,
      yarnLengthUnit: formData.get("yarnLengthUnit") || existing?.yarnLengthUnit || "yd",
      yarnUsageHistory: existing?.yarnUsageHistory || []
    };
    if (existing) Object.assign(existing,updated);
    else data.inventoryCatalog.items.push(updated);
    syncProductLinksFromInventoryItem(updated, updated.linkedProductIds);
    syncInventoryProductLinks();
    data.activity.unshift({text:`${existing ? "Updated" : "Added"} inventory item: ${updated.name}`,time:"Just now"});
    saveData();
    const destination = updated.category || inventoryViewState.category || "overview";
    renderInventoryCatalog(destination);
    showToast(existing ? "Inventory item updated." : "Inventory item added.");
    hideModal();
  }

  function collectInventoryItemDraft() {
    const form=document.getElementById("inventoryItemForm");
    if(!form) return null;
    const fd=new FormData(form);
    const imageInput=document.getElementById("inventoryImageInput");
    const existingImage=document.querySelector("#inventoryImagePreview img")?.getAttribute("src") || "";
    return {
      name:String(fd.get("name")||""),
      materialType:String(fd.get("materialType")||""),
      newMaterialType:String(fd.get("newMaterialType")||""),
      craft:String(fd.get("craft")||"Shared"),
      status:String(fd.get("status")||"Active"),
      tracking:String(fd.get("tracking")||"quantity"),
      restockType:String(fd.get("restockType")||"purchase"),
      quantity:Number(fd.get("quantity")||0),
      reorderAt:Number(fd.get("reorderAt")||0),
      preferredStock:Number(fd.get("preferredStock")||0),
      condition:String(fd.get("condition")||"Available"),
      supplierId:String(fd.get("supplierId")||""),
      purchaseUrl:String(fd.get("purchaseUrl")||""),
      defaultPrintQuantity:Number(fd.get("defaultPrintQuantity")||10),
      printableFile:String(fd.get("printableFile")||""),
      linkedProductIds:fd.getAll("linkedProductIds"),
      notes:String(fd.get("notes")||""),
      imageData:imageInput?.dataset.imageData || existingImage
    };
  }

  function renderSuppliersTable() {
    const rows = suppliers().slice().sort((a,b) => a.name.localeCompare(b.name));
    return `
      <section class="inventory-table-card supplier-table-card">
        <div class="supplier-data-table supplier-data-table-head"><span>Supplier</span><span>Contact</span><span>Items</span><span>Status</span><span>Actions</span></div>
        ${rows.length ? rows.map(supplier => {
          const linkedItems = itemsForSupplier(supplier.id);
          return `<article class="supplier-data-table"><div class="supplier-name-cell">${supplier.website ? `<a class="supplier-main-link" href="${escapeHTML(normalizeSupplierWebsite(supplier.website))}" target="_blank" rel="noopener"><strong>${escapeHTML(supplier.name)}</strong><span aria-hidden="true">↗</span></a>` : `<strong>${escapeHTML(supplier.name)}</strong>`}${supplier.website ? `<small>${escapeHTML(normalizeSupplierWebsite(supplier.website))}</small>` : ""}${supplier.notes ? `<small>${escapeHTML(supplier.notes)}</small>` : ""}</div><div><strong>${escapeHTML(supplier.contactName || "—")}</strong><small>${escapeHTML(supplier.email || supplier.phone || "No contact details")}</small></div><div><strong>${linkedItems.length}</strong><small>${linkedItems.length ? linkedItems.slice(0,3).map(item=>escapeHTML(item.name)).join(", ") : "No linked items"}${linkedItems.length>3?` +${linkedItems.length-3} more`:""}</small></div><div><span class="status-pill ${supplier.status === "Inactive" ? "low" : "good"}">${escapeHTML(supplier.status || "Active")}</span></div><div class="inventory-actions"><button class="button secondary small" data-action="edit-supplier" data-supplier-id="${supplier.id}">Edit</button></div></article>`;
        }).join("") : `<div class="empty-state"><h4>No suppliers yet</h4><p>Add the shops and vendors you use for workshop inventory.</p></div>`}
      </section>`;
  }

  function showSupplierEditor(supplierId = null, options = {}) {
    const supplier = supplierId ? supplierById(supplierId) : null;
    const linkedItems = supplier ? itemsForSupplier(supplier.id) : [];
    showModal(supplier ? "Edit Supplier" : "Add Supplier", `<form id="supplierForm" class="product-editor-form">
      <section class="product-form-section"><div class="product-section-heading"><span>Supplier details</span><h4>${supplier ? "Update Supplier" : "New Supplier"}</h4><p>Use this record in inventory dropdowns instead of typing the supplier repeatedly.</p></div><div class="product-form-grid"><label class="product-field"><span class="field-label">Supplier Name</span><input name="name" value="${escapeHTML(supplier?.name || "")}" required></label><label class="product-field"><span class="field-label">Status</span><select name="status">${["Active","Inactive"].map(value=>`<option value="${value}" ${supplier?.status===value?"selected":""}>${value}</option>`).join("")}</select></label><label class="product-field full-width"><span class="field-label">Website</span><input name="website" value="${escapeHTML(supplier?.website || "")}" placeholder="https://..."></label></div></section>
      <section class="product-form-section"><div class="product-section-heading"><span>Contact</span><h4>Contact Information</h4></div><div class="product-form-grid"><label class="product-field"><span class="field-label">Contact Name</span><input name="contactName" value="${escapeHTML(supplier?.contactName || "")}"></label><label class="product-field"><span class="field-label">Email</span><input type="email" name="email" value="${escapeHTML(supplier?.email || "")}"></label><label class="product-field"><span class="field-label">Phone</span><input name="phone" value="${escapeHTML(supplier?.phone || "")}"></label><label class="product-field"><span class="field-label">Typical Lead Time (days)</span><input type="number" min="0" name="leadTimeDays" value="${escapeHTML(String(supplier?.leadTimeDays ?? ""))}"></label></div></section>
      <section class="product-form-section"><div class="product-section-heading"><span>Purchasing</span><h4>Ordering Notes</h4></div><div class="product-form-grid"><label class="product-field"><span class="field-label">Minimum Order</span><input name="minimumOrder" value="${escapeHTML(supplier?.minimumOrder || "")}"></label><label class="product-field"><span class="field-label">Free Shipping Threshold</span><input name="freeShippingThreshold" value="${escapeHTML(supplier?.freeShippingThreshold || "")}"></label><label class="product-field full-width"><span class="field-label">Notes</span><textarea name="notes" rows="3">${escapeHTML(supplier?.notes || "")}</textarea></label></div></section>
      ${supplier ? `<section class="product-form-section"><div class="product-section-heading"><span>Inventory usage</span><h4>Items Supplied</h4><p>${linkedItems.length ? linkedItems.map(item=>escapeHTML(item.name)).join(" · ") : "No inventory items are linked yet."}</p></div></section>` : ""}
    </form>`, options.returnToInventory ? [
      {label:"Back to Inventory Item",keepOpen:true,onClick:()=>showInventoryItemEditor(options.returnToInventory.itemId || null, options.returnToInventory.draft)},
      {label:supplier?"Save Changes":"Add Supplier",kind:"primary",keepOpen:true,onClick:()=>saveSupplier(supplierId,options)}
    ] : [{label:"Cancel"},{label:supplier?"Save Changes":"Add Supplier",kind:"primary",keepOpen:true,onClick:()=>saveSupplier(supplierId,options)}]);
  }

  function saveSupplier(supplierId = null, options = {}) {
    const form = document.getElementById("supplierForm");
    if (!form) return;
    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    if (!name) return showToast("Supplier name is required.");
    const duplicate = suppliers().find(supplier => supplier.id !== supplierId && supplier.name.toLowerCase() === name.toLowerCase());
    if (duplicate) return showToast("A supplier with that name already exists.");
    const existing = supplierId ? supplierById(supplierId) : null;
    const websiteInput = String(fd.get("website") || "").trim();
    const website = normalizeSupplierWebsite(websiteInput);
    if (websiteInput && !website) return showToast("Enter a valid supplier website.");
    const updated = { ...(existing || {}), id: existing?.id || uid("supplier"), name, website, contactName:String(fd.get("contactName")||"").trim(), email:String(fd.get("email")||"").trim(), phone:String(fd.get("phone")||"").trim(), leadTimeDays:String(fd.get("leadTimeDays")||"").trim(), minimumOrder:String(fd.get("minimumOrder")||"").trim(), freeShippingThreshold:String(fd.get("freeShippingThreshold")||"").trim(), status:String(fd.get("status")||"Active"), notes:String(fd.get("notes")||"").trim() };
    if (existing) Object.assign(existing, updated); else data.suppliers.push(updated);
    inventoryItems().forEach(item => { if (item.supplierId === updated.id) item.supplier = updated.name; });
    data.activity.unshift({text:`${existing ? "Updated" : "Added"} supplier: ${updated.name}`,time:"Just now"});
    saveData();
    if(options.returnToInventory){
      const draft={...(options.returnToInventory.draft||{}),supplierId:updated.id,supplier:updated.name};
      showInventoryItemEditor(options.returnToInventory.itemId || null,draft);
      showToast(existing ? "Supplier updated and selected." : "Supplier added and selected.");
      return;
    }
    hideModal(); renderInventoryCatalog("suppliers"); showToast(existing ? "Supplier updated." : "Supplier added.");
  }

  function openInventoryLink(itemId) {
    const item = inventoryItemById(itemId);
    const url = normalizeExternalUrl(item?.purchaseUrl || item?.resourceUrl);
    if (url) window.open(url,"_blank","noopener");
    else showToast("Add a valid purchase URL for this inventory item.");
  }

  function renderRestockView() {
    pageTitle.textContent = "Inventory";
    setActiveNav("inventory");
    const groups = getRestockGroups();
    viewContainer.innerHTML = `
      <section class="page-section wide">
        <div class="section-heading workshop-heading">
          <div>
            <p class="eyebrow">Order-driven supplies</p>
            <h3>Purchase to Restock</h3>
            <p>Anything marked Need to Buy, Ordered, or Backordered inside Production Planning appears here automatically.</p>
          </div>
        </div>

        <section class="restock-summary-grid">
          <article class="summary-card"><strong>${groups.length}</strong><span>Materials needing attention</span></article>
          <article class="summary-card"><strong>${groups.reduce((sum,g) => sum + g.items.length,0)}</strong><span>Affected production items</span></article>
          <article class="summary-card"><strong>${groups.filter(g => groupPrimaryStatus(g)==="Need to Buy").length}</strong><span>Ready to purchase</span></article>
        </section>

        <div class="restock-list">
          ${groups.length ? groups.map(group => renderRestockGroup(group)).join("") : `
            <section class="panel empty-restock">
              <div class="placeholder-icon">✓</div>
              <h3>Nothing needs to be purchased.</h3>
              <p>Materials marked unavailable in Production Planning will appear here automatically.</p>
            </section>`}
        </div>
      </section>
    `;
  }

  function renderRestockGroup(group) {
    const status = groupPrimaryStatus(group);
    return `
      <article class="restock-card panel">
        <div class="restock-card-header">
          <div>
            <p class="eyebrow">${escapeHTML(status)}</p>
            <h3>${escapeHTML(group.name)}</h3>
            <p>Needed for ${group.items.length} active item${group.items.length === 1 ? "" : "s"}.</p>
          </div>
          <div class="item-action-group">
            <button class="button secondary small" data-action="restock-status-all" data-material-id="${group.id}" data-status="Ordered">Mark Ordered</button>
            <button class="button primary small" data-action="restock-status-all" data-material-id="${group.id}" data-status="Available">Mark Available</button>
          </div>
        </div>
        <div class="restock-items">
          ${group.items.map(item => `
            <div class="restock-item">
              <div>
                <strong>${escapeHTML(item.customerName)} · Etsy #${escapeHTML(item.etsyOrderNumber)}</strong>
                <span>${escapeHTML(item.productName)} · ${escapeHTML(item.color)}</span>
              </div>
              <div class="item-action-group">
                <span class="badge ${item.status === "Backordered" ? "waiting" : "status"}">${escapeHTML(item.status)}</span>
                <button class="text-button" data-action="open-order" data-order-id="${item.orderId}" data-item-id="${item.itemId}">Open item</button>
              </div>
            </div>
          `).join("")}
        </div>
      </article>
    `;
  }

  function updateMaterialStatusAcrossOrders(materialId,status) {
    let changed = 0;
    data.orders.forEach(order => {
      if (order.status === "Completed") return;
      order.items.forEach(item => {
        const product = productById(item.productId);
        if (!product?.materials.some(material => material.id === materialId)) return;
        const current = item.workflow.materialStatuses[materialId];
        if (current && current !== "Available") {
          item.workflow.materialStatuses[materialId] = status;
          touchOrder(order,item);
          changed += 1;
        }
      });
    });
    const materialName = window.SUW_SAMPLE_DATA.products
      .flatMap(product => product.materials)
      .find(material => material.id === materialId)?.name || "Material";
    data.activity.unshift({text:`Marked ${materialName} as ${status} for ${changed} active item${changed === 1 ? "" : "s"}`,time:"Just now"});
    saveData();
    showToast(`${materialName} marked ${status}.`);
    renderRestockView();
  }


  function migrateRecipes(savedRecipes, masters = []) {
    const defaults = structuredClone(window.SUW_RECIPES || []);
    const saved = Array.isArray(savedRecipes) ? savedRecipes : [];
    const merged = defaults.map(def => ({...def, ...(saved.find(item => item.id === def.id) || {})}));
    saved.forEach(item => { if (!merged.some(existing => existing.id === item.id)) merged.push(item); });
    return merged.map(recipe => {
      const master = masters.find(product => product.id === recipe.productId);
      return {
        ...recipe,
        craft: recipe.craft || master?.craft || recipe.category || "Other",
        productCategoryId: recipe.productCategoryId || master?.categoryId || "",
        status: recipe.status || "Draft",
        methods: Array.isArray(recipe.methods) ? recipe.methods : [],
        materials: Array.isArray(recipe.materials) ? recipe.materials : [],
        tools: Array.isArray(recipe.tools) ? recipe.tools : [],
        quickReference: Array.isArray(recipe.quickReference) ? recipe.quickReference : [],
        stages: Array.isArray(recipe.stages) ? recipe.stages : [],
        wisdom: Array.isArray(recipe.wisdom) ? recipe.wisdom : [],
        packing: Array.isArray(recipe.packing) ? recipe.packing : [],
        history: Array.isArray(recipe.history) ? recipe.history : []
      };
    });
  }

  function recipes(){ return data.recipes || []; }
  function recipeById(id){ return recipes().find(r=>r.id===id); }
  function recipeByProductId(productId){ return recipes().find(r=>r.productId===productId); }


  function renderProductsSubnav(active=productsModuleView) {
    return `<nav class="products-subnav" aria-label="Products sections">
      ${[["catalog","Catalog"],["categories","Categories & Codes"],["colors","Colors"],["recipes","Recipes"]].map(([id,label]) => `<button class="${active===id?"active":""}" data-action="products-subview" data-subview="${id}">${label}</button>`).join("")}
    </nav>`;
  }

  function renderProductsModule(subview=productsModuleView) {
    productsModuleView=subview;
    pageTitle.textContent = "Products";
    setActiveNav("products");
    if (subview === "categories") return renderProductCategoriesModule();
    if (subview === "colors") return renderColorsModule();
    if (subview === "recipes") return renderRecipeLibrary();
    return renderProductCatalog();
  }

  function renderProductCatalog() {
    pageTitle.textContent = "Products";
    setActiveNav("products");
    const categories=productCategories().filter(category=>category.status!=="Archived");
    const crafts=[...new Set(productMasters().map(master=>master.craft||"Other"))].sort();
    let visible=productMasters().filter(master=>
      (productCatalogCategoryFilter==="All" || master.categoryId===productCatalogCategoryFilter) &&
      (productCatalogCraftFilter==="All" || (master.craft||"Other")===productCatalogCraftFilter)
    );
    const categoryName=master=>productCategoryById(master.categoryId)?.name || "Uncategorized";
    visible.sort((a,b)=>{
      if(productCatalogSort==="category-name") return categoryName(a).localeCompare(categoryName(b)) || a.name.localeCompare(b.name);
      if(productCatalogSort==="name") return a.name.localeCompare(b.name);
      if(productCatalogSort==="code") return (a.code||productCode(a)).localeCompare(b.code||productCode(b));
      if(productCatalogSort==="active-first") return (a.status==="Active"?-1:1)-(b.status==="Active"?-1:1) || a.name.localeCompare(b.name);
      return (a.craft||"Other").localeCompare(b.craft||"Other") || categoryName(a).localeCompare(categoryName(b)) || a.name.localeCompare(b.name);
    });
    viewContainer.innerHTML = `<section class="page-section wide">
      ${renderProductsSubnav("catalog")}
      <section class="product-catalog-heading">
        <div><p class="eyebrow">Your sellable products</p><h3>Catalog</h3><p>Filter by category or craft, then open a product or jump directly to its workshop recipe.</p></div>
        <button class="button primary" data-action="add-product-master">+ Add Product</button>
      </section>
      <section class="panel product-catalog-controls">
        <label><span>Category</span><select data-action="product-catalog-filter" data-filter="category"><option value="All">All categories</option>${categories.map(category=>`<option value="${category.id}" ${productCatalogCategoryFilter===category.id?"selected":""}>${escapeHTML(category.name)}</option>`).join("")}</select></label>
        <label><span>Craft</span><select data-action="product-catalog-filter" data-filter="craft"><option value="All">All crafts</option>${crafts.map(craft=>`<option value="${escapeHTML(craft)}" ${productCatalogCraftFilter===craft?"selected":""}>${escapeHTML(craft)}</option>`).join("")}</select></label>
        <label><span>Sort</span><select data-action="product-catalog-sort"><option value="craft-category-name" ${productCatalogSort==="craft-category-name"?"selected":""}>Craft, Category, Product</option><option value="category-name" ${productCatalogSort==="category-name"?"selected":""}>Category, Product</option><option value="name" ${productCatalogSort==="name"?"selected":""}>Product Name A–Z</option><option value="code" ${productCatalogSort==="code"?"selected":""}>Product Code A–Z</option><option value="active-first" ${productCatalogSort==="active-first"?"selected":""}>Active First</option></select></label>
        <span class="catalog-count">${visible.length} of ${productMasters().length} products</span>
      </section>
      <section class="panel product-catalog-panel">
        <div class="product-catalog-table">
          <div class="product-catalog-row product-catalog-head"><span>Product</span><span>Category</span><span>Code</span><span>Craft</span><span>Colors</span><span>Recipe</span><span>Status</span><span>Actions</span></div>
          ${visible.length?visible.map(master => { const recipe=recipeById(master.recipeId || master.id); return `<div class="product-catalog-row">
            <div class="product-catalog-name"><strong>${escapeHTML(master.name)}</strong><small>${escapeHTML(master.shortName || master.name)}</small></div>
            <span>${escapeHTML(categoryName(master))}</span>
            <span>${escapeHTML(master.code || productCode(master))}</span>
            <span>${escapeHTML(master.craft || "Other")}</span>
            <span>${(master.colorIds || []).length || (master.colors || []).length}</span>
            <span><span class="badge ${recipe?"good":"attention"}">${recipe?"Linked":"Not linked"}</span></span>
            <span><span class="badge status">${escapeHTML(master.status || "Active")}</span></span>
            <div class="catalog-actions"><button class="button secondary small" data-action="open-product-master" data-product-id="${master.id}">Open Product</button><button class="button secondary small" data-action="open-recipe" data-recipe-id="${master.recipeId || master.id}" ${recipe?"":"disabled"}>Open Recipe</button></div>
          </div>`; }).join(""):`<div class="empty-state compact">No products match these filters.</div>`}
        </div>
      </section>
    </section>`;
  }

  function renderProductCategoriesModule(){
    pageTitle.textContent="Products · Categories & Codes"; setActiveNav("products");
    viewContainer.innerHTML=`<section class="page-section wide">${renderProductsSubnav("categories")}
      <section class="product-catalog-heading"><div><p class="eyebrow">Product organization</p><h3>Categories & Codes</h3><p>Manage product families, code prefixes, default crafts, and the products assigned to each category.</p></div><button class="button primary" data-action="add-product-category">+ Add Category</button></section>
      <section class="panel product-catalog-panel"><div class="category-catalog-table">
        <div class="category-catalog-row category-catalog-head"><span>Category</span><span>Code Prefix</span><span>Default Craft</span><span>Products</span><span>Status</span><span>Actions</span></div>
        ${productCategories().map(category=>`<div class="category-catalog-row"><div><strong>${escapeHTML(category.name)}</strong><small>${escapeHTML(category.notes||"")}</small></div><code>${escapeHTML(category.codePrefix||"—")}</code><span>${escapeHTML(category.defaultCraft||"Other")}</span><span>${productsUsingCategory(category.id).length}</span><span><span class="badge status">${escapeHTML(category.status||"Active")}</span></span><button class="button secondary small" data-action="edit-product-category" data-category-id="${category.id}">Edit</button></div>`).join("")}
      </div></section></section>`;
  }

  function showProductCategoryEditor(categoryId=null){
    const category=categoryId?productCategoryById(categoryId):null;
    const usedBy=category?productsUsingCategory(category.id):[];
    showModal(category?"Edit Product Category":"Add Product Category",`<form id="productCategoryForm" class="product-editor-form">
      <section class="product-form-section"><div class="product-section-heading"><span>Product family</span><h4>Category Details</h4><p>Categories organize the Catalog and supply a suggested code prefix and craft.</p></div><div class="product-form-grid">
        <label class="product-field"><span class="field-label">Category Name</span><input name="name" value="${escapeHTML(category?.name||"")}" required></label>
        <label class="product-field"><span class="field-label">Code Prefix</span><input name="codePrefix" value="${escapeHTML(category?.codePrefix||"")}" placeholder="M-PTH"></label>
        <label class="product-field"><span class="field-label">Default Craft</span><select name="defaultCraft">${["Macramé","Crochet","Other"].map(value=>`<option value="${value}" ${category?.defaultCraft===value?"selected":""}>${value}</option>`).join("")}</select></label>
        <label class="product-field"><span class="field-label">Status</span><select name="status">${["Active","Inactive","Archived"].map(value=>`<option value="${value}" ${category?.status===value?"selected":""}>${value}</option>`).join("")}</select></label>
      </div><label class="product-field product-field-full"><span class="field-label">Notes</span><textarea name="notes" rows="3">${escapeHTML(category?.notes||"")}</textarea></label></section>
      <section class="product-form-section"><div class="product-section-heading"><span>Catalog usage</span><h4>Products in This Category</h4></div><div class="color-usage-list">${usedBy.length?usedBy.map(product=>`<span>${escapeHTML(product.shortName||product.name)}</span>`).join(""):`<p>No products are assigned yet.</p>`}</div></section>
    </form>`,[{label:"Cancel"},{label:category?"Save Category":"Add Category",kind:"primary",onClick:()=>saveProductCategory(categoryId)}]);
  }

  function saveProductCategory(categoryId){
    const form=document.getElementById("productCategoryForm"); if(!form)return;
    const fd=new FormData(form), name=String(fd.get("name")||"").trim(); if(!name)return showToast("Enter a category name.");
    const duplicate=productCategories().find(item=>item.id!==categoryId && item.name.toLowerCase()===name.toLowerCase()); if(duplicate)return showToast("That category already exists.");
    const existing=categoryId?productCategoryById(categoryId):null;
    let id=existing?.id || categorySlug(name); if(!existing && productCategoryById(id))id=`${id}-${Date.now().toString(36)}`;
    const record={...(existing||{}),id,name,codePrefix:String(fd.get("codePrefix")||"").trim().toUpperCase(),defaultCraft:fd.get("defaultCraft"),status:fd.get("status"),notes:String(fd.get("notes")||"").trim()};
    if(existing)Object.assign(existing,record); else data.productCategoryCatalog.push(record);
    data.activity.unshift({text:`${existing?"Updated":"Added"} product category: ${name}`,time:"Just now"}); saveData(); hideModal(); renderProductsModule("categories");
  }

  function productCode(master) {
    const known={"macrame-paper-towel-holder":"M-PTH","macrame-toilet-paper-holder":"M-TPH","crochet-oven-door-towel-holder":"C-ODTH"};
    return known[master.id] || master.id.split("-").map(part=>part[0]).join("").toUpperCase();
  }

  function yarnCordInventoryItems() {
    return activeInventoryItems().filter(item => item.category === "yarn-cord").sort((a,b)=>a.name.localeCompare(b.name));
  }

  function colorMaterialSummary(itemId) {
    const item=inventoryItemById(itemId);
    if (!item) return `<p>No yarn or cord linked yet.</p>`;
    const stock=item.tracking==="quantity"?`${Number(item.quantity||0)} on hand`:item.condition||"Status not set";
    return `<div><strong>${escapeHTML(item.name)}</strong><span>${escapeHTML(stock)} · ${escapeHTML(item.craft||"Shared")}</span></div>`;
  }

  function renderColorsModule() {
    pageTitle.textContent="Products · Colors"; setActiveNav("products");
    const visible=colorsCatalog().filter(color=>colorFamilyFilter==="All" || color.family===colorFamilyFilter);
    viewContainer.innerHTML=`<section class="page-section wide">${renderProductsSubnav("colors")}
      <section class="product-catalog-heading"><div><p class="eyebrow">Reusable product attributes</p><h3>Colors</h3><p>Organize colors by family and connect each one to the cord or yarn you keep in inventory.</p></div><button class="button primary" data-action="add-color">+ Add Color</button></section>
      <section class="panel color-filter-panel"><label><span>Color Family</span><select data-action="color-family-filter"><option value="All">All families</option>${COLOR_FAMILIES.map(family=>`<option value="${family}" ${colorFamilyFilter===family?"selected":""}>${family}</option>`).join("")}</select></label><span>${visible.length} of ${colorsCatalog().length} colors</span></section>
      <section class="panel product-catalog-panel"><div class="color-catalog-table">
        <div class="color-catalog-row color-catalog-head"><span>Color</span><span>Family</span><span>Craft</span><span>Linked Yarn/Cord</span><span>Status</span><span>Used By</span><span>Actions</span></div>
        ${visible.map(color => {const material=inventoryItemById(color.inventoryItemId);return `<div class="color-catalog-row"><div class="color-name-cell">${color.swatch?`<span class="color-swatch" style="background:${escapeHTML(color.swatch)}"></span>`:""}<div><strong>${escapeHTML(color.name)}</strong>${color.notes?`<small>${escapeHTML(color.notes)}</small>`:""}</div></div><span>${escapeHTML(color.family||"Other")}</span><span>${escapeHTML(color.craft || "Shared")}</span><span class="color-material-cell">${material?`<strong>${escapeHTML(material.name)}</strong><small>${escapeHTML(material.tracking==="quantity"?`${Number(material.quantity||0)} on hand`:material.condition||"")}</small>`:"Not linked"}</span><span><span class="badge ${color.active!==false?"good":"status"}">${color.active!==false?"Active":"Inactive"}</span></span><span>${productsUsingColor(color.id).map(product=>escapeHTML(product.shortName || product.name)).join(", ") || "Not used"}</span><div class="catalog-actions"><button class="button secondary small" data-action="edit-color" data-color-id="${color.id}">Edit</button></div></div>`}).join("") || `<div class="color-empty-state">No colors match this family.</div>`}
      </div></section></section>`;
  }

  function showColorEditor(colorId=null) {
    const color=colorId?colorById(colorId):null;
    const usedBy=color?productsUsingColor(color.id):[];
    showModal(color?"Edit Color":"Add Color",`<form id="colorEditorForm" class="color-editor-form">
      <section class="product-form-section"><div class="product-section-heading"><span>Color details</span><h4>Identity & Organization</h4><p>Name the color once and place it in a family for easier filtering.</p></div><div class="product-form-grid">
        <label class="product-field"><span class="field-label">Color Name</span><input name="name" value="${escapeHTML(color?.name||"")}" required></label>
        <label class="product-field"><span class="field-label">Color Family</span><select name="family">${COLOR_FAMILIES.map(value=>`<option value="${value}" ${(color?.family||inferColorFamily(color?.name))===value?"selected":""}>${value}</option>`).join("")}</select></label>
        <label class="product-field"><span class="field-label">Craft</span><select name="craft">${["Shared","Macramé","Crochet","Other"].map(value=>`<option value="${value}" ${color?.craft===value?"selected":""}>${value}</option>`).join("")}</select></label>
        <label class="product-field"><span class="field-label">Status</span><select name="active"><option value="true" ${color?.active!==false?"selected":""}>Active</option><option value="false" ${color?.active===false?"selected":""}>Inactive</option></select></label>
        <label class="product-field product-field-full"><span class="field-label">Optional Swatch</span><input name="swatch" value="${escapeHTML(color?.swatch||"")}" placeholder="#d8c5a5"></label>
      </div></section>
      <section class="product-form-section"><div class="product-section-heading"><span>Inventory connection</span><h4>Yarn or Cord</h4><p>Link this color to the physical yarn or cord used to make it.</p></div><label class="product-field"><span class="field-label">Linked Yarn/Cord Inventory Item</span><select name="inventoryItemId"><option value="">Not linked</option>${yarnCordInventoryItems().map(item=>`<option value="${item.id}" ${color?.inventoryItemId===item.id?"selected":""}>${escapeHTML(item.name)}</option>`).join("")}</select></label><div id="colorMaterialSummary" class="color-material-summary">${colorMaterialSummary(color?.inventoryItemId)}</div></section>
      <section class="product-form-section"><div class="product-section-heading"><span>Usage</span><h4>Products Using This Color</h4><p>This is updated automatically from the Product Catalog.</p></div><div class="color-usage-list">${usedBy.length?usedBy.map(product=>`<span>${escapeHTML(product.shortName||product.name)}</span>`).join(""):`<p>Not currently assigned to a product.</p>`}</div></section>
      <section class="product-form-section"><div class="product-section-heading"><span>Workshop notes</span><h4>Notes</h4></div><label class="product-field"><span class="field-label">Internal Notes</span><textarea name="notes" rows="3">${escapeHTML(color?.notes||"")}</textarea></label></section>
    </form>`,[{label:"Cancel"},{label:color?"Save Color":"Add Color",kind:"primary",onClick:()=>saveColor(colorId)}]);
    const form=document.getElementById("colorEditorForm");
    form?.inventoryItemId.addEventListener("change",event=>{document.getElementById("colorMaterialSummary").innerHTML=colorMaterialSummary(event.target.value);});
  }

  function saveColor(colorId) {
    const form=document.getElementById("colorEditorForm"); if(!form)return; const fd=new FormData(form); const name=fd.get("name").trim(); if(!name)return showToast("Enter a color name.");
    const duplicate=colorsCatalog().find(color=>color.id!==colorId && color.name.toLowerCase()===name.toLowerCase()); if(duplicate)return showToast("That color already exists.");
    const existing=colorId?colorById(colorId):null; const record={id:existing?.id||colorSlug(name),name,family:fd.get("family")||inferColorFamily(name),craft:fd.get("craft"),active:fd.get("active")==="true",swatch:fd.get("swatch").trim(),inventoryItemId:fd.get("inventoryItemId")||"",notes:fd.get("notes").trim()};
    if(existing)Object.assign(existing,record); else data.colorCatalog.push(record);
    data.productMasters.forEach(master=>master.colors=(master.colorIds||[]).map(id=>colorById(id)?.name).filter(Boolean));
    data.products=data.productMasters.map(master=>({id:master.id,name:master.name,colors:master.colors||[]}));
    data.activity.unshift({text:`${existing?"Updated":"Added"} color: ${name}`,time:"Just now"}); saveData(); hideModal(); renderProductsModule("colors");
  }

  function openProductMaster(productId) {
    const master = productMasterById(productId);
    if (!master) return showToast("Product not found.");
    const recipe = recipeById(master.recipeId || master.id);
    pageTitle.textContent = "Products";
    setActiveNav("products");
    viewContainer.innerHTML = `
      <section class="page-section wide">
        <button class="back-button" data-view="products">← Back to Catalog</button>
        <section class="product-master-hero">
          <div>
            <p class="eyebrow">${escapeHTML(master.craft || "Other")} · ${escapeHTML(master.status || "Active")}</p>
            <h3>${escapeHTML(master.name)}</h3>
            <p>${escapeHTML(master.shortName || master.name)}</p>
          </div>
          <div class="product-master-actions">
            <button class="button secondary" data-action="edit-product-master" data-product-id="${master.id}">Edit Product</button>
            <button class="button primary" data-action="open-recipe" data-recipe-id="${master.recipeId || master.id}">Open Workshop Recipe</button>
          </div>
        </section>

        <section class="product-master-grid">
          <article class="panel">
            <div class="panel-heading"><div><p class="eyebrow">Sellable options</p><h3>Colors</h3></div></div>
            <div class="color-pill-list">${(master.colors || []).map(color => `<span>${escapeHTML(color)}</span>`).join("") || "<p>No colors added.</p>"}</div>
          </article>
          <article class="panel">
            <div class="panel-heading"><div><p class="eyebrow">Permanent instructions</p><h3>Workshop Recipe</h3></div></div>
            <p>${recipe ? `Linked to <strong>${escapeHTML(recipe.title)}</strong>, recipe v${escapeHTML(recipe.version)}` : "No Workshop Recipe is linked."}</p>
          </article>
        </section>

        <section class="panel product-master-section">
          <div class="panel-heading"><div><p class="eyebrow">Bill of materials</p><h3>Materials Used by This Product</h3></div>
          <button class="button secondary small" data-action="edit-product-master" data-product-id="${master.id}">Edit Materials</button></div>
          <div class="product-material-table">
            <div class="product-material-head"><span>Inventory Item</span><span>Qty</span><span>Role</span><span>Loose</span><span>In Kits</span></div>
            ${(master.materials || []).map(row => {
              const item = inventoryItemById(row.inventoryItemId);
              return `<div class="product-material-row">
                <strong>${escapeHTML(item?.name || row.inventoryItemId)}</strong>
                <span>${Number(row.quantity || 0)}</span>
                <span>${escapeHTML(row.role || "raw")}</span>
                <span>${item?.tracking === "quantity" ? Number(item.quantity || 0) : escapeHTML(item?.condition || "—")}</span>
                <span>${item?.tracking === "quantity" ? allocatedInKits(item.id) : "—"}</span>
              </div>`;
            }).join("") || `<p>No materials connected.</p>`}
          </div>
        </section>

        <section class="product-master-grid">
          <article class="panel">
            <div class="panel-heading"><div><p class="eyebrow">Fabrication kit</p><h3>Kit Definition</h3></div></div>
            ${renderProductKitDefinition(master)}
          </article>
          <article class="panel">
            <div class="panel-heading"><div><p class="eyebrow">Packing rules</p><h3>Packaging</h3></div></div>
            <div class="product-packaging-list">
              <div><strong>Mailer</strong><span>${escapeHTML(master.packaging?.mailerType || "Not set")}</span></div>
              <div><strong>Product tag</strong><span>${escapeHTML(inventoryItemById(master.packaging?.productTagInventoryId)?.name || "Not set")}</span></div>
              <div><strong>Care sheet</strong><span>${escapeHTML(inventoryItemById(master.packaging?.careSheetInventoryId)?.name || "Not set")}</span></div>
              <div><strong>Company sticker</strong><span>${escapeHTML(inventoryItemById(master.packaging?.companyStickerInventoryId)?.name || "Not set")}</span></div>
            </div>
            ${master.packaging?.notes ? `<p class="modal-note">${escapeHTML(master.packaging.notes)}</p>` : ""}
          </article>
        </section>
      </section>`;
  }

  function renderProductKitDefinition(master) {
    const kit = inventoryItemById(master.kitDefinition?.inventoryItemId);
    const contents = master.kitDefinition?.contents || [];
    const separate = master.kitDefinition?.separateMaterials || [];
    return `
      <p><strong>${escapeHTML(kit?.name || "No kit inventory item linked")}</strong></p>
      <div class="kit-component-list">
        ${contents.map(row => {
          const item = inventoryItemById(row.inventoryItemId);
          return `<div class="kit-component-row"><strong>${escapeHTML(item?.name || row.inventoryItemId)}</strong><span>${row.quantity} per kit</span></div>`;
        }).join("") || "<p>No kit contents defined.</p>"}
      </div>
      ${separate.length ? `<h4>Stored Separately</h4><div class="kit-component-list">${separate.map(row => {
        const item = inventoryItemById(row.inventoryItemId);
        return `<div class="kit-component-row"><strong>${escapeHTML(item?.name || row.inventoryItemId)}</strong><span>${row.quantity} per finished item</span></div>`;
      }).join("")}</div>` : ""}`;
  }

  function inventoryOptionsForType(materialTypes, selectedId = "") {
    const types = Array.isArray(materialTypes) ? materialTypes : [materialTypes];
    return inventoryItems()
      .filter(item => types.includes(item.materialType) && (item.status !== "Archived" || item.id === selectedId))
      .map(item => `<option value="${item.id}" ${item.id === selectedId ? "selected" : ""}>${escapeHTML(item.name)}</option>`)
      .join("");
  }

  function renderProductRecipeSummary(recipeId, materials = []) {
    const recipe = recipeById(recipeId);
    if (!recipe) return `<div class="product-recipe-empty"><strong>No recipe linked</strong><p>Select a recipe to preview its materials and production connection.</p></div>`;
    const linkedRows = (materials || []).map(row => {
      const item = inventoryItemById(row.inventoryItemId);
      return item ? `<li><strong>${escapeHTML(item.name)}</strong><span>${Number(row.quantity || 0)} · ${escapeHTML(row.role || "material")}</span></li>` : "";
    }).filter(Boolean).join("");
    const recipeRows = (recipe.materials || []).map(row => `<li><strong>${escapeHTML(row.name)}</strong><span>${escapeHTML(row.quantity || "")}</span></li>`).join("");
    return `<div class="product-recipe-summary-card"><div class="product-recipe-summary-heading"><div><span>Linked recipe</span><strong>${escapeHTML(recipe.title)}</strong><small>Recipe v${escapeHTML(recipe.version || "0.1")}</small></div><button type="button" class="text-button" data-action="open-recipe" data-recipe-id="${recipe.id}">Open Recipe</button></div><div class="product-recipe-summary-columns"><div><h5>Recipe materials</h5><ul>${recipeRows || "<li>No recipe materials listed.</li>"}</ul></div><div><h5>Inventory connections</h5><ul>${linkedRows || "<li>No inventory materials linked yet.</li>"}</ul></div></div></div>`;
  }

  function showProductMasterEditor(productId = null) {
    const master = productId ? productMasterById(productId) : null;
    const recipes = data.recipes || [];
    const templateOptions = productMasters().filter(item => item.id !== productId).map(item => `<option value="${item.id}">${escapeHTML(item.shortName || item.name)}</option>`).join("");
    const selectedMaterials = structuredClone(master?.materials || []);
    showModal(
      master ? "Edit Product" : "Add Product",
      `<form id="productMasterForm" class="product-editor-form" data-materials='${escapeHTML(JSON.stringify(selectedMaterials))}'>
        ${master ? "" : `<section class="product-form-section product-template-section"><div class="product-section-heading"><span>Start here</span><h4>Choose a Product Template</h4><p>Selecting a family fills the standard recipe, colors, packaging, printed materials, and inventory connections. Everything can still be reviewed before saving.</p></div><label class="product-field"><span class="field-label">Product Template</span><select name="productTemplate"><option value="">Blank product</option>${templateOptions}</select></label></section>`}

        <section class="product-form-section"><div class="product-section-heading"><span>Product identity</span><h4>Basics</h4></div><div class="product-form-grid">
          <label class="product-field"><span class="field-label">Product Name</span><input name="name" value="${escapeHTML(master?.name || "")}" required></label>
          <label class="product-field"><span class="field-label">Short Name</span><input name="shortName" value="${escapeHTML(master?.shortName || "")}" placeholder="Used in compact lists"></label>
          <label class="product-field"><span class="field-label">Product Category</span><select name="categoryId"><option value="">Uncategorized</option>${productCategories().filter(category=>category.status!=="Archived" || category.id===master?.categoryId).map(category=>`<option value="${category.id}" ${master?.categoryId===category.id?"selected":""}>${escapeHTML(category.name)}</option>`).join("")}</select></label>
          <label class="product-field"><span class="field-label">Product Code</span><input name="code" value="${escapeHTML(master?.code || (master ? productCode(master) : ""))}" placeholder="M-PTH"><small class="field-help" id="productCodeSuggestion"></small></label>
          <label class="product-field"><span class="field-label">Craft</span><select name="craft">${["Macramé","Crochet","Other"].map(value => `<option value="${value}" ${master?.craft === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
          <label class="product-field"><span class="field-label">Status</span><select name="status">${["Active","Coming Soon","Archived"].map(value => `<option value="${value}" ${master?.status === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
        </div></section>

        <section class="product-form-section"><div class="product-section-heading product-section-heading-inline"><div><span>Sellable options</span><h4>Colors</h4><p>Select from the shared Colors module.</p></div><button type="button" class="text-button" data-action="manage-colors">Manage Colors</button></div><fieldset class="color-picker-fieldset"><legend class="sr-only">Available Colors</legend><div class="product-color-picker">${colorsCatalog().filter(color => color.active !== false || (master?.colorIds || []).includes(color.id)).map(color => `<label class="color-choice"><input type="checkbox" name="colorIds" value="${color.id}" ${(master?.colorIds || []).includes(color.id)?"checked":""}><span>${escapeHTML(color.name)}</span></label>`).join("") || `<p>No colors are defined yet. Add them in Products → Colors.</p>`}</div></fieldset></section>

        <section class="product-form-section"><div class="product-section-heading"><span>Physical connections</span><h4>Linked Inventory</h4><p>Manage ordinary materials and components here. Packaging and branding remain in their dedicated selectors below.</p></div><details class="relationship-multiselect" id="productLinkedInventory"><summary><span class="relationship-summary-label">Select materials & components</span><span class="relationship-summary-count"></span></summary><div class="relationship-options">${inventoryItems().filter(item=>item.status!=="Archived" && !["Mailer","Care Sheet","Product Tag","Sticker"].includes(item.materialType)).sort((a,b)=>a.name.localeCompare(b.name)).map(item=>{const checked=selectedMaterials.some(row=>row.inventoryItemId===item.id);return `<label class="relationship-option"><input type="checkbox" name="linkedInventoryIds" value="${item.id}" ${checked?"checked":""}><span><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML([item.materialType,item.craft].filter(Boolean).join(" · "))}</small></span></label>`;}).join("")}</div></details><div class="connects-to-panel product-connects-summary"><div class="inventory-form-heading"><span>Connections</span><h4>Connects To</h4><p>This summary updates as inventory links are selected.</p></div><div id="productConnectsToSummary"></div></div></section>

        <section class="product-form-section"><div class="product-section-heading"><span>How it is made</span><h4>Recipe & Materials</h4><p>The linked recipe supplies the production instructions. Linked inventory is managed in the section above.</p></div><label class="product-field"><span class="field-label">Workshop Recipe</span><select name="recipeId"><option value="">No recipe</option>${recipes.map(recipe => `<option value="${recipe.id}" ${master?.recipeId === recipe.id ? "selected" : ""}>${escapeHTML(recipe.title)}</option>`).join("")}</select></label><div id="productRecipeSummary">${renderProductRecipeSummary(master?.recipeId || "", selectedMaterials)}</div></section>

        <section class="product-form-section"><div class="product-section-heading"><span>What goes with the order</span><h4>Packaging & Branding</h4><p>Each selector shows only the matching inventory type.</p></div><div class="product-form-grid">
          <label class="product-field"><span class="field-label">Mailer</span><select name="mailerInventoryId"><option value="">Not set</option>${inventoryOptionsForType("Mailer")}</select></label>
          <label class="product-field"><span class="field-label">Product Tag</span><select name="productTagInventoryId"><option value="">Not set</option>${inventoryOptionsForType("Product Tag", master?.packaging?.productTagInventoryId || "")}</select></label>
          <label class="product-field"><span class="field-label">Care Instruction Sheet</span><select name="careSheetInventoryId"><option value="">Not set</option>${inventoryOptionsForType("Care Sheet", master?.packaging?.careSheetInventoryId || "")}</select></label>
          <label class="product-field"><span class="field-label">Branding Sticker</span><select name="companyStickerInventoryId"><option value="">Not set</option>${inventoryOptionsForType("Sticker", master?.packaging?.companyStickerInventoryId || "")}</select></label>
        </div><label class="product-field product-field-full"><span class="field-label">Packaging Notes</span><textarea name="packagingNotes" rows="3" placeholder="Special packaging rules or reminders">${escapeHTML(master?.packaging?.notes || "")}</textarea></label></section>
      </form>`,
      [
        {label:"Cancel"},
        {label:master ? "Save Product" : "Add Product",kind:"primary",onClick:() => saveProductMaster(productId)}
      ]
    );

    const form = document.getElementById("productMasterForm");
    const currentMailerId = mailerInventoryIdForProduct(master?.id || "");
    form.mailerInventoryId.value = currentMailerId || "";
    setupRelationshipMultiselect(document.getElementById("productLinkedInventory"));
    const updateProductConnectsSummary = () => {
      const selected = [...form.querySelectorAll('input[name="linkedInventoryIds"]:checked')].map(input => inventoryItemById(input.value)).filter(Boolean);
      const target = document.getElementById("productConnectsToSummary");
      if (target) target.innerHTML = selected.length ? `<div class="connection-pill-list">${selected.map(item=>`<span class="connection-pill">${escapeHTML(item.name)}</span>`).join("")}</div>` : `<p class="where-used-empty">No materials or components selected yet.</p>`;
    };
    form.querySelectorAll('input[name="linkedInventoryIds"]').forEach(input=>input.addEventListener("change",updateProductConnectsSummary));
    updateProductConnectsSummary();
    const updateCategoryDefaults = () => {
      const category=productCategoryById(form.categoryId.value);
      const hint=document.getElementById("productCodeSuggestion");
      if(hint) hint.textContent=category?.codePrefix ? `Suggested prefix: ${category.codePrefix}` : "";
      if(category && !master && (!form.craft.value || form.craft.value==="Other")) form.craft.value=category.defaultCraft||"Other";
    };
    form.categoryId.addEventListener("change",() => {
      const category=productCategoryById(form.categoryId.value);
      if(category){ form.craft.value=category.defaultCraft||form.craft.value; if(!form.code.value.trim())form.code.value=category.codePrefix||""; }
      updateCategoryDefaults();
    });
    updateCategoryDefaults();

    const updateRecipeSummary = () => {
      let materials=[];
      try { materials=JSON.parse(form.dataset.materials || "[]"); } catch {}
      document.getElementById("productRecipeSummary").innerHTML = renderProductRecipeSummary(form.recipeId.value, materials);
    };
    form.recipeId.addEventListener("change",() => {
      const recipeTemplate = productMasters().find(item => item.recipeId === form.recipeId.value || item.id === form.recipeId.value);
      if (recipeTemplate) form.dataset.materials = JSON.stringify(structuredClone(recipeTemplate.materials || []));
      updateRecipeSummary();
    });

    if (form.productTemplate) form.productTemplate.addEventListener("change",() => {
      const template = productMasterById(form.productTemplate.value);
      if (!template) return;
      form.name.value = `New ${template.shortName || template.name}`;
      form.shortName.value = `New ${template.shortName || template.name}`;
      form.categoryId.value = template.categoryId || inferProductCategoryId(template);
      form.code.value = "";
      form.craft.value = template.craft || "Other";
      form.status.value = "Active";
      form.recipeId.value = template.recipeId || template.id;
      form.productTagInventoryId.value = template.packaging?.productTagInventoryId || "";
      form.careSheetInventoryId.value = template.packaging?.careSheetInventoryId || "";
      form.companyStickerInventoryId.value = template.packaging?.companyStickerInventoryId || "";
      form.mailerInventoryId.value = mailerInventoryIdForProduct(template.id) || "";
      form.packagingNotes.value = template.packaging?.notes || "";
      form.dataset.materials = JSON.stringify(structuredClone(template.materials || []));
      form.querySelectorAll('input[name="colorIds"]').forEach(input => input.checked = (template.colorIds || []).includes(input.value) || (template.colors || []).includes(colorById(input.value)?.name));
      updateRecipeSummary();
      showToast(`${template.shortName || template.name} defaults applied.`);
    });
  }


  function saveProductMaster(productId) {
    const form = document.getElementById("productMasterForm");
    if (!form) return;
    const fd = new FormData(form);
    let priorRows = [];
    try { priorRows = JSON.parse(form.dataset.materials || "[]"); } catch { priorRows = []; }
    const linkedInventoryIds = fd.getAll("linkedInventoryIds");
    const rows = linkedInventoryIds.map(inventoryItemId => {
      const existingRow = priorRows.find(row => row.inventoryItemId === inventoryItemId);
      return existingRow || {inventoryItemId, quantity:1, role:"Linked inventory item", linkedFromProduct:true};
    });
    const existing = productId ? productMasterById(productId) : null;
    const name = fd.get("name").trim();
    if (!name) return showToast("Enter a product name.");
    const duplicateName = productMasters().find(item => item.id !== productId && item.name.toLowerCase() === name.toLowerCase());
    if (duplicateName) return showToast("A product with that name already exists.");
    let id = existing?.id || name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || uid("product");
    if (!existing && productMasterById(id)) id = `${id}-${Date.now().toString(36)}`;
    const yarnMode = isYarnOrCord({materialType,category}) ? (formData.get("yarnTrackingMode") || existing?.yarnTrackingMode || "simple") : undefined;
    const originalLength = Math.max(0, Number(formData.get("yarnOriginalLength") || existing?.yarnOriginalLength || 0));
    const remainingLengthInput = String(formData.get("yarnRemainingLength") ?? "").trim();
    const remainingLength = remainingLengthInput === ""
      ? (existing ? Math.max(0, Number(existing.yarnRemainingLength || 0)) : (yarnMode === "precise" ? originalLength : 0))
      : Math.max(0, Number(remainingLengthInput));
    const updated = {
      ...(existing || {}),
      id,
      name,
      shortName: fd.get("shortName").trim() || name,
      categoryId: fd.get("categoryId"),
      code: fd.get("code").trim(),
      craft: fd.get("craft"),
      status: fd.get("status"),
      colorIds: fd.getAll("colorIds"),
      colors: fd.getAll("colorIds").map(id => colorById(id)?.name).filter(Boolean),
      recipeId: fd.get("recipeId"),
      materials: rows,
      packaging: {
        ...(existing?.packaging || {}),
        mailerType: inventoryItemById(fd.get("mailerInventoryId"))?.name || "",
        productTagInventoryId: fd.get("productTagInventoryId"),
        careSheetInventoryId: fd.get("careSheetInventoryId"),
        companyStickerInventoryId: fd.get("companyStickerInventoryId"),
        notes: fd.get("packagingNotes").trim()
      },
      kitDefinition: existing?.kitDefinition || {inventoryItemId:"",contents:[],separateMaterials:[]}
    };
    if (existing) Object.assign(existing,updated);
    else data.productMasters.push(updated);
    data.products = data.productMasters.map(master => ({id:master.id,name:master.name,colors:master.colors || []}));
    syncInventoryProductLinks();
    data.activity.unshift({text:`${existing ? "Updated" : "Added"} product: ${updated.name}`,time:"Just now"});
    saveData();
    openProductMaster(updated.id);
  }


  function recipeCategoryName(recipe) {
    return productCategoryById(recipe.productCategoryId)?.name || "Uncategorized";
  }

  function renderRecipeLibrary(){
    productsModuleView="recipes"; pageTitle.textContent="Products · Recipes"; setActiveNav("products");
    const categoryOptions = productCategories().filter(category => category.status !== "Inactive");
    const crafts = [...new Set(recipes().map(recipe => recipe.craft).filter(Boolean))].sort();
    const statuses = [...new Set(recipes().map(recipe => recipe.status).filter(Boolean))].sort();
    const query = recipeSearch.trim().toLowerCase();
    const visible = recipes().filter(recipe => {
      const categoryMatch = recipeCategoryFilter === "All" || recipe.productCategoryId === recipeCategoryFilter;
      const craftMatch = recipeCraftFilter === "All" || recipe.craft === recipeCraftFilter;
      const statusMatch = recipeStatusFilter === "All" || recipe.status === recipeStatusFilter;
      const searchMatch = !query || [recipe.title, recipe.summary, recipe.version, recipeById(recipe.id)?.productId].some(value => String(value||"").toLowerCase().includes(query));
      return categoryMatch && craftMatch && statusMatch && searchMatch;
    }).sort((a,b) => {
      if (recipeSort === "category-name") return recipeCategoryName(a).localeCompare(recipeCategoryName(b)) || a.title.localeCompare(b.title);
      if (recipeSort === "name") return a.title.localeCompare(b.title);
      if (recipeSort === "revised") return String(b.lastRevised||"").localeCompare(String(a.lastRevised||""));
      if (recipeSort === "version") return String(a.version||"").localeCompare(String(b.version||""),undefined,{numeric:true});
      return String(a.craft||"").localeCompare(String(b.craft||"")) || recipeCategoryName(a).localeCompare(recipeCategoryName(b)) || a.title.localeCompare(b.title);
    });
    viewContainer.innerHTML=`<section class="page-section wide">${renderProductsSubnav("recipes")}
      <section class="recipe-library-hero"><div><p class="eyebrow">Your digital cut sheets</p><h3>Recipes</h3><p>Scan, filter, open, and maintain every workshop recipe from one place.</p></div><button class="button primary" data-action="add-recipe">Add Recipe</button></section>
      <section class="recipe-library-controls panel"><label>Search<input id="recipeSearchInput" value="${escapeHTML(recipeSearch)}" placeholder="Search recipes..."></label><label>Category<select id="recipeCategoryFilter"><option value="All">All Categories</option>${categoryOptions.map(category=>`<option value="${category.id}" ${recipeCategoryFilter===category.id?"selected":""}>${escapeHTML(category.name)}</option>`).join("")}</select></label><label>Craft<select id="recipeCraftFilter"><option value="All">All Crafts</option>${crafts.map(craft=>`<option value="${escapeHTML(craft)}" ${recipeCraftFilter===craft?"selected":""}>${escapeHTML(craft)}</option>`).join("")}</select></label><label>Status<select id="recipeStatusFilter"><option value="All">All Statuses</option>${statuses.map(status=>`<option value="${escapeHTML(status)}" ${recipeStatusFilter===status?"selected":""}>${escapeHTML(status)}</option>`).join("")}</select></label><label>Sort<select id="recipeSort"><option value="craft-category-name" ${recipeSort==="craft-category-name"?"selected":""}>Craft, Category, Recipe</option><option value="category-name" ${recipeSort==="category-name"?"selected":""}>Category, Recipe</option><option value="name" ${recipeSort==="name"?"selected":""}>Recipe Name A–Z</option><option value="revised" ${recipeSort==="revised"?"selected":""}>Last Revised</option><option value="version" ${recipeSort==="version"?"selected":""}>Version</option></select></label></section>
      <section class="recipe-table-wrap panel"><div class="recipe-table recipe-table-header"><span>Recipe</span><span>Category</span><span>Craft</span><span>Version</span><span>Status</span><span>Last Revised</span><span>Actions</span></div>${visible.length?visible.map(recipe=>{const master=productMasters().find(product=>product.id===recipe.productId);return `<div class="recipe-table recipe-table-row"><div><strong>${escapeHTML(recipe.title)}</strong><small>${escapeHTML(recipe.summary||"")}</small></div><span>${escapeHTML(recipeCategoryName(recipe))}</span><span>${escapeHTML(recipe.craft||"")}</span><span>v${escapeHTML(recipe.version||"")}</span><span><span class="badge ${recipe.status==="Active"?"good":"attention"}">${escapeHTML(recipe.status)}</span></span><span>${escapeHTML(recipe.lastRevised||"")}</span><div class="catalog-actions"><button class="button secondary small" data-action="open-recipe" data-recipe-id="${recipe.id}">Open</button><button class="button secondary small" data-action="edit-recipe" data-recipe-id="${recipe.id}">Edit</button>${master?`<button class="text-button" data-action="open-product-master" data-product-id="${master.id}">Product</button>`:""}</div></div>`}).join(""):`<div class="empty-state">No recipes match these filters.</div>`}</section>
    </section>`;
  }

  function linesToObjects(value, fields) {
    return String(value||"").split(/\n+/).map(line=>line.trim()).filter(Boolean).map(line=>{
      const parts=line.split("|").map(part=>part.trim()); const result={}; fields.forEach((field,index)=>result[field]=parts[index]||""); return result;
    });
  }
  function objectsToLines(items, fields) { return (items||[]).map(item=>fields.map(field=>item[field]||"").join(" | ")).join("\n"); }
  function linesToList(value){ return String(value||"").split(/\n+/).map(line=>line.trim()).filter(Boolean); }

  function showRecipeEditor(recipeId="") {
    const recipe=recipeById(recipeId); const masters=productMasters();
    const stageJson=JSON.stringify(recipe?.stages||[],null,2);
    showModal(recipe?"Edit Recipe":"Add Recipe",`<form id="recipeEditorForm" class="recipe-editor-form">
      <section class="product-form-section"><div class="product-section-heading"><span>Recipe identity</span><h4>Basics</h4><p>Connect the recipe to its sellable product and keep the master details current.</p></div><div class="product-form-grid"><label class="product-field"><span class="field-label">Recipe Title</span><input name="title" value="${escapeHTML(recipe?.title||"")}" required></label><label class="product-field"><span class="field-label">Linked Product</span><select name="productId" required><option value="">Choose product</option>${masters.map(master=>`<option value="${master.id}" ${recipe?.productId===master.id?"selected":""}>${escapeHTML(master.name)}</option>`).join("")}</select></label><label class="product-field"><span class="field-label">Version</span><input name="version" value="${escapeHTML(recipe?.version||"0.1")}"></label><label class="product-field"><span class="field-label">Status</span><select name="status">${["Draft","Starter","Active","Archived"].map(status=>`<option ${recipe?.status===status?"selected":""}>${status}</option>`).join("")}</select></label><label class="product-field"><span class="field-label">Estimated Time</span><input name="estimatedTime" value="${escapeHTML(recipe?.estimatedTime||"")}"></label><label class="product-field"><span class="field-label">Difficulty</span><input name="difficulty" value="${escapeHTML(recipe?.difficulty||"")}"></label><label class="product-field"><span class="field-label">Last Revised</span><input name="lastRevised" value="${escapeHTML(recipe?.lastRevised||new Date().toLocaleDateString(undefined,{month:"long",year:"numeric"}))}"></label></div><label class="product-field product-field-full"><span class="field-label">Summary</span><textarea name="summary" rows="3">${escapeHTML(recipe?.summary||"")}</textarea></label></section>
      <section class="product-form-section"><div class="product-section-heading"><span>At a glance</span><h4>Methods & Quick Reference</h4><p>Enter one row per line. Separate columns with a vertical bar.</p></div><label class="product-field"><span class="field-label">Production Methods — Title | Description</span><textarea name="methods" rows="5">${escapeHTML(objectsToLines(recipe?.methods,["title","description"]))}</textarea></label><label class="product-field"><span class="field-label">Quick Reference — Label | Value | Note</span><textarea name="quickReference" rows="6">${escapeHTML(objectsToLines(recipe?.quickReference,["label","value","note"]))}</textarea></label></section>
      <section class="product-form-section"><div class="product-section-heading"><span>Worktable</span><h4>Materials & Tools</h4><p>Materials use Name | Quantity. Tools use one line each.</p></div><div class="product-form-grid"><label class="product-field"><span class="field-label">Materials</span><textarea name="materials" rows="8">${escapeHTML(objectsToLines(recipe?.materials,["name","quantity"]))}</textarea></label><label class="product-field"><span class="field-label">Tools</span><textarea name="tools" rows="8">${escapeHTML((recipe?.tools||[]).join("\n"))}</textarea></label></div></section>
      <section class="product-form-section"><div class="product-section-heading"><span>Build sequence</span><h4>Production Stages</h4><p>Edit the structured stage data. Keep each stage ID stable once active orders use it.</p></div><label class="product-field"><span class="field-label">Stages JSON</span><textarea name="stages" rows="18" class="code-textarea">${escapeHTML(stageJson)}</textarea></label></section>
      <section class="product-form-section"><div class="product-section-heading"><span>Finishing details</span><h4>Workshop Notes, Packing & History</h4><p>Use one entry per line. History uses Version | Date | Changes.</p></div><label class="product-field"><span class="field-label">Workshop Wisdom</span><textarea name="wisdom" rows="5">${escapeHTML((recipe?.wisdom||[]).join("\n"))}</textarea></label><label class="product-field"><span class="field-label">Packing Guidance</span><textarea name="packing" rows="5">${escapeHTML((recipe?.packing||[]).join("\n"))}</textarea></label><label class="product-field"><span class="field-label">Revision History</span><textarea name="history" rows="5">${escapeHTML(objectsToLines(recipe?.history,["version","date","changes"]))}</textarea></label></section>
    </form>`,[{label:"Cancel"},{label:recipe?"Save Recipe":"Add Recipe",kind:"primary",onClick:()=>saveRecipeEditor(recipeId),keepOpen:true}]);
  }

  function saveRecipeEditor(recipeId="") {
    const form=document.getElementById("recipeEditorForm"); if(!form?.reportValidity()) return;
    const fd=new FormData(form); let stages;
    try { stages=JSON.parse(fd.get("stages")||"[]"); if(!Array.isArray(stages)) throw new Error(); } catch (_) { showToast("Production Stages must be valid JSON."); return; }
    const master=productMasters().find(product=>product.id===fd.get("productId"));
    const existing=recipeById(recipeId);
    const updated={id:existing?.id||uid("recipe"),productId:fd.get("productId"),productCategoryId:master?.categoryId||"",craft:master?.craft||"Other",title:fd.get("title").trim(),version:fd.get("version").trim()||"0.1",status:fd.get("status"),estimatedTime:fd.get("estimatedTime").trim(),difficulty:fd.get("difficulty").trim(),lastRevised:fd.get("lastRevised").trim(),summary:fd.get("summary").trim(),methods:linesToObjects(fd.get("methods"),["title","description"]),quickReference:linesToObjects(fd.get("quickReference"),["label","value","note"]),materials:linesToObjects(fd.get("materials"),["name","quantity"]),tools:linesToList(fd.get("tools")),stages,wisdom:linesToList(fd.get("wisdom")),packing:linesToList(fd.get("packing")),history:linesToObjects(fd.get("history"),["version","date","changes"])};
    if(existing) Object.assign(existing,updated); else data.recipes.push(updated);
    const product=productMasters().find(item=>item.id===updated.productId); if(product) product.recipeId=updated.id;
    data.activity.unshift({text:`${existing?"Updated":"Added"} recipe: ${updated.title}`,time:"Just now"}); saveData(); hideModal(); openRecipe(updated.id);
  }

  function openRecipe(recipeId,orderId=null,itemId=null){
    const r=recipeById(recipeId); if(!r)return showToast("Recipe not found.");
    pageTitle.textContent="Workshop Recipe"; setActiveNav("products");
    const order=orderId?data.orders.find(o=>o.id===orderId):null; const item=order?.items.find(i=>i.id===itemId);
    viewContainer.innerHTML=`<section class="page-section wide">${orderId ? `<div class="recipe-navigation"><button class="back-button" data-action="return-to-order" data-order-id="${orderId}" data-item-id="${itemId}">← Return to This Order</button><button class="text-button" data-action="products-subview" data-subview="recipes">Recipe Index</button><button class="text-button" data-action="products-subview" data-subview="catalog">Product Catalog</button></div>` : `<div class="recipe-navigation"><button class="back-button" data-action="products-subview" data-subview="recipes">← Back to Recipes</button><button class="text-button" data-action="products-subview" data-subview="catalog">View Catalog</button></div>`}<section class="recipe-view-hero"><div><p class="eyebrow">${escapeHTML(r.craft || r.category)} · Master Recipe v${escapeHTML(r.version)}</p><h3>${escapeHTML(r.title)}</h3><p>${escapeHTML(r.summary)}</p>${item?'<div class="recipe-order-context">Opened for an active production traveler.</div>':''}</div><div class="recipe-hero-actions"><button class="button secondary" data-action="edit-recipe" data-recipe-id="${r.id}">Edit Recipe</button><button class="button secondary" data-action="recipe-focus" data-recipe-id="${r.id}">Focus View</button><button class="button primary" data-action="print-recipe" data-recipe-id="${r.id}">Print Cut Sheet</button></div></section><section class="recipe-overview-grid">${[['Estimated Time',r.estimatedTime],['Difficulty',r.difficulty],['Last Revised',r.lastRevised],['Recipe Status',r.status]].map(([a,b])=>`<article class="summary-card"><strong>${escapeHTML(b)}</strong><span>${escapeHTML(a)}</span></article>`).join('')}</section><section class="recipe-section panel"><div class="panel-heading"><div><p class="eyebrow">Choose the path</p><h3>Production Methods</h3></div></div><div class="recipe-method-grid">${r.methods.map(m=>`<article class="recipe-method-card"><strong>${escapeHTML(m.title)}</strong><p>${escapeHTML(m.description)}</p></article>`).join('')}</div></section><section class="recipe-section panel"><div class="panel-heading"><div><p class="eyebrow">At a glance</p><h3>Quick Reference</h3></div></div><div class="quick-reference-grid">${r.quickReference.map(q=>`<article class="quick-reference-card"><span>${escapeHTML(q.label)}</span><strong>${escapeHTML(q.value)}</strong><small>${escapeHTML(q.note||'')}</small></article>`).join('')}</div></section><section class="recipe-two-column"><article class="recipe-section panel"><div class="panel-heading"><div><p class="eyebrow">What you need</p><h3>Materials</h3></div></div><div class="recipe-list">${r.materials.map(m=>`<div><strong>${escapeHTML(m.name)}</strong><span>${escapeHTML(m.quantity)}</span></div>`).join('')}</div></article><article class="recipe-section panel"><div class="panel-heading"><div><p class="eyebrow">Worktable</p><h3>Tools</h3></div></div><div class="recipe-list simple">${r.tools.map(t=>`<div><strong>${escapeHTML(t)}</strong></div>`).join('')}</div></article></section><section class="recipe-section"><div class="section-heading"><p class="eyebrow">Build from scratch</p><h3>Production Stages</h3><p>Open details only when needed. Check off the meaningful milestone.</p></div><div class="recipe-stage-list">${r.stages.map((st,idx)=>renderRecipeStage(r,st,idx,orderId,itemId)).join('')}</div></section><section class="recipe-wisdom"><div><p class="eyebrow">Lessons from the workbench</p><h3>Workshop Wisdom</h3></div><div class="wisdom-list">${r.wisdom.map(w=>`<blockquote>${escapeHTML(w)}</blockquote>`).join('')}</div></section><section class="recipe-two-column"><article class="recipe-section panel"><div class="panel-heading"><div><p class="eyebrow">Before mailing</p><h3>Packing</h3></div></div><ol class="recipe-numbered-list">${r.packing.map(x=>`<li>${escapeHTML(x)}</li>`).join('')}</ol></article><article class="recipe-section panel"><div class="panel-heading"><div><p class="eyebrow">Master record</p><h3>Recipe History</h3></div></div><div class="recipe-history">${r.history.map(h=>`<div><strong>v${escapeHTML(h.version)} · ${escapeHTML(h.date)}</strong><p>${escapeHTML(h.changes)}</p></div>`).join('')}</div></article></section></section>`;
  }

  function renderRecipeStage(r,st,idx,orderId,itemId){ const order=orderId?data.orders.find(o=>o.id===orderId):null; const item=order?.items.find(i=>i.id===itemId); const checked=Boolean(item?.recipeStageChecks?.[st.id]); return `<article class="recipe-stage-card"><div class="recipe-stage-heading"><div class="recipe-stage-number">${idx+1}</div><div><p class="eyebrow">Stage ${idx+1}</p><h3>${escapeHTML(st.title)}</h3></div>${item?`<label class="recipe-checkpoint ${checked?'checked':''}"><input type="checkbox" data-action="recipe-stage-check" data-order-id="${orderId}" data-item-id="${itemId}" data-stage-id="${st.id}" ${checked?'checked':''}><span>${checked?'✓':''}</span>${escapeHTML(st.checkpoint)}</label>`:`<span class="badge status">${escapeHTML(st.checkpoint)}</span>`}</div><div class="recipe-stage-quick">${st.quick.map(x=>`<span>${escapeHTML(x)}</span>`).join('')}</div><details><summary>Show Detailed Instructions</summary><ol>${st.instructions.map(x=>`<li>${escapeHTML(x)}</li>`).join('')}</ol></details></article>`; }

  function renderRecipeFocus(recipeId){ const r=recipeById(recipeId); pageTitle.textContent="Recipe Focus"; setActiveNav("products"); viewContainer.innerHTML=`<section class="recipe-focus-view"><button class="back-button" data-action="open-recipe" data-recipe-id="${r.id}">← Full Recipe</button><p class="eyebrow">Simply Ummiby Workshop · Recipe v${escapeHTML(r.version)}</p><h2>${escapeHTML(r.title)}</h2><section class="quick-reference-grid">${r.quickReference.map(q=>`<article class="quick-reference-card"><span>${escapeHTML(q.label)}</span><strong>${escapeHTML(q.value)}</strong><small>${escapeHTML(q.note||'')}</small></article>`).join('')}</section><section class="focus-stage-list">${r.stages.map((st,i)=>`<article><span>${i+1}</span><div><strong>${escapeHTML(st.title)}</strong><p>${escapeHTML(st.checkpoint)}</p></div></article>`).join('')}</section></section>`; }

  function printRecipe(recipeId){ const r=recipeById(recipeId); const w=window.open('','_blank','width=900,height=1000'); if(!w)return showToast('Please allow pop-ups to print the cut sheet.'); w.document.write(`<!doctype html><html><head><title>${escapeHTML(r.title)} Cut Sheet</title><style>body{font-family:Arial,sans-serif;color:#333;padding:28px;line-height:1.45}h1{color:#9f3d4d}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.tile,.stage{border:1px solid #ddd;border-radius:12px;padding:12px}.tile strong{display:block;font-size:18px;color:#9f3d4d}.stage{margin:10px 0}.tip{background:#fff1f3;border-left:4px solid #d96d7b;padding:10px;margin:8px 0}@media print{body{padding:0}}</style></head><body><h1>Simply Ummiby Workshop</h1><p>Workshop Recipe · ${escapeHTML(r.title)} · v${escapeHTML(r.version)}</p><h2>Quick Reference</h2><div class="grid">${r.quickReference.map(q=>`<div class="tile"><span>${escapeHTML(q.label)}</span><strong>${escapeHTML(q.value)}</strong><small>${escapeHTML(q.note||'')}</small></div>`).join('')}</div><h2>Materials</h2><ul>${r.materials.map(m=>`<li>${escapeHTML(m.name)} — ${escapeHTML(m.quantity)}</li>`).join('')}</ul><h2>Production Stages</h2>${r.stages.map((st,i)=>`<section class="stage"><h3>${i+1}. ${escapeHTML(st.title)}</h3><ul>${st.quick.map(x=>`<li>${escapeHTML(x)}</li>`).join('')}</ul><strong>Checkpoint:</strong> ${escapeHTML(st.checkpoint)}</section>`).join('')}<h2>Workshop Wisdom</h2>${r.wisdom.map(x=>`<div class="tip">${escapeHTML(x)}</div>`).join('')}<script>window.onload=()=>window.print();<\/script></body></html>`); w.document.close(); }

  function renderDashboardView() {
    pageTitle.textContent = "Dashboard";
    setActiveNav("dashboard");
    viewContainer.replaceChildren(document.getElementById("dashboardTemplate").content.cloneNode(true));
    renderDashboard();
  }

  function renderDashboard() {
    const allItems = data.orders.flatMap(o => o.items.map(i => ({...i, orderId:o.id})));
    const metrics = [
      [allItems.filter(i => ["New","Preparing"].includes(i.status)).length, "Orders/items waiting"],
      [allItems.filter(i => i.status === "Manufacturing").length, "Currently making"],
      [allItems.filter(i => ["Ready for Packing","Packed"].includes(i.status)).length, "Ready to pack"],
      [data.orders.filter(o => o.status === "Ready to Mail").length, "Orders ready to mail"],
      [allItems.filter(i => i.status === "Waiting on Material").length, "Waiting on materials"]
    ];
    document.getElementById("metricGrid").innerHTML = metrics.map(([value,label]) => `<article class="metric-card"><strong>${value}</strong><span>${label}</span></article>`).join("");

    const focus = findFocus();
    const focusPanel = document.getElementById("todayFocus");
    if (focus) {
      focusPanel.innerHTML = `
        <div class="focus-main"><div class="focus-flower">SU</div><div>
        <p class="eyebrow">Today's focus</p><h3>${escapeHTML(focus.item.productName)} · ${escapeHTML(focus.item.color)}</h3>
        <p>${escapeHTML(focus.order.customerName)} · Etsy #${escapeHTML(focus.order.etsyOrderNumber)} · ${escapeHTML(focus.item.status)}</p></div></div>
        <button class="button primary" data-action="open-order" data-order-id="${focus.order.id}" data-item-id="${focus.item.id}">Resume Processing →</button>`;
    } else {
      focusPanel.classList.add("empty");
      focusPanel.innerHTML = `<div class="focus-main"><div class="focus-flower">SU</div><div><p class="eyebrow">Today's focus</p><h3>Your worktable is ready.</h3><p>Create an order when you're ready to begin.</p></div></div><button class="button primary" data-action="new-order">Create Order</button>`;
    }

    const lowStock = activeInventoryItems().filter(inventoryNeedsAttention);
    const restockGroups = getRestockGroups();
    const urgentRestock = restockGroups.map(group => `
      <div class="alert-item order-material-alert">
        <div>
          <strong>${escapeHTML(group.name)}</strong>
          <span>Needed for ${group.items.length} active item${group.items.length === 1 ? "" : "s"} · ${escapeHTML(groupPrimaryStatus(group))}</span>
        </div>
        <button class="badge warning alert-button" data-view="inventory">View</button>
      </div>
    `).join("");
    const stockAlerts = lowStock.map(item => `
      <div class="alert-item"><div><strong>${escapeHTML(item.name)}</strong><span>${item.tracking === "quantity" ? `${Number(item.quantity || 0)} on hand` : escapeHTML(item.condition || "Not set")} · ${escapeHTML(item.restockType || "restock")}</span></div><span class="badge warning">Low stock</span></div>
    `).join("");
    document.getElementById("inventoryAlerts").innerHTML = `<div class="alert-list">${urgentRestock}${stockAlerts}${!urgentRestock && !stockAlerts ? "<p>No inventory alerts.</p>" : ""}</div>`;

    const dashboardOrders=activeOrders().sort((a,b) => {
      if (a.shipByDate && b.shipByDate) return a.shipByDate.localeCompare(b.shipByDate);
      if (a.shipByDate) return -1;
      if (b.shipByDate) return 1;
      return new Date(b.updatedAt)-new Date(a.updatedAt);
    });
    document.getElementById("activeOrders").innerHTML = `<div class="order-list">${dashboardOrders.slice(0,5).map(order => `
      <div class="order-item"><button data-action="open-order" data-order-id="${order.id}">
      <strong>${escapeHTML(order.customerName)} · Etsy #${escapeHTML(order.etsyOrderNumber)}</strong>
      <span>${order.items.length} item${order.items.length === 1 ? "" : "s"} · ${order.items.map(item => escapeHTML(item.productName)).join(", ")}</span>
      </button><div class="order-deadline-stack">${renderShipByBadge(order,{compact:true})}<span class="badge status">${escapeHTML(order.status)}</span></div></div>`).join("") || "<p>No active orders yet.</p>"}</div>`;

    document.getElementById("activityFeed").innerHTML = `<div class="activity-list">${data.activity.slice(0,6).map(entry => `<div class="activity-item"><strong>${escapeHTML(entry.text)}</strong><span>${escapeHTML(entry.time)}</span></div>`).join("")}</div>`;
  }

  function findFocus() {
    const lastOrder = data.orders.find(o => o.id === data.settings.lastOpenedOrderId && o.status !== "Completed");
    const lastItem = lastOrder?.items.find(i => i.id === data.settings.lastOpenedItemId && i.status !== "Completed");
    if (lastOrder && lastItem) return {order:lastOrder,item:lastItem};
    const candidates = data.orders.flatMap(order => order.items.filter(i => i.status !== "Completed").map(item => ({order,item})));
    candidates.sort((a,b) => new Date(b.item.updatedAt) - new Date(a.item.updatedAt));
    return candidates[0] || null;
  }

  function orderNextStep(order) {
    if (order.status === "Completed") return "Completed";
    if (order.status === "Ready to Mail") return "Mail Order";
    if (order.items.some(item => item.status === "Waiting on Material")) return "Resolve Materials";
    if (order.items.some(item => ["New","Preparing"].includes(item.status))) return "Production Planning";
    if (order.items.some(item => item.status === "Manufacturing")) return "Manufacturing";
    if (order.items.some(item => ["Ready for Packing","Packed"].includes(item.status))) return "Pack & Ship";
    return "Open Order";
  }

  function orderStage(order) {
    const next = orderNextStep(order);
    if (["Production Planning","Resolve Materials"].includes(next)) return "Planning";
    if (next === "Manufacturing") return "Manufacturing";
    if (next === "Pack & Ship") return "Pack & Ship";
    if (next === "Mail Order") return "Ready to Mail";
    return next;
  }

  function orderStatusClass(status) {
    if (status === "Completed") return "complete";
    if (status === "Ready to Mail") return "ready";
    if (status === "Waiting on Material") return "waiting";
    if (["Manufacturing","Packing"].includes(status)) return "production";
    return "planning";
  }

  function orderProductThumb(item) {
    const product = productById(item.productId);
    const label = product?.shortName || item.productName || "Product";
    const initials = label.split(/\s+/).filter(Boolean).slice(0,2).map(word => word[0]).join("").toUpperCase();
    return `<span class="order-product-thumb" title="${escapeHTML(label)} — ${escapeHTML(item.color || "")}"><span>${escapeHTML(initials)}</span></span>`;
  }

  function renderWorkshopView() {
    pageTitle.textContent = "Orders";
    setActiveNav("workshop");
    viewContainer.replaceChildren(document.getElementById("workshopTemplate").content.cloneNode(true));
    renderWorkshopFilters();
    renderWorkshopOrders();
  }

  function renderOrdersMetrics() {
    const active = data.orders.filter(order => order.status !== "Completed");
    const readyPack = active.filter(order => order.items.some(item => ["Ready for Packing","Packed"].includes(item.status))).length;
    const readyMail = active.filter(order => order.status === "Ready to Mail").length;
    const weekEnd = new Date(); weekEnd.setHours(23,59,59,999); weekEnd.setDate(weekEnd.getDate()+7);
    const shipsWeek = active.filter(order => order.shipByDate && parseLocalDate(order.shipByDate) <= weekEnd).length;
    const metrics = [
      ["Active Orders",active.length,"Active"],
      ["Ready to Pack",readyPack,"Packing"],
      ["Ready to Mail",readyMail,"Ready to Mail"],
      ["Ships This Week",shipsWeek,"ship-week"]
    ];
    const container=document.getElementById("ordersMetricGrid");
    if (!container) return;
    container.innerHTML=metrics.map(([label,value,filter])=>`<button class="orders-metric-card" data-action="orders-summary-filter" data-filter="${filter}"><span>${escapeHTML(label)}</span><strong>${value}</strong><small>View orders</small></button>`).join("");
  }

  function renderWorkshopFilters() {
    const container=document.getElementById("workshopFilters");
    if (!container) return;
    const statuses=["Active","New","Preparing","Manufacturing","Waiting on Material","Packing","Ready to Mail","Completed","All"];
    const stages=["All","Planning","Manufacturing","Pack & Ship","Ready to Mail","Completed"];
    container.innerHTML=`
      <label class="orders-search"><span class="sr-only">Search orders</span><input type="search" data-action="order-search" value="${escapeHTML(orderSearch)}" placeholder="Search orders…"></label>
      <label><span class="sr-only">Status</span><select data-action="order-filter" data-filter="status">${statuses.map(value=>`<option value="${value}" ${currentWorkshopFilter===value?"selected":""}>${value === "Active" ? "All Active Statuses" : value}</option>`).join("")}</select></label>
      <label><span class="sr-only">Production stage</span><select data-action="order-filter" data-filter="stage">${stages.map(value=>`<option value="${value}" ${orderStageFilter===value?"selected":""}>${value === "All" ? "All Production Stages" : value}</option>`).join("")}</select></label>
      <label><span class="sr-only">Ship by</span><select data-action="order-filter" data-filter="ship"><option value="All" ${orderShipFilter==="All"?"selected":""}>All Ship Dates</option><option value="Overdue" ${orderShipFilter==="Overdue"?"selected":""}>Overdue</option><option value="Today" ${orderShipFilter==="Today"?"selected":""}>Ship Today</option><option value="Soon" ${orderShipFilter==="Soon"?"selected":""}>Due in 3 Days</option><option value="Week" ${orderShipFilter==="Week"?"selected":""}>Ships This Week</option><option value="Missing" ${orderShipFilter==="Missing"?"selected":""}>Date Not Set</option></select></label>
      <label><span class="sr-only">Sort orders</span><select data-action="order-sort"><option value="ship-date" ${orderSort==="ship-date"?"selected":""}>Ship By — Soonest</option><option value="updated" ${orderSort==="updated"?"selected":""}>Recently Updated</option><option value="customer" ${orderSort==="customer"?"selected":""}>Customer A–Z</option><option value="order-number" ${orderSort==="order-number"?"selected":""}>Order Number</option></select></label>`;
  }

  function filteredWorkshopOrders() {
    let orders=[...data.orders];
    if (currentWorkshopFilter === "Active") orders=orders.filter(order=>order.status!=="Completed");
    else if (currentWorkshopFilter !== "All") orders=orders.filter(order=>order.status===currentWorkshopFilter || order.items.some(item=>item.status===currentWorkshopFilter));
    if (orderStageFilter !== "All") orders=orders.filter(order=>orderStage(order)===orderStageFilter);
    if (orderSearch.trim()) {
      const query=orderSearch.trim().toLowerCase();
      orders=orders.filter(order=>[order.customerName,order.etsyOrderNumber,order.notes,...order.items.flatMap(item=>[item.productName,item.color])].some(value=>String(value||"").toLowerCase().includes(query)));
    }
    if (orderShipFilter !== "All") orders=orders.filter(order=>{
      const state=shipByState(order);
      if (orderShipFilter === "Overdue") return state.className === "overdue";
      if (orderShipFilter === "Today") return state.className === "today";
      if (orderShipFilter === "Soon") return ["today","soon"].includes(state.className);
      if (orderShipFilter === "Missing") return state.className === "missing";
      if (orderShipFilter === "Week") { if(!order.shipByDate)return false; const due=parseLocalDate(order.shipByDate); const end=new Date(); end.setHours(23,59,59,999);end.setDate(end.getDate()+7);return due<=end; }
      return true;
    });
    orders.sort((a,b)=>{
      if(orderSort==="updated")return new Date(b.updatedAt)-new Date(a.updatedAt);
      if(orderSort==="customer")return a.customerName.localeCompare(b.customerName);
      if(orderSort==="order-number")return String(a.etsyOrderNumber).localeCompare(String(b.etsyOrderNumber),undefined,{numeric:true});
      if(a.shipByDate&&b.shipByDate)return a.shipByDate.localeCompare(b.shipByDate);
      if(a.shipByDate)return -1;if(b.shipByDate)return 1;return new Date(b.updatedAt)-new Date(a.updatedAt);
    });
    return orders;
  }

  function renderWorkshopOrders() {
    renderOrdersMetrics();
    const container=document.getElementById("workshopOrders");
    const orders=filteredWorkshopOrders();
    const count=document.getElementById("ordersCount"); if(count) count.textContent=`${orders.length}`;
    if (!orders.length) {
      container.innerHTML=`<div class="orders-empty"><div class="orders-empty-icon">□</div><h4>No matching orders</h4><p>Adjust the filters or add a new Etsy order when one arrives.</p><button class="button primary" data-action="new-order">+ New Order</button></div>`;
      return;
    }
    container.innerHTML=`<div class="orders-table-wrap"><table class="orders-table"><thead><tr><th>Order</th><th>Customer</th><th>Products</th><th>Ship By</th><th>Status</th><th>Next Step</th><th>Actions</th></tr></thead><tbody>${orders.map(order=>`
      <tr>
        <td><strong class="order-number">#${escapeHTML(order.etsyOrderNumber)}</strong><small>${order.items.length} item${order.items.length===1?"":"s"}</small></td>
        <td><strong>${escapeHTML(order.customerName)}</strong><small>Etsy order</small></td>
        <td><div class="order-product-stack">${order.items.slice(0,3).map(orderProductThumb).join("")}${order.items.length>3?`<span class="order-product-more">+${order.items.length-3}</span>`:""}</div><small>${escapeHTML(order.items.map(item=>item.productName).join(", "))}</small></td>
        <td>${renderShipByBadge(order)}${order.shipByDate?`<small>${escapeHTML(formatShipByDate(order.shipByDate))}</small>`:""}</td>
        <td><span class="order-status-pill ${orderStatusClass(order.status)}">${escapeHTML(order.status)}</span></td>
        <td><strong class="next-step">${escapeHTML(orderNextStep(order))}</strong><small>Updated ${escapeHTML(formatDate(order.updatedAt))}</small></td>
        <td><button class="button secondary small order-view-button" data-action="open-order" data-order-id="${order.id}">View Order</button></td>
      </tr>`).join("")}</tbody></table></div>`;
  }

  function showNewOrder(orderId = null) {
    editingOrderId = orderId;
    pageTitle.textContent = orderId ? "Edit Order" : "New Order";
    setActiveNav("");
    viewContainer.replaceChildren(document.getElementById("newOrderTemplate").content.cloneNode(true));
    const order = orderId ? data.orders.find(o => o.id === orderId) : null;
    if (order) {
      document.getElementById("orderFormTitle").textContent = "Edit workshop order";
      const form = document.getElementById("newOrderForm");
      form.customerName.value = order.customerName;
      form.etsyOrderNumber.value = order.etsyOrderNumber;
      form.shipByDate.value = order.shipByDate || "";
      form.notes.value = order.notes;
    }
    const initialLines = order ? groupOrderItems(order.items) : [{productId:data.products[0].id,color:data.products[0].colors[0],quantity:1}];
    initialLines.forEach(line => addLineItemRow(line));
    document.getElementById("addLineItem").addEventListener("click", () => addLineItemRow());
    document.getElementById("newOrderForm").addEventListener("submit", saveOrderForm);
  }

  function groupOrderItems(items) {
    const groups = new Map();
    items.forEach(item => {
      const key = `${item.productId}|${item.color}`;
      const existing = groups.get(key) || {productId:item.productId,color:item.color,quantity:0};
      existing.quantity += 1;
      groups.set(key,existing);
    });
    return [...groups.values()];
  }

  function addLineItemRow(values = {}) {
    const lineItems = document.getElementById("lineItems");
    const row = document.createElement("div");
    row.className = "line-item-row";
    row.innerHTML = `<label>Product<select class="line-product"></select></label><label>Color<select class="line-color"></select><small class="inline-reference-help">Missing a color? Add or assign it here without leaving the order.</small></label><label>Quantity<input class="line-quantity" type="number" min="1" value="${values.quantity || 1}" /></label><button type="button" class="remove-line" title="Remove product">×</button>`;
    const productSelect = row.querySelector(".line-product");
    const colorSelect = row.querySelector(".line-color");
    productSelect.innerHTML = data.products.map(p => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join("");
    productSelect.value = values.productId || data.products[0].id;

    const refreshColors = (preferredColor = null) => {
      const product = data.products.find(p => p.id === productSelect.value);
      const colors = product?.colors || [];
      colorSelect.innerHTML = `${colors.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("")}<option value="__manage_color__">＋ Add or assign a color…</option>`;
      const requested = preferredColor || values.color;
      if (requested && colors.includes(requested)) colorSelect.value = requested;
      else if (colors.length) colorSelect.value = colors[0];
      else colorSelect.value = "__manage_color__";
    };

    productSelect.addEventListener("change", () => {
      values.color = null;
      refreshColors();
      if (colorSelect.value === "__manage_color__") showInlineOrderColorEditor(row);
    });
    colorSelect.addEventListener("change", () => {
      if (colorSelect.value === "__manage_color__") showInlineOrderColorEditor(row);
    });
    row.refreshColors = refreshColors;
    refreshColors();
    row.querySelector(".remove-line").addEventListener("click", () => {
      if (lineItems.children.length === 1) return showToast("An order needs at least one product.");
      row.remove();
    });
    lineItems.appendChild(row);
  }

  function showInlineOrderColorEditor(row) {
    const productId = row.querySelector(".line-product")?.value;
    const master = productMasterById(productId);
    if (!master) return showToast("Choose a product first.");
    const assignedIds = new Set(master.colorIds || []);
    const availableColors = colorsCatalog().filter(color => color.active !== false && !assignedIds.has(color.id));
    showModal("Add or assign a color", `<form id="inlineOrderColorForm" class="color-editor-form">
      <p class="modal-intro">Keep entering this order. Choose an existing color to make it available for <strong>${escapeHTML(master.name)}</strong>, or create a new color below.</p>
      <section class="product-form-section"><div class="product-section-heading"><span>Existing reference data</span><h4>Assign an Existing Color</h4></div>
        <label class="product-field"><span class="field-label">Color</span><select name="existingColorId"><option value="">Choose an existing color</option>${availableColors.map(color => `<option value="${color.id}">${escapeHTML(color.name)}</option>`).join("")}</select></label>
      </section>
      <div class="inline-reference-divider"><span>or</span></div>
      <section class="product-form-section"><div class="product-section-heading"><span>New reference data</span><h4>Create a New Color</h4><p>Only the name is required now. You can add inventory links or notes later.</p></div><div class="product-form-grid">
        <label class="product-field"><span class="field-label">Color Name</span><input name="newColorName" placeholder="Example: Sage Green"></label>
        <label class="product-field"><span class="field-label">Color Family</span><select name="family">${COLOR_FAMILIES.map(value => `<option value="${value}">${value}</option>`).join("")}</select></label>
      </div></section>
    </form>`,[
      {label:"Cancel",onClick:() => row.refreshColors?.()},
      {label:"Add & Continue",kind:"primary",keepOpen:true,onClick:() => saveInlineOrderColor(row,master)}
    ]);
    document.querySelector('#inlineOrderColorForm input[name="newColorName"]')?.addEventListener("input",event => {
      const family = document.querySelector('#inlineOrderColorForm select[name="family"]');
      if (family) family.value = inferColorFamily(event.target.value);
    });
  }

  function saveInlineOrderColor(row,master) {
    const form = document.getElementById("inlineOrderColorForm");
    if (!form) return;
    const fd = new FormData(form);
    const existingId = fd.get("existingColorId");
    const newName = String(fd.get("newColorName") || "").trim();
    if (!existingId && !newName) return showToast("Choose an existing color or enter a new color name.");
    if (existingId && newName) return showToast("Choose an existing color or create a new one, not both.");

    let color = existingId ? colorById(existingId) : colorByNameFrom(colorsCatalog(),newName);
    if (!color && newName) {
      let id = colorSlug(newName), base = id, n = 2;
      while (colorsCatalog().some(existing => existing.id === id)) id = `${base}-${n++}`;
      color = {id,name:newName,family:fd.get("family") || inferColorFamily(newName),craft:master.craft || "Shared",active:true,notes:"",swatch:"",inventoryItemId:""};
      data.colorCatalog.push(color);
      data.activity.unshift({text:`Added color while entering an order: ${newName}`,time:"Just now"});
    }
    if (!color) return showToast("Color not found.");

    master.colorIds ||= [];
    if (!master.colorIds.includes(color.id)) master.colorIds.push(color.id);
    master.colors = master.colorIds.map(id => colorById(id)?.name).filter(Boolean);
    data.products = data.productMasters.map(product => ({id:product.id,name:product.name,colors:product.colors || []}));
    saveData();
    hideModal();
    row.refreshColors?.(color.name);
    showToast(`${color.name} is now available for ${master.shortName || master.name}.`);
  }

  function saveOrderForm(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const specs = [...document.querySelectorAll(".line-item-row")].map(row => ({
      productId:row.querySelector(".line-product").value,
      color:row.querySelector(".line-color").value,
      quantity:Number(row.querySelector(".line-quantity").value)
    }));
    if (specs.some(s => !s.quantity || s.quantity < 1)) return showToast("Please enter a valid quantity.");
    if (specs.some(s => !s.color || s.color === "__manage_color__")) return showToast("Choose a color for every product. Use “Add or assign a color…” when needed.");

    const now = new Date().toISOString();
    if (editingOrderId) {
      const order = data.orders.find(o => o.id === editingOrderId);
      restoreProductTagTasksForOrder(order);
      const oldItems = [...order.items];
      const rebuilt = [];
      specs.forEach(spec => {
        const product = data.products.find(p => p.id === spec.productId);
        for (let n=0;n<spec.quantity;n++) {
          const reusableIndex = oldItems.findIndex(i => i.productId === spec.productId && i.color === spec.color);
          if (reusableIndex >= 0) rebuilt.push(oldItems.splice(reusableIndex,1)[0]);
          else rebuilt.push(migrateItem({id:uid("item"),productId:product.id,productName:product.name,color:spec.color,status:"New",updatedAt:now},rebuilt.length));
        }
      });
      rebuilt.forEach((item,index) => item.unitNumber=index+1);
      order.customerName=form.customerName.value.trim();
      order.etsyOrderNumber=form.etsyOrderNumber.value.trim();
      order.shipByDate=form.shipByDate.value;
      order.notes=form.notes.value.trim();
      order.items=rebuilt;
      touchOrder(order);
      data.activity.unshift({text:`Updated order for ${order.customerName}`,time:"Just now"});
      saveData();
      showToast("Order updated.");
      return openOrder(order.id);
    }

    const items=[];
    specs.forEach(spec => {
      const product=data.products.find(p => p.id===spec.productId);
      for (let n=0;n<spec.quantity;n++) items.push(migrateItem({id:uid("item"),productId:product.id,productName:product.name,color:spec.color,status:"New",updatedAt:now},items.length));
    });
    const order={id:uid("order"),customerName:form.customerName.value.trim(),etsyOrderNumber:form.etsyOrderNumber.value.trim(),shipByDate:form.shipByDate.value,notes:form.notes.value.trim(),status:"New",items,createdAt:now,updatedAt:now,shipping:{careSheetPrinted:false,packingSlipPrinted:false,shippoOpened:false,labelAttached:false,companyStickerAttached:false,mailerSealed:false,packedAt:null,mailedAt:null,shipDate:null,productTagChecks:{},inventoryTaskTransactions:{}}};
    data.orders.unshift(order);
    data.activity.unshift({text:`Created order for ${order.customerName}`,time:"Just now"});
    touchOrder(order,items[0]);
    saveData();
    showToast("Order saved locally.");
    openOrder(order.id,items[0].id);
  }

  function openOrder(orderId, focusItemId = null) {
    const order=data.orders.find(o => o.id===orderId);
    if (!order) return showToast("Order not found.");
    pageTitle.textContent="Processing Area";
    setActiveNav("workshop");
    viewContainer.replaceChildren(document.getElementById("orderWorkspaceTemplate").content.cloneNode(true));
    renderOrderWorkspace(order,focusItemId);
  }

  function renderOrderWorkspace(order,focusItemId=null) {
    const counts={total:order.items.length,active:order.items.filter(i => i.status!=="Completed").length,complete:order.items.filter(i => i.status==="Completed").length};
    const overall = order.items.length ? Math.round(order.items.reduce((sum,item)=>sum+workflowPercent(item),0)/order.items.length) : 0;
    const nextStep = orderNextStep(order);
    const stage = orderStage(order);
    const statusClass = orderStatusClass(order.status);
    const stageOrder=["Planning","Manufacturing","Pack & Ship","Ready to Mail","Completed"];
    const activeStageIndex=Math.max(0,stageOrder.indexOf(stage));
    const customerNote=order.notes?.trim() || "No order notes added.";
    const focusItem=focusItemId ? order.items.find(i=>i.id===focusItemId) : null;
    const container=document.getElementById("orderWorkspace");
    container.innerHTML=`
      <section class="order-workspace-shell">
        <section class="order-workspace-hero">
          <div class="order-workspace-hero-copy">
            <div class="order-workspace-breadcrumb"><button class="text-button" data-view="workshop">Orders</button><span>›</span><strong>Order #${escapeHTML(order.etsyOrderNumber)}</strong></div>
            <div class="order-workspace-title-row"><h3>Order #${escapeHTML(order.etsyOrderNumber)}</h3><span class="order-status-pill ${statusClass}">${escapeHTML(order.status)}</span></div>
            <p><strong>${escapeHTML(order.customerName)}</strong> · ${counts.total} item${counts.total===1?"":"s"} · Updated ${escapeHTML(formatDate(order.updatedAt))}</p>
          </div>
          <div class="order-workspace-hero-actions">
            <button class="button secondary small" data-action="edit-order" data-order-id="${order.id}">Edit Order</button>
            <button class="button secondary small" data-action="reset-order" data-order-id="${order.id}">Reset Progress</button>
            <button class="button danger small" data-action="cancel-order" data-order-id="${order.id}">Cancel Order</button>
          </div>
        </section>

        <section class="order-workspace-summary-grid">
          <article class="workspace-summary-card ship-card"><span>Ship By</span><strong>${escapeHTML(order.shipByDate?formatShipByDate(order.shipByDate):"Not set")}</strong>${renderShipByBadge(order)}</article>
          <article class="workspace-summary-card"><span>Overall Progress</span><strong>${overall}%</strong><div class="workspace-progress-track"><i style="width:${overall}%"></i></div></article>
          <article class="workspace-summary-card"><span>Current Stage</span><strong>${escapeHTML(stage)}</strong><small>Next: ${escapeHTML(nextStep)}</small></article>
          <article class="workspace-summary-card"><span>Order Items</span><strong>${counts.complete} of ${counts.total} complete</strong><small>${counts.active} still active</small></article>
          <article class="workspace-summary-card note-card"><span>Order Note</span><p>${escapeHTML(customerNote)}</p></article>
        </section>

        <section class="order-workflow-strip panel" aria-label="Order workflow">
          ${stageOrder.map((label,index)=>`<div class="workflow-step ${index<activeStageIndex?"done":""} ${index===activeStageIndex?"active":""}"><span>${index+1}</span><div><strong>${escapeHTML(label)}</strong><small>${index===0?"Plan materials":index===1?"Make and assemble":index===2?"Pack the order":index===3?"Await mailing":"Order complete"}</small></div></div>`).join('<b class="workflow-connector"></b>')}
        </section>

        <section class="order-workspace-layout">
          <aside class="order-workspace-sidebar">
            <article class="panel workspace-info-card"><div class="workspace-card-heading"><h4>Order Details</h4><button class="text-button" data-action="edit-order" data-order-id="${order.id}">Edit</button></div><dl><dt>Customer</dt><dd>${escapeHTML(order.customerName)}</dd><dt>Etsy order</dt><dd>#${escapeHTML(order.etsyOrderNumber)}</dd><dt>Status</dt><dd>${escapeHTML(order.status)}</dd><dt>Last updated</dt><dd>${escapeHTML(formatDate(order.updatedAt))}</dd></dl></article>
            <article class="panel workspace-info-card"><div class="workspace-card-heading"><h4>Progress</h4></div><div class="workspace-large-progress"><div><i style="width:${overall}%"></i></div><strong>${overall}%</strong></div><p>${counts.complete} completed · ${counts.active} active</p></article>
            <button class="button secondary workspace-back-button" data-view="workshop">← Back to Orders</button>
          </aside>

          <main class="order-workspace-main">
            <section class="workspace-section-heading"><div><p class="eyebrow">Order items</p><h3>Process This Order</h3><p>Open an item to continue Production Planning, Manufacturing & Assembly, or Pack & Ship.</p></div></section>
            <section class="item-workspace-list workspace-item-list">${order.items.map((item,index) => renderItemCard(order,item,index,focusItemId)).join("")}</section>
          </main>

          <aside class="order-workspace-rail">
            <article class="panel workspace-quick-card"><h4>Quick Actions</h4><button class="button secondary" data-action="edit-order" data-order-id="${order.id}">Edit Order</button>${focusItem?`<button class="button secondary" data-action="open-item-recipe" data-order-id="${order.id}" data-item-id="${focusItem.id}" data-recipe-id="${focusItem.productId}">Open Current Recipe</button>`:""}<button class="button secondary" data-action="reset-order" data-order-id="${order.id}">Reset Progress</button></article>
            <article class="panel workspace-quick-card"><h4>Recipe Resources</h4>${order.items.map(item=>`<button class="workspace-resource-link" data-action="open-item-recipe" data-order-id="${order.id}" data-item-id="${item.id}" data-recipe-id="${item.productId}"><span>${escapeHTML(item.productName)}</span><small>${escapeHTML(item.color)}</small></button>`).join("")}</article>
            <article class="panel workspace-danger-card"><h4>Need to cancel?</h4><p>Cancel this order and safely return tracked inventory.</p><button class="button danger" data-action="cancel-order" data-order-id="${order.id}">Cancel Order</button></article>
          </aside>
        </section>
      </section>`;
    touchOrder(order,focusItemId ? order.items.find(i => i.id===focusItemId) : order.items[0]);
    saveData();
    if (focusItemId) setTimeout(() => document.querySelector(`[data-item-card="${focusItemId}"]`)?.scrollIntoView({behavior:"smooth",block:"center"}),50);
  }

  function renderItemCard(order,item,index,focusItemId) {
    const expanded=item.id===focusItemId || item.id===data.settings.lastOpenedItemId;
    const tab=item.workflow.activeTab || tabForStatus(item.status);
    return `
      <article class="item-card ${expanded ? "expanded" : ""}" data-item-card="${item.id}">
        <div class="item-card-heading"><div><h4>${escapeHTML(item.productName)} #${index+1}</h4><p>${escapeHTML(item.color)} · ${escapeHTML(item.status)}</p><div class="item-ship-by">${renderShipByBadge(order,{compact:true})}</div></div>
        <div class="item-action-group"><span class="badge ${item.status==="Completed" ? "complete" : item.status==="Waiting on Material" ? "waiting" : "status"}">${workflowPercent(item)}%</span>
        <button class="button secondary small" data-action="open-item-recipe" data-order-id="${order.id}" data-item-id="${item.id}" data-recipe-id="${item.productId}">Open Recipe</button><button class="button secondary small" data-action="toggle-item" data-order-id="${order.id}" data-item-id="${item.id}">${expanded ? "Close" : "Open Processing"}</button></div></div>
        <div class="item-card-body">
          <div class="traveler-recipe-strip"><div><span>Production Traveler</span><strong>${escapeHTML(item.productName)} · Recipe v${escapeHTML(item.recipeVersion || recipeByProductId(item.productId)?.version || "0.1")}</strong></div><button class="text-button" data-action="open-item-recipe" data-order-id="${order.id}" data-item-id="${item.id}" data-recipe-id="${item.productId}">Open Workshop Recipe</button></div><div class="process-tabs">
            ${processTabButton("prepare","1. Production Planning",tab,order.id,item.id)}
            ${processTabButton("manufacture","2. Manufacturing & Assembly",tab,order.id,item.id)}
            ${processTabButton("pack","3. Pack & Ship",tab,order.id,item.id)}
          </div>
          <div class="process-pane">${renderProcessPane(order,item,tab)}</div>
          <div class="item-notes-box"><label>Item notes<textarea rows="3" data-action="item-notes" data-order-id="${order.id}" data-item-id="${item.id}" placeholder="Anything to remember while making this item...">${escapeHTML(item.notes)}</textarea></label></div>
        </div>
      </article>`;
  }

  function processTabButton(tab,label,active,orderId,itemId) {
    return `<button class="process-tab ${tab===active ? "active" : ""}" data-action="process-tab" data-tab="${tab}" data-order-id="${orderId}" data-item-id="${itemId}">${label}</button>`;
  }

  function renderProcessPane(order,item,tab) {
    if (tab==="prepare") return renderPreparePane(order,item);
    if (tab==="manufacture") return renderManufacturePane(order,item);
    return renderPackPane(order,item);
  }


  function recordedInventoryQuantity(id) {
    const inventoryItem = inventoryItemById(id);
    return Number.isFinite(Number(inventoryItem?.quantity)) ? Number(inventoryItem.quantity) : null;
  }

  function rawMaterialSnapshot(item) {
    const product = productById(item.productId);
    const rows = [];
    if (item.productId === "macrame-paper-towel-holder") {
      rows.push({name:"Macramé cord",needed:"4 × 340 cm + wrap cord",available:"Condition tracked",state:item.workflow.materialStatuses["cord"] || "Available"});
      rows.push({name:"Wooden ring",needed:"1",available:recordedInventoryQuantity("wood-rings"),state:item.workflow.materialStatuses["wood-ring"] || "Available"});
      rows.push({name:"Prepared paper towel dowel",needed:"1",available:recordedInventoryQuantity("prepared-paper-towel-dowels"),state:item.workflow.preparedDowelReady ? "Assigned" : "Needed for packing"});
      rows.push({name:"End caps",needed:"2",available:recordedInventoryQuantity("end-caps"),state:item.workflow.materialStatuses["end-caps"] || "Available"});
    } else if (item.productId === "macrame-toilet-paper-holder") {
      rows.push({name:"Macramé cord",needed:"Recipe amount",available:"Condition tracked",state:item.workflow.materialStatuses["cord"] || "Available"});
      rows.push({name:"Wooden ring",needed:"1",available:recordedInventoryQuantity("wood-rings"),state:item.workflow.materialStatuses["wood-ring"] || "Available"});
      rows.push({name:"Prepared toilet paper dowel",needed:"1",available:recordedInventoryQuantity("prepared-toilet-paper-dowels"),state:item.workflow.preparedDowelReady ? "Assigned" : "Needed for packing"});
    } else {
      product.materials.forEach(material => rows.push({
        name:material.name,
        needed:"Recipe amount",
        available:"Not counted",
        state:item.workflow.materialStatuses[material.id] || "Available"
      }));
    }
    return rows;
  }

  function renderAvailabilityValue(value) {
    if (value === null || value === undefined) return "Not counted";
    return String(value);
  }

  function renderInventorySnapshot(item) {
    const method = item.workflow.fulfillmentMethod;
    const kitContents = item.productId === "macrame-paper-towel-holder"
      ? ["4 precut cords", "1 wooden ring", "2 end caps", "Dowel is separate"]
      : item.productId === "macrame-toilet-paper-holder"
        ? ["Precut cord", "1 wooden ring"]
        : ["Prepared yarn and notions"];
    const rawRows = rawMaterialSnapshot(item);
    const matchingKit = inventoryItems().find(entry => entry.category === "prepared-components" && entry.productId === item.productId && entry.color === item.color);
    const matchingFinished = inventoryItems().find(entry => entry.category === "finished-inventory" && entry.productId === item.productId && entry.color === item.color);
    const kitQuantity = Number(matchingKit?.quantity || 0);
    const finishedQuantity = Number(matchingFinished?.quantity || 0);

    return `
      <section class="planning-inventory">
        <div class="checklist-heading">
          <h5>Inventory for This Item</h5>
          <span>Current recorded levels</span>
        </div>
        <div class="planning-path-grid">
          <article class="planning-path ${method === "finished" ? "selected" : ""}">
            <span>Finished Inventory</span>
            <strong>${finishedQuantity} available</strong>
            <small>${escapeHTML(item.productName)} · ${escapeHTML(item.color)}</small>
          </article>
          <article class="planning-path ${method === "kit" ? "selected" : ""}">
            <span>Ready Packs</span>
            <strong>${kitQuantity} available</strong>
            <small>${escapeHTML(item.productName)} · ${escapeHTML(item.color)}</small>
          </article>
          <article class="planning-path ${method === "raw" ? "selected" : ""}">
            <span>Raw Materials</span>
            <strong>${rawRows.filter(row => row.state === "Available").length} ready</strong>
            <small>${rawRows.length} material groups</small>
          </article>
        </div>

        ${method === "kit" ? `
          <div class="path-detail-card">
            <h6>What the ready pack covers</h6>
            <ul>${kitContents.map(item => `<li>${escapeHTML(item)}</li>`).join("")}</ul>
            <p><strong>Workflow difference:</strong> Cord Preparation is skipped. Manufacturing begins with the first arm or first making stage.</p>
          </div>` : ""}

        ${method === "raw" ? `
          <div class="path-detail-card">
            <h6>Raw-material requirements</h6>
            <div class="inventory-table">
              <div class="inventory-table-head"><span>Material</span><span>Needed</span><span>Recorded</span><span>Status</span></div>
              ${rawRows.map(row => `
                <div class="inventory-table-row">
                  <strong>${escapeHTML(row.name)}</strong>
                  <span>${escapeHTML(row.needed)}</span>
                  <span>${escapeHTML(renderAvailabilityValue(row.available))}</span>
                  <span class="inventory-state ${row.state.toLowerCase().replaceAll(" ","-")}">${escapeHTML(row.state)}</span>
                </div>`).join("")}
            </div>
            <p><strong>Workflow difference:</strong> The working recipe begins with Cord Preparation or the first preparation stage.</p>
          </div>` : ""}

        ${method === "finished" ? `
          <div class="path-detail-card">
            <h6>Finished-product path</h6>
            <p>This path skips Manufacturing & Assembly and sends the item directly to Pack & Ship.</p>
          </div>` : ""}
      </section>`;
  }

  function renderPreparePane(order,item) {
    const product = productById(item.productId);
    const fulfillmentChosen = Boolean(item.workflow.fulfillmentMethod);
    return `
      <div class="process-pane-heading">
        <div>
          <p class="eyebrow">Step 1</p>
          <h4>Production Planning</h4>
          <p>Choose how this item will be fulfilled, then review material availability. Materials do not block you from beginning.</p>
        </div>
        <button class="button secondary small" data-action="wait-material" data-order-id="${order.id}" data-item-id="${item.id}">Waiting on Material</button>
      </div>

      <div class="fulfillment-grid">
        ${fulfillmentChoice("finished","Use Finished Inventory","Use a completed item in the exact product and color.",item,order)}
        ${fulfillmentChoice("kit","Use Fabrication Kit","Use a prepared product-and-color-specific kit.",item,order)}
        ${fulfillmentChoice("raw","Build From Raw Materials","Prepare the item from individual supplies.",item,order)}
      </div>

      ${renderInventorySnapshot(item)}

      <div class="materials-card">
        <div class="checklist-heading">
          <h5>Materials Status</h5>
          <span>Informational — does not block manufacturing</span>
        </div>
        <div class="materials-list">
          ${product.materials.map(material => renderMaterialRow(order,item,material)).join("")}
        </div>
      </div>

      <div class="process-footer">
        <span>${fulfillmentChosen ? "Planning is complete. You may begin the next stage." : "Choose a fulfillment method to continue."}</span>
        <button class="button primary" data-action="complete-prepare" data-order-id="${order.id}" data-item-id="${item.id}" ${fulfillmentChosen ? "" : "disabled"}>
          ${item.workflow.fulfillmentMethod==="finished" ? "Send to Packing →" : "Begin Manufacturing →"}
        </button>
      </div>`;
  }

  function renderMaterialRow(order,item,material) {
    const current = item.workflow.materialStatuses[material.id] || "Available";
    const className = current.toLowerCase().replaceAll(" ","-");
    return `
      <div class="material-row">
        <div>
          <strong>${escapeHTML(material.name)}</strong>
          <span class="material-status-dot ${className}"></span>
        </div>
        <select data-action="material-status" data-order-id="${order.id}" data-item-id="${item.id}" data-material-id="${material.id}">
          ${["Available","Need to Buy","Ordered","Backordered"].map(status => `<option value="${status}" ${status===current ? "selected" : ""}>${status}</option>`).join("")}
        </select>
      </div>`;
  }

  function fulfillmentChoice(value,title,copy,item,order) {
    return `<label class="fulfillment-card ${item.workflow.fulfillmentMethod===value ? "selected" : ""}">
      <input type="radio" name="fulfillment-${item.id}" value="${value}" data-action="fulfillment" data-order-id="${order.id}" data-item-id="${item.id}" ${item.workflow.fulfillmentMethod===value ? "checked" : ""}>
      <span class="fulfillment-dot"></span><strong>${title}</strong><small>${copy}</small></label>`;
  }

  function workingRecipeStages(item) {
    const recipe = recipeByProductId(item.productId);
    if (!recipe) return [];
    if (item.workflow.fulfillmentMethod === "kit") {
      return recipe.stages.filter(stage => stage.id !== "cord-preparation");
    }
    return recipe.stages;
  }

  function renderManufacturePane(order,item) {
    const recipe = recipeByProductId(item.productId);
    const stages = workingRecipeStages(item);
    const completed = stages.filter(stage => Boolean(item.recipeStageChecks?.[stage.id])).length;
    const product = productById(item.productId);
    const missing = product.materials.filter(material => item.workflow.materialStatuses[material.id] !== "Available");

    if (item.workflow.fulfillmentMethod === "finished") {
      return `
        <div class="process-pane-heading">
          <div><p class="eyebrow">Step 2</p><h4>Manufacturing & Assembly</h4><p>This item is using finished inventory, so manufacturing is skipped.</p></div>
        </div>
        <div class="shipping-notice">Continue to Pack & Ship for this item.</div>
        <div class="process-footer">
          <button class="button secondary" data-action="process-tab" data-tab="prepare" data-order-id="${order.id}" data-item-id="${item.id}">← Back to Planning</button>
          <button class="button primary" data-action="process-tab" data-tab="pack" data-order-id="${order.id}" data-item-id="${item.id}">Go to Pack & Ship →</button>
        </div>`;
    }

    return `
      <div class="process-pane-heading">
        <div>
          <p class="eyebrow">Step 2 · Production Traveler</p>
          <h4>${escapeHTML(recipe?.title || item.productName)}</h4>
          <p>This is the working copy for ${escapeHTML(order.customerName)}’s order. Checkpoints save only to this item.</p>
        </div>
        <span class="badge status">${completed} of ${stages.length} milestones</span>
      </div>

      ${missing.length ? `<div class="shipping-rule"><strong>Still needed later:</strong> ${missing.map(material => `${escapeHTML(material.name)} (${escapeHTML(item.workflow.materialStatuses[material.id])})`).join(", ")}</div>` : ""}

      ${recipe ? `
        <div class="working-quick-reference">
          ${recipe.quickReference.map(ref => `<article><span>${escapeHTML(ref.label)}</span><strong>${escapeHTML(ref.value)}</strong><small>${escapeHTML(ref.note || "")}</small></article>`).join("")}
        </div>

        <div class="working-recipe-stages">
          ${stages.map((stage,index) => renderWorkingRecipeStage(order,item,stage,index)).join("")}
        </div>

        <div class="working-recipe-footer">
          <span>Need to change the permanent instructions?</span>
          <button class="text-button" data-action="open-item-recipe" data-order-id="${order.id}" data-item-id="${item.id}" data-recipe-id="${item.productId}">Open Workshop Recipe</button>
        </div>
      ` : `<div class="shipping-notice">No Workshop Recipe is available for this product yet.</div>`}

      <div class="process-footer">
        <button class="button secondary" data-action="process-tab" data-tab="prepare" data-order-id="${order.id}" data-item-id="${item.id}">← Back to Planning</button>
        <button class="button primary" data-action="complete-working-recipe" data-order-id="${order.id}" data-item-id="${item.id}" ${completed === stages.length && stages.length ? "" : "disabled"}>Ready for Packing →</button>
      </div>`;
  }

  function renderWorkingRecipeStage(order,item,stage,index) {
    const checked = Boolean(item.recipeStageChecks?.[stage.id]);
    const shouldOpen = !checked && workingRecipeStages(item).find(current => !item.recipeStageChecks?.[current.id])?.id === stage.id;
    return `
      <article class="working-stage ${checked ? "complete" : ""}">
        <div class="working-stage-heading">
          <span>${checked ? "✓" : index + 1}</span>
          <div><strong>${escapeHTML(stage.title)}</strong><small>${escapeHTML(stage.checkpoint)}</small></div>
          <label class="working-stage-check">
            <input type="checkbox" data-action="working-stage-check" data-order-id="${order.id}" data-item-id="${item.id}" data-stage-id="${stage.id}" ${checked ? "checked" : ""}>
            <span>${checked ? "Complete" : "Mark Complete"}</span>
          </label>
        </div>
        <div class="recipe-stage-quick">
          ${stage.quick.map(line => `<span>${escapeHTML(line)}</span>`).join("")}
        </div>
        <details ${shouldOpen ? "open" : ""}>
          <summary>Show Instructions</summary>
          <ol>${stage.instructions.map(line => `<li>${escapeHTML(line)}</li>`).join("")}</ol>
        </details>
      </article>`;
  }

  function renderManufacturingChecklist(labels,checks,sectionIndex,orderId,itemId) {
    return `<div class="process-checklist">${labels.map((label,stepIndex) => {
      const key = `${sectionIndex}-${stepIndex}`;
      const checked = Boolean(checks[key]);
      return `<label class="process-check ${checked ? "checked" : ""}">
        <input type="checkbox" ${checked ? "checked" : ""} data-action="manufacturing-check" data-key="${key}" data-order-id="${orderId}" data-item-id="${itemId}">
        <span class="check-box">${checked ? "✓" : ""}</span>
        <span class="step-number">${stepIndex+1}</span>
        <span>${escapeHTML(label)}</span>
      </label>`;
    }).join("")}</div>`;
  }

  function packingDisplayEntries(product) {
    return (product?.packingChecklist || []).map((label,index) => ({label,index}))
      .filter(entry => !/product tag/i.test(entry.label));
  }

  function renderPackPane(order,item) {
    const outstanding = order.items.filter(orderItem => !["Ready for Packing","Packed","Ready to Mail","Completed"].includes(orderItem.status));
    const unresolvedDowels = order.items.filter(orderItem => dowelConfigForProduct(orderItem.productId) && !preparedDowelReady(orderItem));
    return `
      <div class="process-pane-heading"><div><p class="eyebrow">Step 3</p><h4>Pack & Ship</h4><p>Finish item packing, shared order packaging, and shipping in one workspace.</p></div></div>
      ${outstanding.length || unresolvedDowels.length ? `<section class="panel outstanding-work"><div class="panel-heading"><div><p class="eyebrow">Outstanding Work</p><h3>Earlier work still needs attention</h3></div><span class="badge attention">${outstanding.length + unresolvedDowels.length}</span></div><div class="compact-list">${outstanding.map(outstandingItem => `<div><strong>${escapeHTML(outstandingItem.productName)} — ${escapeHTML(outstandingItem.color)}</strong><span>${escapeHTML(outstandingItem.status)}</span></div>`).join("")}${unresolvedDowels.map(dowelItem => `<div><strong>${escapeHTML(dowelItem.productName)} — ${escapeHTML(dowelItem.color)}</strong><span>Prepared dowel still required</span></div>`).join("")}</div></section>` : ""}
      ${renderOrderShipping(order,item.id)}`;
  }

  function renderChecklist(labels,checks,action,orderId,itemId,numbered=false,hideProductTags=false) {
    const order = data.orders.find(order => order.id === orderId);
    const item = order?.items.find(item => item.id === itemId);
    return `<div class="process-checklist">${labels.map((label,index) => ({label,index})).filter(entry => !(hideProductTags && /product tag/i.test(entry.label))).map(({label,index}) => {
      const inventoryConfig = item ? packingInventoryConfig(item,index,label) : null;
      const inventoryItem = inventoryConfig ? inventoryItemById(inventoryConfig.inventoryItemId) : null;
      const inventoryLine = inventoryConfig
        ? `<small class="inventory-task-detail ${Number(inventoryItem?.quantity || 0) <= 0 ? "out" : ""}">${inventoryItem ? `${Number(inventoryItem.quantity || 0)} available · Required ${inventoryConfig.quantity} · ${escapeHTML(inventoryItem.name)}` : "Mailer inventory link missing"}</small>`
        : "";
      return `<label class="process-check ${inventoryConfig ? "inventory-aware-check" : ""} ${checks[index] ? "checked" : ""}"><input type="checkbox" ${checks[index] ? "checked" : ""} data-action="${action}" data-index="${index}" data-order-id="${orderId}" data-item-id="${itemId}">
      <span class="check-box">${checks[index] ? "✓" : ""}</span>${numbered ? `<span class="step-number">${index+1}</span>` : ""}<span class="process-check-copy"><span>${escapeHTML(label)}</span>${inventoryLine}</span></label>`;
    }).join("")}</div>`;
  }

  function dowelConfigForProduct(productId) {
    if (productId === "macrame-paper-towel-holder") return {
      preparedId:"prepared-paper-towel-dowels",
      rawId:"paper-towel-dowels",
      label:"Paper Towel Holder Dowel",
      preparedLabel:"Prepared paper towel dowel",
      components:[{itemId:"paper-towel-dowels",quantity:1,label:"Raw paper towel dowel"},{itemId:"end-caps",quantity:2,label:"End caps"}],
      preparationDescription:"Cut to length, fit with two end caps, inspect, and make ready for the mailer."
    };
    if (productId === "macrame-toilet-paper-holder") return {
      preparedId:"prepared-toilet-paper-dowels",
      rawId:"toilet-paper-dowels",
      label:"Toilet Paper Holder Dowel",
      preparedLabel:"Prepared toilet paper dowel",
      components:[{itemId:"toilet-paper-dowels",quantity:1,label:"Raw toilet paper dowel"}],
      preparationDescription:"Cut to the correct toilet paper holder length, inspect, and make ready for the mailer. No end caps are used."
    };
    return null;
  }
  function preparedDowelTaskKey(item){ return `prepared-dowel-${item.id}`; }
  function preparedDowelReady(item){ return !dowelConfigForProduct(item.productId) || Boolean(item.workflow.preparedDowelReady); }
  function assignPreparedDowelFromStock(order,item){
    const config=dowelConfigForProduct(item.productId);
    if(!config)return true;
    const taskKey=preparedDowelTaskKey(item);
    if(item.workflow.preparedDowelReady)return true;
    const ok=consumeInventoryForTask({order,item,taskKey,inventoryItemId:config.preparedId,quantity:1,label:config.preparedLabel});
    if(!ok)return false;
    item.workflow.preparedDowelReady=true; item.workflow.preparedDowelMode="stock"; touchOrder(order,item); saveData(); showToast(`${config.label} assigned to this order.`); return true;
  }
  function prepareDowelForOrder(order,item){
    const config=dowelConfigForProduct(item.productId);
    if(!config||item.workflow.preparedDowelReady)return true;
    const shortages=config.components.filter(component=>Number(inventoryItemById(component.itemId)?.quantity||0)<component.quantity);
    if(shortages.length){
      const needs=config.components.map(component=>`${component.quantity} ${component.label.toLowerCase()}`).join(" and ");
      showToast(`You need ${needs} to prepare this dowel.`); return false;
    }
    const consumed=[];
    for(const component of config.components){
      const key=`${preparedDowelTaskKey(item)}-${component.itemId}`;
      if(!consumeInventoryForTask({order,item,taskKey:key,inventoryItemId:component.itemId,quantity:component.quantity,label:component.label})){
        consumed.forEach(previous=>restoreInventoryForTask({order,item,taskKey:previous.key,label:previous.label}));
        return false;
      }
      consumed.push({key,label:component.label});
    }
    item.workflow.preparedDowelReady=true; item.workflow.preparedDowelMode="order"; touchOrder(order,item); saveData(); showToast(`${config.label} prepared and assigned to this order.`); return true;
  }
  function returnPreparedDowel(order,item){
    const config=dowelConfigForProduct(item.productId);
    if(!config||!item.workflow.preparedDowelReady)return;
    if(item.workflow.preparedDowelMode==="stock") restoreInventoryForTask({order,item,taskKey:preparedDowelTaskKey(item),label:config.preparedLabel});
    if(item.workflow.preparedDowelMode==="order"){
      const prepared=inventoryItemById(config.preparedId);
      if(prepared){
        prepared.quantity=Number(prepared.quantity||0)+1;
        recordInventoryTransaction({type:"return",itemId:prepared.id,quantity:1,reason:"Order dowel returned",details:`Returned a ${config.preparedLabel} from Etsy order ${order.etsyOrderNumber||order.id}.`,relatedItemId:item.id,orderId:order.id,etsyOrderNumber:order.etsyOrderNumber||"",orderItemId:item.id,source:"order-production"});
      }
      config.components.forEach(component=>delete item.workflow.inventoryTaskTransactions[`${preparedDowelTaskKey(item)}-${component.itemId}`]);
    }
    item.workflow.preparedDowelReady=false; item.workflow.preparedDowelMode="";
  }
  function renderPreparedDowelTask(order,item){
    const config=dowelConfigForProduct(item.productId);
    if(!config)return "";
    const prepared=inventoryItemById(config.preparedId);
    const componentSummary=config.components.map(component=>`${Number(inventoryItemById(component.itemId)?.quantity||0)} ${escapeHTML(component.label.toLowerCase())}`).join(" and ");
    const canPrepare=config.components.every(component=>Number(inventoryItemById(component.itemId)?.quantity||0)>=component.quantity);
    const ready=Boolean(item.workflow.preparedDowelReady);
    if(ready)return `<div class="process-check inventory-aware-check checked prepared-dowel-task"><span class="check-box">✓</span><span class="process-check-copy"><span>${escapeHTML(config.label)} Ready — ${escapeHTML(item.color)}</span><small>${item.workflow.preparedDowelMode==="stock"?"Assigned from prepared-dowel inventory.":"Prepared specifically for this order."}</small></span><button class="button secondary small" type="button" data-action="return-prepared-dowel" data-order-id="${order.id}" data-item-id="${item.id}">Undo</button></div>`;
    return `<div class="process-check inventory-aware-check prepared-dowel-task"><span class="check-box"></span><span class="process-check-copy"><span>Resolve ${escapeHTML(config.label)} — ${escapeHTML(item.color)}</span><small class="inventory-task-detail ${Number(prepared?.quantity||0)<=0?"out":""}">${Number(prepared?.quantity||0)} prepared available · or make one from ${componentSummary}</small><small>${escapeHTML(config.preparationDescription)}</small></span><div class="task-row-actions"><button class="button secondary small" type="button" data-action="use-prepared-dowel" data-order-id="${order.id}" data-item-id="${item.id}" ${Number(prepared?.quantity||0)>0?"":"disabled"}>Use Prepared Dowel</button><button class="button primary small" type="button" data-action="prepare-order-dowel" data-order-id="${order.id}" data-item-id="${item.id}" ${canPrepare?"":"disabled"}>Prepare One Now</button></div></div>`;
  }

  function renderOrderShipping(order,currentItemId=null) {
    const productionReady = order.items.every(i => ["Ready for Packing","Packed","Ready to Mail","Completed"].includes(i.status));
    const tagGroups = productTagGroupsForOrder(order);
    const tagDone = tagGroups.filter(group => Boolean(order.shipping.productTagChecks?.[group.taskKey])).length;
    const careSheetDone = Boolean(order.shipping.careSheetPrinted);
    const labelDone = Boolean(order.shipping.labelAttached);
    const stickerDone = Boolean(order.shipping.companyStickerAttached);
    const sealedDone = Boolean(order.shipping.mailerSealed);
    const mailerTasks = order.items.map(orderItem => {
      const product = productById(orderItem.productId);
      const entry = (product?.packingChecklist || []).map((label,index) => ({label,index}))
        .find(row => packingInventoryConfig(orderItem,row.index,row.label));
      return { orderItem, product, entry };
    });
    const mailersDone = mailerTasks.filter(({orderItem,entry}) => entry && Boolean(orderItem.workflow.packingChecks[entry.index])).length;
    const dowelItems = order.items.filter(orderItem => dowelConfigForProduct(orderItem.productId));
    const dowelsDone = dowelItems.filter(preparedDowelReady).length;
    const done = tagDone + mailersDone + dowelsDone + [careSheetDone,labelDone,stickerDone,sealedDone].filter(Boolean).length;
    const total = tagGroups.length + mailerTasks.length + dowelItems.length + 4;
    const ready = productionReady && done === total;
    const careSheetId = careSheetInventoryIdForOrder(order);
    const careSheet = inventoryItemById(careSheetId);
    const careSheetQuantity = Number(careSheet?.quantity || 0);
    const careSheetLow = careSheet && careSheetQuantity <= Number(careSheet.reorderAt || 0);
    const stickerId = companyStickerInventoryIdForOrder(order);
    const sticker = stickerId ? inventoryItemById(stickerId) : null;

    const renderTagTask = group => {
      const tag = group.inventoryItemId ? inventoryItemById(group.inventoryItemId) : null;
      const checked = Boolean(order.shipping.productTagChecks?.[group.taskKey]);
      const title = group.quantity > 1
        ? `Attach ${escapeHTML(group.shortName)} Product Tags — ${escapeHTML(group.color)}`
        : `Attach ${escapeHTML(group.productName)} Tag — ${escapeHTML(group.color)}`;
      const low = tag && Number(tag.quantity || 0) <= Number(tag.reorderAt || 0);
      return `<label class="process-check inventory-aware-check ${checked ? "checked" : ""}"><input type="checkbox" ${checked ? "checked" : ""} data-action="product-tag-check" data-task-key="${escapeHTML(group.taskKey)}" data-order-id="${order.id}"><span class="check-box">${checked ? "✓" : ""}</span><span class="process-check-copy"><span>${title}</span><small class="inventory-task-detail ${!tag || Number(tag.quantity || 0) < group.quantity ? "out" : ""}">${tag ? `${Number(tag.quantity || 0)} available · Required ${group.quantity} · ${escapeHTML(tag.name)}` : "Product tag inventory link missing"}</small>${low ? `<small class="inventory-low-message">${Number(tag.quantity || 0) <= 0 ? "Product tags are out of stock." : `Only ${Number(tag.quantity || 0)} product tags remain.`}</small>` : ""}</span></label>`;
    };

    const renderMailerTask = ({orderItem,product,entry},index) => {
      if (!entry) return `<div class="process-check inventory-aware-check"><span class="check-box"></span><span class="process-check-copy"><span>Pack Mailer — ${escapeHTML(orderItem.productName)} — ${escapeHTML(orderItem.color)}</span><small class="inventory-task-detail out">Mailer configuration missing</small></span></div>`;
      const config = packingInventoryConfig(orderItem,entry.index,entry.label);
      const mailer = inventoryItemById(config?.inventoryItemId);
      const checked = Boolean(orderItem.workflow.packingChecks[entry.index]);
      const needsDowel = Boolean(dowelConfigForProduct(orderItem.productId));
      const dowelReady = preparedDowelReady(orderItem);
      return `<label class="process-check inventory-aware-check pack-mailer-task ${checked ? "checked" : ""} ${!dowelReady ? "blocked" : ""}">
        <input type="checkbox" ${checked ? "checked" : ""} ${dowelReady ? "" : "disabled"} data-action="packing-check" data-index="${entry.index}" data-order-id="${order.id}" data-item-id="${orderItem.id}">
        <span class="check-box">${checked ? "✓" : ""}</span>
        <span class="process-check-copy">
          <span>Pack Mailer — ${escapeHTML(orderItem.productName)} — ${escapeHTML(orderItem.color)}</span>
          <small class="pack-mailer-contents">Insert the tagged product · care sheet with Etsy packing slip on reverse${needsDowel ? " · prepared dowel" : ""}</small>${!dowelReady ? `<small class="inventory-low-message">Resolve the prepared dowel before packing this mailer.</small>` : ""}
          <small class="inventory-task-detail ${Number(mailer?.quantity || 0) < 1 ? "out" : ""}">${mailer ? `${Number(mailer.quantity || 0)} available · Required 1 · ${escapeHTML(mailer.name)}` : "Mailer inventory link missing"}</small>
        </span>
      </label>`;
    };

    return `<section class="order-shipping panel unified-pack-ship">
      <div class="panel-heading"><div><p class="eyebrow">Unified workflow</p><h3>Pack the Order</h3><p>Follow the same sequence you use at the packing table. When every step is complete, the order is Ready to Mail.</p></div><span class="badge ${ready ? "complete" : "status"}">${done} of ${total}</span></div>
      ${!productionReady ? `<div class="shipping-notice">Manufacturing is not complete for every item. Resolve the Outstanding Work above before marking this order packed.</div>` : ""}
      <div class="process-checklist pack-order-sequence">
        ${tagGroups.map(renderTagTask).join("")}
        <div class="process-check inventory-aware-check care-sheet-task ${careSheetDone ? "checked" : ""}">
          <label class="process-check-main"><input type="checkbox" ${careSheetDone ? "checked" : ""} data-action="shipping-check" data-key="careSheetPrinted" data-order-id="${order.id}"><span class="check-box">${careSheetDone ? "✓" : ""}</span><span class="process-check-copy"><span>Prepare Care Sheet & Etsy Packing Slip</span><small>Print the Etsy packing slip on the reverse side of the care sheet.</small><small class="inventory-task-detail ${careSheetQuantity <= 0 ? "out" : ""}">${careSheet ? `${careSheetQuantity} available · Required 1 · ${escapeHTML(careSheet.name)}` : "Care sheet inventory link missing"}</small>${careSheetLow ? `<small class="inventory-low-message">${careSheetQuantity <= 0 ? "Care sheets are out of stock." : `Only ${careSheetQuantity} care sheets remain.`}</small>` : ""}</span></label>
          <div class="task-row-actions"><button class="button secondary small" type="button" data-action="external-link" data-link="etsyOrders">Open Etsy Orders</button><button class="button secondary small" type="button" data-action="print-care-sheet">Print More Care Sheets</button></div>
        </div>
        ${order.items.map(orderItem => renderPreparedDowelTask(order,orderItem)).join("")}
        ${mailerTasks.map(renderMailerTask).join("")}
        <div class="process-check task-with-link ${labelDone ? "checked" : ""}"><label class="process-check-main"><input type="checkbox" ${labelDone ? "checked" : ""} data-action="shipping-check" data-key="labelAttached" data-order-id="${order.id}"><span class="check-box">${labelDone ? "✓" : ""}</span><span class="process-check-copy"><span>Print & Attach Shipping Label</span><small>Purchase and print the label in Shippo, then attach it to the mailer.</small></span></label><button class="button secondary small" type="button" data-action="external-link" data-link="shippo">Open Shippo</button></div>
        <label class="process-check inventory-aware-check ${stickerDone ? "checked" : ""}"><input type="checkbox" ${stickerDone ? "checked" : ""} data-action="shipping-check" data-key="companyStickerAttached" data-order-id="${order.id}"><span class="check-box">${stickerDone ? "✓" : ""}</span><span class="process-check-copy"><span>Apply Simply Ummiby Branding Sticker</span><small class="inventory-task-detail ${Number(sticker?.quantity || 0) <= 0 ? "out" : ""}">${sticker ? `${Number(sticker.quantity || 0)} available · Required 1 · ${escapeHTML(sticker.name)}` : "Company sticker inventory link missing"}</small></span></label>
        <label class="process-check ${sealedDone ? "checked" : ""}"><input type="checkbox" ${sealedDone ? "checked" : ""} data-action="shipping-check" data-key="mailerSealed" data-order-id="${order.id}"><span class="check-box">${sealedDone ? "✓" : ""}</span><span class="process-check-copy"><span>Close & Seal Package</span></span></label>
      </div>
      <div class="process-footer"><span>${order.status === "Ready to Mail" || order.status === "Completed" ? "Everything is packed." : ready ? "Everything is packed. Mark the order packed when you are finished." : "Complete the packing sequence, then mark the order packed."}</span>${order.status === "Ready to Mail" || order.status === "Completed" ? "" : `<button class="button primary" data-action="ready-mail" data-order-id="${order.id}" ${ready ? "" : "disabled"}>Mark Order Packed</button>`}</div>
      ${renderReadyToMailSection(order)}
    </section>`;
  }

  function formatShipDate(value) {
    if (!value) return "Date not recorded";
    const [year,month,day] = String(value).slice(0,10).split("-").map(Number);
    if (!year || !month || !day) return "Date not recorded";
    return new Date(year,month-1,day).toLocaleDateString(undefined,{year:"numeric",month:"long",day:"numeric"});
  }

  function localDateInputValue(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth()+1).padStart(2,"0");
    const day = String(date.getDate()).padStart(2,"0");
    return `${year}-${month}-${day}`;
  }

  function renderReadyToMailSection(order) {
    if (!['Ready to Mail','Completed'].includes(order.status)) return '';
    const packedLabel = order.shipping?.packedAt ? new Date(order.shipping.packedAt).toLocaleString() : 'Packed';
    if (order.status === 'Completed') {
      const shipDateLabel = formatShipDate(order.shipping?.shipDate || order.shipping?.mailedAt);
      return `<section class="ready-mail-panel complete"><div><p class="eyebrow">Order complete</p><h3>Mailed</h3><p>Actual ship date: <strong>${escapeHTML(shipDateLabel)}</strong></p></div><div class="ready-mail-actions"><span class="badge complete">100%</span><button class="button secondary small" type="button" data-action="edit-ship-date" data-order-id="${order.id}">Edit Ship Date</button></div></section>`;
    }
    return `<section class="ready-mail-panel"><div><p class="eyebrow">Final step</p><h3>Ready to Mail</h3><p>Packed ${escapeHTML(packedLabel)}. Record the date the package was actually mailed.</p></div><button class="button primary" type="button" data-action="mark-mailed" data-order-id="${order.id}">Mark as Mailed</button></section>`;
  }

  function workflowPercent(item) {
    const stages = workingRecipeStages(item);
    const recipeDone = stages.filter(stage => Boolean(item.recipeStageChecks?.[stage.id])).length;
    const packingTotal = productById(item.productId)?.packingChecklist?.length || 0;
    const total = stages.length + packingTotal + 1;
    const done = recipeDone + countDone(item.workflow.packingChecks) + (item.workflow.fulfillmentMethod ? 1 : 0);
    if (item.status === "Completed") return 100;
    if (item.status === "Ready to Mail") return 95;
    return total ? Math.round((done / total) * 100) : 0;
  }

  function countDone(checks) { return Object.values(checks || {}).filter(Boolean).length; }
  function allChecked(checks) { const values = Object.values(checks || {}); return values.length > 0 && values.every(Boolean); }

  function updateManufacturingCheck(orderId,itemId,key,checked) {
    const order = data.orders.find(o => o.id === orderId);
    const item = order?.items.find(i => i.id === itemId);
    if (!item) return;
    item.workflow.manufacturingChecks[key] = checked;
    item.status = "Manufacturing";
    touchOrder(order,item);
    saveData();
    renderOrderWorkspace(order,item.id);
  }

  function updatePackingCheck(orderId,itemId,index,checked) {
    const order = data.orders.find(o => o.id === orderId);
    const item = order?.items.find(i => i.id === itemId);
    if (!item) return;
    const product = productById(item.productId);
    const label = product?.packingChecklist?.[Number(index)] || "Packing task";
    const inventoryConfig = packingInventoryConfig(item,Number(index),label);
    if (inventoryConfig && checked) {
      const completed = consumeInventoryForTask({order,item,label, ...inventoryConfig});
      if (!completed) return renderOrderWorkspace(order,item.id);
    }
    if (inventoryConfig && !checked) {
      const result = restoreInventoryForTask({order,item,taskKey:inventoryConfig.taskKey,label});
      if (result.error) return renderOrderWorkspace(order,item.id);
      if (result.restored) showToast(`${result.quantity} ${result.itemName} returned to inventory.`);
      else if (result.legacy) showToast("Legacy checklist step cleared; no inventory was changed.");
    }
    item.workflow.packingChecks[index] = checked;
    if (!["Packed","Ready to Mail","Completed"].includes(item.status)) item.status = "Ready for Packing";
    touchOrder(order,item);
    saveData();
    renderOrderWorkspace(order,item.id);
  }

  function updateMaterialStatus(orderId,itemId,materialId,status) {
    const order = data.orders.find(o => o.id === orderId);
    const item = order?.items.find(i => i.id === itemId);
    if (!item) return;
    item.workflow.materialStatuses[materialId] = status;
    touchOrder(order,item);
    if (status === "Need to Buy") {
      const product = productById(item.productId);
      const material = product.materials.find(m => m.id === materialId);
      data.activity.unshift({text:`Marked ${material?.name || "material"} as Need to Buy`,time:"Just now"});
    }
    saveData();
    renderOrderWorkspace(order,item.id);
  }

  function selectFulfillment(orderId,itemId,value) {
    const order=data.orders.find(o => o.id===orderId);
    const item=order?.items.find(i => i.id===itemId);
    if (!item) return;
    item.workflow.fulfillmentMethod=value;
    item.status="Preparing";
    touchOrder(order,item);
    data.activity.unshift({text:`Selected ${value==="finished" ? "finished inventory" : value==="kit" ? "ready pack" : "raw materials"} for ${item.productName}`,time:"Just now"});
    saveData();
    renderOrderWorkspace(order,item.id);
  }

  function setProcessTab(orderId,itemId,tab) {
    const order=data.orders.find(o => o.id===orderId);
    const item=order?.items.find(i => i.id===itemId);
    if (!item) return;
    item.workflow.activeTab=tab;
    touchOrder(order,item);
    saveData();
    renderOrderWorkspace(order,item.id);
  }

  function completePrepare(orderId,itemId) {
    const order = data.orders.find(o => o.id === orderId);
    const item = order?.items.find(i => i.id === itemId);
    if (!item.workflow.fulfillmentMethod) return showToast("Choose a fulfillment method first.");
    if (item.workflow.fulfillmentMethod === "finished") {
      item.status = "Ready for Packing";
      item.workflow.activeTab = "pack";
      data.activity.unshift({text:`Assigned finished inventory to ${item.productName}`,time:"Just now"});
    } else {
      item.status = "Manufacturing";
      item.workflow.activeTab = "manufacture";
      data.activity.unshift({text:`Started manufacturing ${item.productName}`,time:"Just now"});
    }
    touchOrder(order,item);
    saveData();
    renderOrderWorkspace(order,item.id);
  }

  function completeWorkingRecipe(orderId,itemId) {
    const order = data.orders.find(o => o.id === orderId);
    const item = order?.items.find(i => i.id === itemId);
    if (!item) return;
    const stages = workingRecipeStages(item);
    if (!stages.length || !stages.every(stage => Boolean(item.recipeStageChecks?.[stage.id]))) {
      return showToast("Complete each production milestone first.");
    }
    const product = productById(item.productId);
    const missing = product.materials.filter(material => item.workflow.materialStatuses[material.id] !== "Available");
    const finish = () => {
      item.status = "Ready for Packing";
      item.workflow.activeTab = "pack";
      touchOrder(order,item);
      data.activity.unshift({text:`Finished manufacturing ${item.productName}`,time:"Just now"});
      saveData();
      renderOrderWorkspace(order,item.id);
    };
    if (!missing.length) return finish();
    showModal(
      "Some materials are still marked unavailable",
      `<p>You still have: <strong>${missing.map(material => `${escapeHTML(material.name)} — ${escapeHTML(item.workflow.materialStatuses[material.id])}`).join(", ")}</strong>.</p><p>Continue if those statuses are out of date, or keep the item waiting on material.</p>`,
      [
        {label:"Waiting on Material",kind:"secondary",onClick:() => {
          item.status = "Waiting on Material";
          item.workflow.activeTab = "manufacture";
          touchOrder(order,item);
          saveData();
          renderOrderWorkspace(order,item.id);
        }},
        {label:"Continue Anyway",kind:"primary",onClick:finish}
      ]
    );
  }

  function completeManufacture(orderId,itemId) {
    const order = data.orders.find(o => o.id === orderId);
    const item = order?.items.find(i => i.id === itemId);
    if (!allChecked(item.workflow.manufacturingChecks)) return;
    const product = productById(item.productId);
    const missing = product.materials.filter(material => item.workflow.materialStatuses[material.id] !== "Available");
    const finish = () => {
      item.status = "Ready for Packing";
      item.workflow.activeTab = "pack";
      touchOrder(order,item);
      data.activity.unshift({text:`Finished manufacturing ${item.productName}`,time:"Just now"});
      saveData();
      renderOrderWorkspace(order,item.id);
    };
    if (!missing.length) return finish();

    showModal(
      "Some materials are still marked unavailable",
      `<p>You still have: <strong>${missing.map(material => `${escapeHTML(material.name)} — ${escapeHTML(item.workflow.materialStatuses[material.id])}`).join(", ")}</strong>.</p><p>You may continue if the status is simply out of date, or move the item to Waiting on Material.</p>`,
      [
        {label:"Waiting on Material",kind:"secondary",onClick:() => {
          item.status = "Waiting on Material";
          item.workflow.activeTab = "manufacture";
          touchOrder(order,item);
          saveData();
          renderOrderWorkspace(order,item.id);
        }},
        {label:"Continue Anyway",kind:"primary",onClick:finish}
      ]
    );
  }

  function completePack(orderId,itemId) {
    const order=data.orders.find(o => o.id===orderId);
    const item=order?.items.find(i => i.id===itemId);
    if (!packingDisplayEntries(productById(item.productId)).every(entry => Boolean(item.workflow.packingChecks[entry.index]))) return;
    item.status="Packed";
    touchOrder(order,item); data.activity.unshift({text:`Packed ${item.productName}`,time:"Just now"}); saveData(); renderOrderWorkspace(order,item.id);
  }

  function updateProductTagCheck(orderId,taskKey,checked) {
    const order=data.orders.find(o => o.id===orderId);
    if (!order) return;
    const group=productTagGroupsForOrder(order).find(group => group.taskKey===taskKey);
    if (!group) return showToast("This product-tag task no longer matches the order. Reopen the order to refresh it.");
    order.shipping.productTagChecks ||= {};
    if (!group.inventoryItemId) {
      showToast(`${group.productName} is missing its Product Tag Inventory Item in Product Master.`);
      return renderOrderWorkspace(order);
    }
    if (checked) {
      const completed=consumeInventoryForTask({order,taskKey,inventoryItemId:group.inventoryItemId,quantity:group.quantity,label:`${group.productName} product tag`});
      if (!completed) return renderOrderWorkspace(order);
      order.shipping.productTagChecks[taskKey]=true;
    } else {
      const result=restoreInventoryForTask({order,taskKey,label:`${group.productName} product tag`});
      if (result.error) return renderOrderWorkspace(order);
      delete order.shipping.productTagChecks[taskKey];
      if (result.restored) showToast(`${result.quantity} ${result.itemName} returned to inventory.`);
      else if (result.legacy) showToast("Legacy product-tag step cleared; no inventory was changed.");
    }
    touchOrder(order); saveData(); renderOrderWorkspace(order);
  }

  function updateShippingCheck(orderId,key,checked) {
    const order=data.orders.find(o => o.id===orderId);
    if (!order) return;
    if (["companyStickerAttached","careSheetPrinted"].includes(key)) {
      const isCareSheet = key === "careSheetPrinted";
      const inventoryItemId = isCareSheet ? careSheetInventoryIdForOrder(order) : companyStickerInventoryIdForOrder(order);
      const taskKey = isCareSheet ? "shipping-care-sheet" : "shipping-company-sticker";
      const label = isCareSheet ? "care instruction sheet" : "Simply Ummiby company sticker";
      if (checked) {
        const completed = consumeInventoryForTask({order,taskKey,inventoryItemId,quantity:1,label});
        if (!completed) return renderOrderWorkspace(order);
      } else {
        const result = restoreInventoryForTask({order,taskKey,label});
        if (result.error) return renderOrderWorkspace(order);
        if (result.restored) showToast(`${result.quantity} ${result.itemName} returned to inventory.`);
        else if (result.legacy) showToast("Legacy checklist step cleared; no inventory was changed.");
      }
    }
    order.shipping[key]=checked;
    if (key === "careSheetPrinted") order.shipping.packingSlipPrinted = checked;
    if (key === "labelAttached") order.shipping.shippoOpened = checked;
    touchOrder(order); saveData(); renderOrderWorkspace(order);
  }

  function markReadyMail(orderId) {
    const order=data.orders.find(o => o.id===orderId);
    const productionReady=order.items.every(i => ["Ready for Packing","Packed","Ready to Mail","Completed"].includes(i.status));
    const mailersDone=order.items.every(item => {
      const product=productById(item.productId);
      const entry=(product?.packingChecklist || []).map((label,index) => ({label,index})).find(row => packingInventoryConfig(item,row.index,row.label));
      return entry && Boolean(item.workflow.packingChecks[entry.index]);
    });
    const shippingDone=["careSheetPrinted","labelAttached","companyStickerAttached","mailerSealed"].every(key => Boolean(order.shipping[key]));
    const tagsDone=productTagGroupsForOrder(order).every(group => Boolean(order.shipping.productTagChecks?.[group.taskKey]));
    if (!productionReady || !mailersDone || !shippingDone || !tagsDone) return showToast("Complete the full packing sequence first.");
    order.items.forEach(i => { if (i.status!=="Completed") i.status="Ready to Mail"; });
    order.shipping.packedAt ||= new Date().toISOString();
    order.shipping.mailedAt = null;
    touchOrder(order); data.activity.unshift({text:`Packed order for ${order.customerName}; ready to mail`,time:"Just now"}); saveData(); renderOrderWorkspace(order);
  }

  function showShipDateModal(orderId,editing = false) {
    const order=data.orders.find(o => o.id===orderId);
    if (!order) return;
    if (!editing && order.status !== "Ready to Mail") return showToast("Mark the order packed before marking it mailed.");
    const currentDate = order.shipping?.shipDate || (order.shipping?.mailedAt ? String(order.shipping.mailedAt).slice(0,10) : localDateInputValue());
    showModal(
      editing ? "Edit Ship Date" : "Mark Order as Mailed",
      `<form id="shipDateForm"><p class="modal-intro">Enter the date the package was actually handed off or mailed. Today is selected automatically.</p><label>Ship Date<input name="shipDate" type="date" value="${escapeHTML(currentDate)}" max="${localDateInputValue()}" required></label></form>`,
      [
        {label:"Cancel"},
        {label:editing ? "Save Ship Date" : "Mark as Mailed",kind:"primary",onClick:() => saveShipDate(orderId,editing)}
      ]
    );
  }

  function saveShipDate(orderId,editing = false) {
    const order=data.orders.find(o => o.id===orderId);
    const shipDate=String(new FormData(document.getElementById("shipDateForm")).get("shipDate") || "");
    if (!order || !shipDate) return showToast("Choose the actual ship date.");
    if (shipDate > localDateInputValue()) return showToast("Ship Date cannot be in the future.");
    order.shipping ||= {};
    order.shipping.shipDate = shipDate;
    order.shipping.mailedAt ||= new Date().toISOString();
    if (!editing) {
      order.items.forEach(item => { item.status = "Completed"; item.updatedAt = new Date().toISOString(); });
      data.activity.unshift({text:`Mailed order for ${order.customerName} on ${formatShipDate(shipDate)}; order complete`,time:"Just now"});
    } else {
      data.activity.unshift({text:`Updated ship date for ${order.customerName} to ${formatShipDate(shipDate)}`,time:"Just now"});
    }
    touchOrder(order);
    saveData();
    showToast(editing ? "Ship date updated." : "Order marked mailed and completed.");
    renderOrderWorkspace(order);
  }

  function printCareSheet() {
    const careSheet = inventoryItemById("care-sheets");
    const printableFile = careSheet?.printableFile || "printables/caresheet-pt-tp.pdf";
    const defaultQuantity = Math.max(1,Number(careSheet?.defaultPrintQuantity || 10));
    showModal(
      "Print Care Sheets",
      `<p>Open the care sheet first. Inventory will not change until you confirm how many sheets printed successfully.</p><label>Planned quantity<input id="plannedCareSheetQuantity" type="number" min="1" step="1" value="${defaultQuantity}"></label>`,
      [
        {label:"Cancel"},
        {label:"Open Care Sheet for Printing",kind:"primary",keepOpen:true,onClick:() => openCareSheetPrintable(printableFile,defaultQuantity)}
      ]
    );
  }

  function openCareSheetPrintable(printableFile,defaultQuantity) {
    const plannedQuantity = Math.max(1,Math.floor(Number(document.getElementById("plannedCareSheetQuantity")?.value || defaultQuantity)));
    const popup = window.open(printableFile,"_blank");
    if (popup) popup.opener = null;
    if (!popup) return showToast("Please allow pop-ups to print the care sheet.");
    showModal(
      "Confirm Printed Care Sheets",
      `<p>The printable is open in a new tab. Add only the number of sheets that actually printed successfully.</p><label>Quantity successfully printed<input id="printedCareSheetQuantity" type="number" min="1" step="1" value="${plannedQuantity}"></label>`,
      [
        {label:"Not Printed — Close"},
        {label:"Add Printed Sheets",kind:"primary",onClick:() => addPrintedCareSheets(Number(document.getElementById("printedCareSheetQuantity")?.value || plannedQuantity))}
      ]
    );
  }

  function addPrintedCareSheets(quantity) {
    const careSheet = inventoryItemById("care-sheets");
    quantity = Math.floor(Number(quantity || 0));
    if (!careSheet || careSheet.tracking !== "quantity") return showToast("Care sheet inventory is not configured.");
    if (quantity <= 0) return showToast("Enter how many care sheets were printed.");
    careSheet.quantity = Number(careSheet.quantity || 0) + quantity;
    recordInventoryTransaction({
      type:"add",
      itemId:careSheet.id,
      quantity,
      reason:"Printed care sheets",
      details:`Added ${quantity} printed care instruction sheets to inventory.`,
      relatedItemId:careSheet.id,
      source:"print-and-cricut"
    });
    data.activity.unshift({text:`Added ${quantity} printed care sheets to inventory`,time:"Just now"});
    saveData();
    showToast(`${quantity} care sheets added to inventory.`);
    const openOrderId = data.settings.lastOpenedOrderId;
    const order = data.orders.find(order => order.id === openOrderId);
    if (order) renderOrderWorkspace(order,data.settings.lastOpenedItemId);
  }

  function openExternal(key) {
    const url=data.settings.externalLinks[key];
    if (url) window.open(url,"_blank","noopener");
  }

  function waitOnMaterial(orderId,itemId) {
    const order=data.orders.find(o => o.id===orderId);
    const item=order?.items.find(i => i.id===itemId);
    item.status="Waiting on Material"; item.workflow.activeTab="prepare";
    touchOrder(order,item); data.activity.unshift({text:`${item.productName} is waiting on material`,time:"Just now"}); saveData(); renderOrderWorkspace(order,item.id);
  }

  function showModal(title,body,actions) {
    document.getElementById("modalTitle").textContent=title;
    document.getElementById("modalBody").innerHTML=body;
    const actionsEl=document.getElementById("modalActions");
    actionsEl.innerHTML="";
    actions.forEach(action => {
      const button=document.createElement("button");
      button.className=`button ${action.kind || "secondary"}`;
      button.textContent=action.label;
      button.addEventListener("click",() => {
        action.onClick?.();
        if (!action.keepOpen) hideModal();
      });
      actionsEl.appendChild(button);
    });
    document.getElementById("modalBackdrop").classList.remove("hidden");
  }
  function hideModal(){ document.getElementById("modalBackdrop").classList.add("hidden"); }

  function resetItem(orderId,itemId) {
    const order=data.orders.find(o => o.id===orderId);
    const item=order?.items.find(i => i.id===itemId);
    showModal("Reset this item?",`<p>This returns <strong>${escapeHTML(item.productName)}</strong> to New, clears its workflow and notes, and returns any Pack & Ship supplies used by this item to inventory.</p>`,[
      {label:"Keep Progress"},
      {label:"Reset Item",kind:"danger",onClick:() => {
        restoreAllInventoryTasksForItem(order,item);
        const reset=migrateItem({id:item.id,productId:item.productId,productName:item.productName,color:item.color,status:"New"},item.unitNumber-1);
        Object.assign(item,reset); touchOrder(order,item); data.activity.unshift({text:`Reset ${item.productName}`,time:"Just now"}); saveData(); renderOrderWorkspace(order,item.id);
      }}
    ]);
  }

  function resetOrder(orderId) {
    const order=data.orders.find(o => o.id===orderId);
    showModal("Reset the whole order?",`<p>Every item in <strong>${escapeHTML(order.customerName)}'s</strong> order will return to New. All workflow checklists and notes will be cleared.</p>`,[
      {label:"Keep Progress"},
      {label:"Reset Order",kind:"danger",onClick:() => {
        restoreAllInventoryTasksForOrder(order);
        order.items=order.items.map((item,index) => migrateItem({id:item.id,productId:item.productId,productName:item.productName,color:item.color,status:"New"},index));
        order.shipping={careSheetPrinted:false,packingSlipPrinted:false,shippoOpened:false,labelAttached:false,companyStickerAttached:false,mailerSealed:false,productTagChecks:{},inventoryTaskTransactions:{}};
        touchOrder(order); data.activity.unshift({text:`Reset order for ${order.customerName}`,time:"Just now"}); saveData(); renderOrderWorkspace(order);
      }}
    ]);
  }

  function cancelOrder(orderId) {
    const order=data.orders.find(o => o.id===orderId);
    showModal("Cancel this order?",`<p>This removes <strong>${escapeHTML(order.customerName)} · Etsy #${escapeHTML(order.etsyOrderNumber)}</strong> from Orders.</p>`,[
      {label:"Keep Order"},
      {label:"Cancel Order",kind:"danger",onClick:() => { restoreAllInventoryTasksForOrder(order); data.orders=data.orders.filter(o => o.id!==orderId); data.activity.unshift({text:`Cancelled order for ${order.customerName}`,time:"Just now"}); saveData(); showView("workshop"); showToast("Order cancelled."); }}
    ]);
  }

  function formatDate(value) {
    try { return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(value)); } catch (_) { return ""; }
  }

  function downloadBackup() {
    const backup={app:"Simply Ummiby Workshop",version:VERSION,exportedAt:new Date().toISOString(),data};
    const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement("a");
    anchor.href=url; anchor.download=`simply-ummiby-workshop-backup-${new Date().toISOString().slice(0,10)}.json`; anchor.click();
    URL.revokeObjectURL(url); data.activity.unshift({text:"Downloaded a local backup",time:"Just now"}); saveData(); showToast("Backup downloaded.");
  }

  function showToast(message) {
    document.querySelector(".toast")?.remove();
    const toast=document.createElement("div"); toast.className="toast"; toast.textContent=message; document.body.appendChild(toast);
    setTimeout(() => toast.remove(),2500);
  }

  document.addEventListener("click",event => {
    const viewButton=event.target.closest("[data-view]");
    if (viewButton) showView(viewButton.dataset.view);
    const button=event.target.closest("[data-action]");
    if (!button) return;
    const {action,orderId,itemId,filter,tab,link}=button.dataset;
    if (action==="new-order") showNewOrder();
    if (action==="products-subview") renderProductsModule(button.dataset.subview);
    if (action==="open-product-master") openProductMaster(button.dataset.productId);
    if (action==="edit-product-master") showProductMasterEditor(button.dataset.productId);
    if (action==="add-product-master") showProductMasterEditor();
    if (action==="add-product-category") showProductCategoryEditor();
    if (action==="edit-product-category") showProductCategoryEditor(button.dataset.categoryId);
    if (action==="add-color") showColorEditor();
    if (action==="edit-color") showColorEditor(button.dataset.colorId);
    if (action==="manage-colors") { hideModal(); renderProductsModule("colors"); }
    if (action==="inventory-category") { inventoryViewState={category:button.dataset.category,search:"",craft:"All",materialType:"All",itemType:"All",supplier:"All",stock:"All",lifecycle:"Active",sort:"name-asc",group:"none"}; renderInventoryCatalog(button.dataset.category); }
    if (action==="adjust-inventory") adjustInventory(button.dataset.itemId,button.dataset.delta);
    if (action==="edit-inventory-item") showInventoryItemEditor(button.dataset.itemId);
    if (action==="archive-inventory-item") confirmArchiveInventoryItem(button.dataset.itemId);
    if (action==="restore-inventory-item") setInventoryItemArchived(button.dataset.itemId,false);
    if (action==="delete-inventory-item") confirmDeleteInventoryItem(button.dataset.itemId);
    if (action==="add-inventory-item") showNewInventoryItemChooser();
    if (action==="choose-inventory-type") { const draft=window.__inventoryTypeChoices?.[button.dataset.choice]||{}; hideModal(); showInventoryItemEditor(null,draft); }
    if (action==="receive-stock") showReceiveStock();
    if (action==="adjust-stock-picker") showAdjustStockPicker();
    if (action==="print-inventory-list") printInventoryList();
    if (action==="inventory-low-stock") { inventoryViewState={category:"restock",search:"",craft:"All",materialType:"All",itemType:"All",supplier:"All",stock:"All",lifecycle:"Active",sort:"stock-asc",group:"none"}; renderInventoryCatalog("restock"); }
    if (action==="inventory-count-review") { const items=activeInventoryItems().filter(inventoryNeedsCount).sort((a,b)=>String(a.name||"").localeCompare(String(b.name||""))); showModal("Inventory Check Needed",`<p>Update each quantity as you count it. Saving the item records the count as verified.</p><div class="inventory-count-review-list">${items.length?items.map(item=>`<button class="inventory-count-review-row" data-action="edit-inventory-item" data-item-id="${item.id}"><span><strong>${escapeHTML(item.name)}</strong><small>${Number(item.quantity||0)} currently recorded · ${escapeHTML(inventoryPageMeta(item.category).title)}</small></span><span>Edit Count →</span></button>`).join(""):"<p>All quantity-tracked items have been counted.</p>"}</div>`,[{label:"Close"}]); }
    if (action==="add-supplier") showSupplierEditor();
    if (action==="add-supplier-from-inventory") { const draft=collectInventoryItemDraft(); if(draft) showSupplierEditor(null,{returnToInventory:{itemId:button.dataset.itemId||null,draft}}); }
    if (action==="edit-supplier") showSupplierEditor(button.dataset.supplierId);
    if (action==="open-inventory-link") openInventoryLink(button.dataset.itemId);
    if (action==="kit-transaction") showKitTransaction(button.dataset.itemId,button.dataset.mode);
    if (action==="prepare-component") showPrepareComponent(button.dataset.itemId);
    if (action==="stock-adjustment") showStockAdjustment(button.dataset.itemId);
    if (action==="record-yarn-use") showRecordYarnUse(button.dataset.itemId);
    if (action==="clear-inventory-filters") { inventoryViewState.search="";inventoryViewState.craft="All";inventoryViewState.materialType="All";inventoryViewState.itemType="All";inventoryViewState.supplier="All";inventoryViewState.stock="All";inventoryViewState.lifecycle="Active";inventoryViewState.sort="name-asc";inventoryViewState.group="none";renderInventoryCatalog(inventoryViewState.category); }
    if (action==="open-recipe") openRecipe(button.dataset.recipeId);
    if (action==="add-recipe") showRecipeEditor();
    if (action==="edit-recipe") showRecipeEditor(button.dataset.recipeId);
    if (action==="recipe-focus") renderRecipeFocus(button.dataset.recipeId);
    if (action==="print-recipe") printRecipe(button.dataset.recipeId);
    if (action==="open-item-recipe") openRecipe(button.dataset.recipeId,orderId,itemId);
    if (action==="return-to-order") openOrder(orderId,itemId);
    if (action==="complete-working-recipe") completeWorkingRecipe(orderId,itemId);
    if (action==="open-order") openOrder(orderId,itemId);
    if (action==="resume-focus") { const focus=findFocus(); focus ? openOrder(focus.order.id,focus.item.id) : showNewOrder(); }
    if (action==="filter-workshop") { currentWorkshopFilter=filter; renderWorkshopFilters(); renderWorkshopOrders(); }
    if (action==="orders-summary-filter") { if(filter==="ship-week"){orderShipFilter="Week";currentWorkshopFilter="Active";}else{currentWorkshopFilter=filter;orderShipFilter="All";} renderWorkshopFilters(); renderWorkshopOrders(); }
    if (action==="edit-order") showNewOrder(orderId);
    if (action==="toggle-item") {
      const card=document.querySelector(`[data-item-card="${itemId}"]`);
      card?.classList.toggle("expanded");
      data.settings.lastOpenedOrderId=orderId; data.settings.lastOpenedItemId=itemId; saveData();
      button.textContent=card?.classList.contains("expanded") ? "Close" : "Open Processing";
    }
    if (action==="process-tab") setProcessTab(orderId,itemId,tab);
    if (action==="complete-prepare") completePrepare(orderId,itemId);
    if (action==="complete-manufacture") completeManufacture(orderId,itemId);
    if (action==="complete-pack") completePack(orderId,itemId);
    if (action==="wait-material") waitOnMaterial(orderId,itemId);
    if (action==="ready-mail") markReadyMail(orderId);
    if (action==="mark-mailed") showShipDateModal(orderId);
    if (action==="edit-ship-date") showShipDateModal(orderId,true);
    if (action==="use-prepared-dowel") { const order=data.orders.find(o=>o.id===orderId),item=order?.items.find(i=>i.id===itemId); if(order&&item&&assignPreparedDowelFromStock(order,item)) renderOrderWorkspace(order,item.id); }
    if (action==="prepare-order-dowel") { const order=data.orders.find(o=>o.id===orderId),item=order?.items.find(i=>i.id===itemId); if(order&&item&&prepareDowelForOrder(order,item)) renderOrderWorkspace(order,item.id); }
    if (action==="return-prepared-dowel") { const order=data.orders.find(o=>o.id===orderId),item=order?.items.find(i=>i.id===itemId); if(order&&item){returnPreparedDowel(order,item);touchOrder(order,item);saveData();renderOrderWorkspace(order,item.id);showToast("Dowel assignment returned to inventory.");} }
    if (action==="print-care-sheet") printCareSheet();
    if (action==="external-link") openExternal(link);
    if (action==="restock-status-all") updateMaterialStatusAcrossOrders(button.dataset.materialId,button.dataset.status);
    if (action==="reset-item") resetItem(orderId,itemId);
    if (action==="reset-order") resetOrder(orderId);
    if (action==="cancel-order") cancelOrder(orderId);
  });

  document.addEventListener("input",event => {
    const el=event.target;
    if(el.dataset.action==="order-search"){orderSearch=el.value;renderWorkshopOrders();}
  });

  document.addEventListener("change",event => {
    const el=event.target;
    const {action,orderId,itemId,index,key}=el.dataset;
    if (action==="order-filter") { if(el.dataset.filter==="status")currentWorkshopFilter=el.value; if(el.dataset.filter==="stage")orderStageFilter=el.value; if(el.dataset.filter==="ship")orderShipFilter=el.value; renderWorkshopOrders(); return; }
    if (action==="order-sort") { orderSort=el.value; renderWorkshopOrders(); return; }
    if (action==="order-search") { orderSearch=el.value; renderWorkshopOrders(); return; }
    if (action==="product-catalog-filter") { if(el.dataset.filter==="category")productCatalogCategoryFilter=el.value;else productCatalogCraftFilter=el.value;renderProductsModule("catalog");return; }
    if (action==="product-catalog-sort") { productCatalogSort=el.value;renderProductsModule("catalog");return; }
    if (action==="color-family-filter") { colorFamilyFilter=el.value;renderProductsModule("colors");return; }
    if (action==="inventory-filter") { inventoryViewState[el.dataset.filter]=el.value;renderInventoryCatalog(inventoryViewState.category);return; }
    if (action==="inventory-sort") { inventoryViewState.sort=el.value;renderInventoryCatalog(inventoryViewState.category);return; }
    if (action==="inventory-group") { inventoryViewState.group=el.value;renderInventoryCatalog(inventoryViewState.category);return; }
    if (action==="inventory-condition") updateInventoryCondition(el.dataset.itemId,el.value);
    if (action==="fulfillment") selectFulfillment(orderId,itemId,el.value);
    if (action==="material-status") updateMaterialStatus(orderId,itemId,el.dataset.materialId,el.value);
    if (action==="manufacturing-check") updateManufacturingCheck(orderId,itemId,key,el.checked);
    if (action==="packing-check") updatePackingCheck(orderId,itemId,index,el.checked);
    if (action==="shipping-check") updateShippingCheck(orderId,key,el.checked);
    if (action==="product-tag-check") updateProductTagCheck(orderId,el.dataset.taskKey,el.checked);
    if (action==="working-stage-check") {
      const order = data.orders.find(order => order.id === orderId);
      const item = order?.items.find(item => item.id === itemId);
      if (item) {
        item.recipeStageChecks ||= {};
        item.recipeStageChecks[el.dataset.stageId] = el.checked;
        item.status = "Manufacturing";
        item.workflow.activeTab = "manufacture";
        touchOrder(order,item);
        saveData();
        renderOrderWorkspace(order,item.id);
      }
    }
    if (action==="recipe-stage-check") { const order=data.orders.find(o=>o.id===orderId); const item=order?.items.find(i=>i.id===itemId); if(item){ item.recipeStageChecks ||= {}; item.recipeStageChecks[el.dataset.stageId]=el.checked; touchOrder(order,item); saveData(); openRecipe(item.productId,orderId,itemId); } }
  });

  document.addEventListener("input",event => {
    const target=event.target; if(target.dataset.action==="inventory-search"){inventoryViewState.search=target.value;renderInventoryCatalog(inventoryViewState.category);return;}
    const el=event.target;
    if (el.dataset.action==="item-notes") {
      const order=data.orders.find(o => o.id===el.dataset.orderId);
      const item=order?.items.find(i => i.id===el.dataset.itemId);
      if (item) { item.notes=el.value; touchOrder(order,item); saveData(); }
    }
  });

  document.addEventListener("input",event => {
    if (event.target.id === "recipeSearchInput") { recipeSearch=event.target.value; renderRecipeLibrary(); const input=document.getElementById("recipeSearchInput"); input?.focus(); input?.setSelectionRange(recipeSearch.length,recipeSearch.length); }
  });
  document.addEventListener("change",event => {
    if (event.target.id === "recipeCategoryFilter") { recipeCategoryFilter=event.target.value; renderRecipeLibrary(); }
    if (event.target.id === "recipeCraftFilter") { recipeCraftFilter=event.target.value; renderRecipeLibrary(); }
    if (event.target.id === "recipeStatusFilter") { recipeStatusFilter=event.target.value; renderRecipeLibrary(); }
    if (event.target.id === "recipeSort") { recipeSort=event.target.value; renderRecipeLibrary(); }
  });

  document.getElementById("backupButton").addEventListener("click",downloadBackup);
  document.getElementById("menuButton").addEventListener("click",() => sidebar.classList.toggle("open"));
  document.getElementById("modalClose").addEventListener("click",hideModal);
  document.getElementById("modalBackdrop").addEventListener("click",event => { if (event.target.id==="modalBackdrop") hideModal(); });

  showView("dashboard");
})();