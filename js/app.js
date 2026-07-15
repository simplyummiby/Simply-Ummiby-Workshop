(() => {
  const STORAGE_KEY = "simplyUmmibyWorkshopData";
  const VERSION = "0.6.3.4";
  const ITEM_STATUSES = ["New","Preparing","Manufacturing","Waiting on Material","Ready for Packing","Packed","Ready to Mail","Completed"];
  const STATUS_PROGRESS = {
    "New": 5, "Preparing": 20, "Manufacturing": 50, "Waiting on Material": 35,
    "Ready for Packing": 70, "Packed": 85, "Ready to Mail": 95, "Completed": 100
  };
  const data = loadData();
  syncInventoryProductLinks();
  saveData();
  const viewContainer = document.getElementById("viewContainer");
  const pageTitle = document.getElementById("pageTitle");
  const sidebar = document.getElementById("sidebar");
  let currentWorkshopFilter = "Active";
  let editingOrderId = null;
  let inventoryViewState = {
    category: "overview", search: "", craft: "All", materialType: "All",
    stock: "All", sort: "name-asc", group: "none"
  };

  const viewContent = {
    batch: { title: "Batch Production", copy: "Prepare fabrication kits, make finished inventory, and replenish printed or Cricut-made supplies.", card: "Batch-production workflows arrive after the first inventory release." },
    inventory: { title: "Inventory", copy: "Track raw materials, fabrication kits, finished products, poly mailers, tags, care sheets, labels, and stickers.", card: "Purchase to Restock is now working. Full counted inventory and deductions arrive in Version 0.5." },
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
    initial.inventoryTransactions ||= [];
    initial.productMasters = migrateProductMasters(initial.productMasters);
    initial.products = initial.productMasters.map(master => ({
      id: master.id,
      name: master.name,
      colors: master.colors || []
    }));

    initial.orders = initial.orders.map(order => ({
      id: order.id || uid("order"),
      customerName: order.customerName || "Unnamed Customer",
      etsyOrderNumber: order.etsyOrderNumber || "",
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
      merged.components = saved?.components || defaultItem.components || [];
      return merged;
    });

    savedItems.forEach(item => {
      if (!defaults.items.some(existing => existing.id === item.id)) defaults.items.push(item);
    });

    return defaults;
  }

  function inventoryItems() {
    return data.inventoryCatalog?.items || [];
  }

  function inventoryCategories() {
    return data.inventoryCatalog?.categories || [];
  }

  function inventoryItemById(id) {
    return inventoryItems().find(item => item.id === id);
  }

  function inventoryStatus(item) {
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

  function categoryTotal(categoryId) {
    return inventoryItems()
      .filter(item => item.category === categoryId)
      .reduce((sum,item) => sum + (item.tracking === "quantity" ? Number(item.quantity || 0) : 0), 0);
  }


  function productNameById(productId) {
    return data.products.find(product => product.id === productId)?.name || productId;
  }

  function kitItems() {
    return inventoryItems().filter(item => item.category === "fabrication-kits");
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
    if (!kit || kit.category !== "fabrication-kits") return;
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
        reason:"Moved into fabrication kit",
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
    renderInventoryCatalog("fabrication-kits");
    showToast(`${count} kit${count === 1 ? "" : "s"} built.`);
  }

  function breakKit(kitId, count = 1) {
    const kit = inventoryItemById(kitId);
    count = Math.max(1,Number(count || 1));
    if (!kit || kit.category !== "fabrication-kits") return;
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
    renderInventoryCatalog("fabrication-kits");
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
      mode === "build" ? "Build Fabrication Kits" : "Break Apart Fabrication Kits",
      `<div class="kit-transaction-form">
        <p><strong>${escapeHTML(kit.name)}</strong></p>
        <label>Number of kits<input id="kitTransactionCount" type="number" min="1" value="1"></label>
        <div class="kit-component-list">${components}</div>
        ${mode === "break" ? `<p class="modal-note">Breaking a kit returns every listed component to loose inventory.</p>` : `<p class="modal-note">Building a kit moves these components out of loose inventory. They are not counted twice.</p>`}
      </div>`,
      [
        {label:"Cancel"},
        {label:mode === "build" ? "Build Kits" : "Break Apart",kind:"primary",onClick:() => {
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
      materials: saved.find(item => item.id === master.id)?.materials || master.materials || [],
      kitDefinition: saved.find(item => item.id === master.id)?.kitDefinition || master.kitDefinition || {contents:[],separateMaterials:[]}
    }));
    saved.forEach(master => {
      if (!merged.some(item => item.id === master.id)) merged.push(master);
    });
    return merged;
  }

  function productMasters() {
    return data.productMasters || [];
  }

  function productMasterById(id) {
    return productMasters().find(master => master.id === id);
  }

  function productsUsingInventoryItem(itemId) {
    return productMasters().filter(master =>
      (master.materials || []).some(row => row.inventoryItemId === itemId) ||
      (master.kitDefinition?.contents || []).some(row => row.inventoryItemId === itemId) ||
      (master.kitDefinition?.separateMaterials || []).some(row => row.inventoryItemId === itemId) ||
      Object.values(master.packaging || {}).includes(itemId)
    );
  }

  function syncInventoryProductLinks() {
    inventoryItems().forEach(item => {
      item.linkedProductIds = productsUsingInventoryItem(item.id).map(master => master.id);
    });
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
    if (view === "products") return renderProductMasterLibrary();

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


  function renderInventoryCatalog(activeCategory = inventoryViewState.category || "overview") {
    inventoryViewState.category = activeCategory;
    pageTitle.textContent = "Inventory";
    setActiveNav("inventory");
    const attentionItems = inventoryItems().filter(inventoryNeedsAttention);
    const orderNeeds = getRestockGroups();
    viewContainer.innerHTML = `
      <section class="page-section wide">
        <section class="inventory-hero">
          <div><p class="eyebrow">Your workshop stockroom</p><h3>Inventory Catalog</h3><p>Browse the details that matter: what each item is, what craft it belongs to, and whether it is ready, low, or out.</p></div>
          <button class="button primary" data-action="add-inventory-item">+ Add Inventory Item</button>
        </section>
        <section class="inventory-tabs">
          <button class="${activeCategory === "overview" ? "active" : ""}" data-action="inventory-category" data-category="overview">Overview</button>
          ${inventoryCategories().map(category => `<button class="${activeCategory === category.id ? "active" : ""}" data-action="inventory-category" data-category="${category.id}">${escapeHTML(category.name)}</button>`).join("")}
          <button class="${activeCategory === "restock" ? "active" : ""}" data-action="inventory-category" data-category="restock">Restock Center</button>
        </section>
        <div id="inventoryContent">${activeCategory === "overview" ? renderInventoryOverview(attentionItems,orderNeeds) : activeCategory === "restock" ? renderCombinedRestockCenter(attentionItems,orderNeeds) : renderInventoryCategory(activeCategory)}</div>
      </section>`;
  }

  function renderInventoryOverview(attentionItems, orderNeeds) {
    return `
      <section class="inventory-dashboard-grid">
        <article class="panel"><div class="panel-heading"><div><p class="eyebrow">Needs attention</p><h3>Low or Empty Stock</h3></div></div><div class="inventory-alert-stack">${attentionItems.length ? attentionItems.slice(0,10).map(item => renderInventoryAlert(item)).join("") : "<p>Nothing is currently low or out.</p>"}</div></article>
        <article class="panel"><div class="panel-heading"><div><p class="eyebrow">Active orders</p><h3>Order Material Needs</h3></div></div><div class="inventory-alert-stack">${orderNeeds.length ? orderNeeds.map(group => `<div class="inventory-alert-row"><div><strong>${escapeHTML(group.name)}</strong><span>${group.items.length} active item${group.items.length===1?"":"s"} · ${escapeHTML(groupPrimaryStatus(group))}</span></div><button class="text-button" data-action="inventory-category" data-category="restock">Review</button></div>`).join("") : "<p>No active orders are waiting on materials.</p>"}</div></article>
      </section>
      <section class="panel inventory-recent-section"><div class="panel-heading"><div><p class="eyebrow">Browse stock</p><h3>Inventory Categories</h3></div></div><div class="inventory-category-launcher">${inventoryCategories().map(category => { const items=inventoryItems().filter(item=>item.category===category.id); const low=items.filter(inventoryNeedsAttention).length; return `<button data-action="inventory-category" data-category="${category.id}"><strong>${escapeHTML(category.name)}</strong><span>${items.length} catalog item${items.length===1?"":"s"}</span><small>${low?`${low} need attention`:"All clear"}</small></button>`; }).join("")}</div></section>`;
  }

  function inventoryFilterValues(categoryId) {
    const items=inventoryItems().filter(item=>item.category===categoryId);
    return {crafts:[...new Set(items.map(item=>item.craft||"Shared"))].sort(), materialTypes:[...new Set(items.map(item=>item.materialType||"Other"))].sort()};
  }
  function statusRank(status){ return status==="Out"?0:status==="Low"?1:2; }
  function filteredInventoryItems(categoryId){
    let items=inventoryItems().filter(item=>item.category===categoryId);
    const q=inventoryViewState.search.trim().toLowerCase();
    if(q) items=items.filter(item=>[item.name,item.materialType,item.craft,item.color,item.notes,item.supplier].filter(Boolean).some(v=>String(v).toLowerCase().includes(q)));
    if(inventoryViewState.craft!=="All") items=items.filter(item=>(item.craft||"Shared")===inventoryViewState.craft);
    if(inventoryViewState.materialType!=="All") items=items.filter(item=>(item.materialType||"Other")===inventoryViewState.materialType);
    if(inventoryViewState.stock!=="All") items=items.filter(item=>inventoryStatus(item)===inventoryViewState.stock);
    const [field,dir]=inventoryViewState.sort.split("-");
    items.sort((a,b)=>{let av,bv;if(field==="quantity"){av=a.tracking==="quantity"?Number(a.quantity||0):statusRank(inventoryStatus(a));bv=b.tracking==="quantity"?Number(b.quantity||0):statusRank(inventoryStatus(b));}else if(field==="stock"){av=statusRank(inventoryStatus(a));bv=statusRank(inventoryStatus(b));}else if(field==="product"){av=a.productId||a.name;bv=b.productId||b.name;}else{av=String(a.name||"").toLowerCase();bv=String(b.name||"").toLowerCase();}if(typeof av==="number"&&typeof bv==="number")return dir==="desc"?bv-av:av-bv;return dir==="desc"?String(bv).localeCompare(String(av)):String(av).localeCompare(String(bv));});
    return items;
  }
  function renderInventoryControls(categoryId,options={}){const values=inventoryFilterValues(categoryId);return `<section class="inventory-controls panel"><div class="inventory-control-grid"><label class="inventory-search">Search<input type="search" value="${escapeHTML(inventoryViewState.search)}" data-action="inventory-search" placeholder="Search this category..."></label><label>Craft<select data-action="inventory-filter" data-filter="craft"><option value="All">All crafts</option>${values.crafts.map(v=>`<option value="${escapeHTML(v)}" ${inventoryViewState.craft===v?"selected":""}>${escapeHTML(v)}</option>`).join("")}</select></label><label>Type<select data-action="inventory-filter" data-filter="materialType"><option value="All">All types</option>${values.materialTypes.map(v=>`<option value="${escapeHTML(v)}" ${inventoryViewState.materialType===v?"selected":""}>${escapeHTML(v)}</option>`).join("")}</select></label><label>Stock<select data-action="inventory-filter" data-filter="stock">${["All","Good","Low","Out"].map(v=>`<option value="${v}" ${inventoryViewState.stock===v?"selected":""}>${v==="All"?"All stock levels":v}</option>`).join("")}</select></label><label>Sort<select data-action="inventory-sort"><option value="name-asc" ${inventoryViewState.sort==="name-asc"?"selected":""}>A–Z</option><option value="name-desc" ${inventoryViewState.sort==="name-desc"?"selected":""}>Z–A</option><option value="quantity-asc" ${inventoryViewState.sort==="quantity-asc"?"selected":""}>Lowest quantity</option><option value="quantity-desc" ${inventoryViewState.sort==="quantity-desc"?"selected":""}>Highest quantity</option><option value="stock-asc" ${inventoryViewState.sort==="stock-asc"?"selected":""}>Urgent stock first</option><option value="product-asc" ${inventoryViewState.sort==="product-asc"?"selected":""}>Product order</option></select></label>${options.allowGroup?`<label>Group<select data-action="inventory-group"><option value="none" ${inventoryViewState.group==="none"?"selected":""}>No grouping</option><option value="product" ${inventoryViewState.group==="product"?"selected":""}>Group by product</option><option value="color" ${inventoryViewState.group==="color"?"selected":""}>Group by color</option><option value="stock" ${inventoryViewState.group==="stock"?"selected":""}>Group by stock</option></select></label>`:""}<button class="button secondary inventory-clear-button" data-action="clear-inventory-filters">Clear Filters</button></div></section>`;}

  function renderInventoryCategory(categoryId){const category=inventoryCategories().find(c=>c.id===categoryId);const items=filteredInventoryItems(categoryId);const cards=["fabrication-kits","finished-inventory"].includes(categoryId);return `<section class="inventory-category-heading"><div><p class="eyebrow">Inventory category</p><h3>${escapeHTML(category?.name||"Inventory")}</h3><p>${escapeHTML(category?.description||"")}</p></div></section>${renderInventoryControls(categoryId,{allowGroup:cards})}${cards?renderGroupedInventoryCards(items):renderInventoryTable(items)}`;}
  function renderInventoryTable(items){return `<section class="inventory-table-card"><div class="inventory-data-table inventory-data-table-head"><span>Item</span><span>Type</span><span>Products</span><span>Loose</span><span>In Kits</span><span>Total Owned</span><span>Stock</span><span>Actions</span></div>${items.length?items.map(item=>`<article class="inventory-data-table inventory-data-table-v053"><div class="inventory-name-cell">${renderInventoryThumb(item)}<div><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(item.supplier||item.notes||"")}</small></div></div><span>${escapeHTML(item.materialType||"Other")}<small class="table-secondary">${escapeHTML(item.craft||"Shared")}</small></span><span>${(item.linkedProductIds||[]).length?(item.linkedProductIds||[]).map(id=>`<span class="product-link-pill">${escapeHTML(productNameById(id))}</span>`).join(""):"—"}</span><span>${item.tracking==="quantity"?Number(item.quantity||0):escapeHTML(item.condition||"Not set")}</span><span>${item.tracking==="quantity"?allocatedInKits(item.id):"—"}</span><span>${item.tracking==="quantity"?totalOwned(item):"—"}</span><span><span class="inventory-stock-badge ${inventoryStatus(item).toLowerCase()}">${escapeHTML(inventoryStatus(item))}</span></span><div class="inventory-row-actions">${item.tracking==="quantity"?`<button data-action="adjust-inventory" data-item-id="${item.id}" data-delta="-1">−</button><button data-action="adjust-inventory" data-item-id="${item.id}" data-delta="1">+</button><button class="text-button" data-action="stock-adjustment" data-item-id="${item.id}">Adjust</button>`:""}<button class="text-button" data-action="edit-inventory-item" data-item-id="${item.id}">Edit</button></div></article>`).join(""):`<div class="inventory-empty-filter">No inventory items match these filters.</div>`}</section>`;}
  function renderGroupedInventoryCards(items){if(!items.length)return `<div class="inventory-empty-filter">No inventory items match these filters.</div>`;if(inventoryViewState.group==="none")return `<div class="inventory-catalog-grid">${items.map(renderInventoryCard).join("")}</div>`;const groups=new Map();items.forEach(item=>{const key=inventoryViewState.group==="product"?productDisplayName(item.productId):inventoryViewState.group==="color"?(item.color||"No color"):inventoryStatus(item);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);});return [...groups.entries()].map(([label,groupItems])=>`<section class="inventory-card-group"><div class="inventory-card-group-heading"><h4>${escapeHTML(label)}</h4><span>${groupItems.length} item${groupItems.length===1?"":"s"}</span></div><div class="inventory-catalog-grid">${groupItems.map(renderInventoryCard).join("")}</div></section>`).join("");}
  function productDisplayName(productId){return data.products.find(p=>p.id===productId)?.name||"Other";}
  function renderInventoryThumb(item){if(item.imageData)return `<img class="inventory-thumb" src="${item.imageData}" alt="">`;const initials=(item.name||"I").split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase();return `<span class="inventory-thumb inventory-thumb-placeholder">${escapeHTML(initials)}</span>`;}
  function renderInventoryCard(item){const status=inventoryStatus(item);return `<article class="inventory-item-card"><div class="inventory-card-image">${renderInventoryThumb(item)}</div><div class="inventory-item-top"><div><p class="eyebrow">${escapeHTML(item.restockType==="purchase"?"Purchase to restock":item.restockType==="make"?"Make to restock":"Print to restock")}</p><h4>${escapeHTML(item.name)}</h4><small>${escapeHTML(item.craft||"Shared")} · ${escapeHTML(item.materialType||"Other")}</small></div><span class="inventory-stock-badge ${status.toLowerCase()}">${escapeHTML(status)}</span></div>${item.tracking==="quantity"?`<div class="inventory-quantity"><button data-action="adjust-inventory" data-item-id="${item.id}" data-delta="-1">−</button><strong>${Number(item.quantity||0)}</strong><button data-action="adjust-inventory" data-item-id="${item.id}" data-delta="1">+</button></div><div class="inventory-thresholds"><span>Reorder at <strong>${Number(item.reorderAt||0)}</strong></span><span>Preferred <strong>${Number(item.preferredStock||0)}</strong></span></div>`:`<label class="inventory-condition-label">Stock condition<select data-action="inventory-condition" data-item-id="${item.id}">${["Available","Getting Low","Replace Soon","Out"].map(v=>`<option value="${v}" ${item.condition===v?"selected":""}>${v}</option>`).join("")}</select></label>`}${item.contents?.length?`<div class="kit-contents"><strong>Contains</strong><ul>${item.contents.map(c=>`<li>${escapeHTML(c)}</li>`).join("")}</ul></div>`:""}${item.category==="fabrication-kits"&&item.components?.length?`<div class="kit-allocation-note"><strong>Component allocation</strong><span>${(item.components||[]).map(component=>{const raw=inventoryItemById(component.itemId);return `${component.quantity} ${raw?.name||component.itemId}`;}).join(" · ")}</span></div>`:""}<div class="inventory-card-actions">${item.category==="fabrication-kits"?`<button class="button primary small" data-action="kit-transaction" data-mode="build" data-item-id="${item.id}">Build Kits</button><button class="button secondary small" data-action="kit-transaction" data-mode="break" data-item-id="${item.id}">Break Apart</button>`:""}<button class="button secondary small" data-action="edit-inventory-item" data-item-id="${item.id}">Edit Details</button>${item.purchaseUrl?`<button class="button secondary small" data-action="open-inventory-link" data-item-id="${item.id}">Open Supplier</button>`:""}</div></article>`;}
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

  function showInventoryItemEditor(itemId = null) {
    const item=itemId?inventoryItemById(itemId):null;
    const categoryOptions=inventoryCategories().map(category=>`<option value="${category.id}" ${item?.category===category.id?"selected":""}>${escapeHTML(category.name)}</option>`).join("");
    const isCondition=item?.tracking==="condition";
    showModal(item?"Edit Inventory Item":"Add Inventory Item",`<form id="inventoryItemForm" class="inventory-editor-form"><label>Name<input name="name" value="${escapeHTML(item?.name||"")}" required></label><label>Category<select name="category">${categoryOptions}</select></label><label>Material / Item Type<input name="materialType" value="${escapeHTML(item?.materialType||"")}" placeholder="Wood, Cord/Yarn, Hardware..."></label><label>Craft<select name="craft">${["Macramé","Crochet","Shared","Other"].map(v=>`<option value="${v}" ${item?.craft===v?"selected":""}>${v}</option>`).join("")}</select></label><div class="full-width derived-product-note"><strong>Used by Products</strong><p>Calculated automatically from Product Master material and packaging connections.</p></div><label>Tracking<select name="tracking"><option value="quantity" ${!isCondition?"selected":""}>Quantity</option><option value="condition" ${isCondition?"selected":""}>Condition</option></select></label><label>Restock Type<select name="restockType"><option value="purchase" ${item?.restockType==="purchase"?"selected":""}>Purchase</option><option value="make" ${item?.restockType==="make"?"selected":""}>Make</option><option value="print" ${item?.restockType==="print"?"selected":""}>Print</option></select></label><label>Quantity<input name="quantity" type="number" min="0" value="${Number(item?.quantity||0)}"></label><label>Reorder At<input name="reorderAt" type="number" min="0" value="${Number(item?.reorderAt||0)}"></label><label>Preferred Stock<input name="preferredStock" type="number" min="0" value="${Number(item?.preferredStock||0)}"></label><label>Default Print Quantity<input name="defaultPrintQuantity" type="number" min="1" value="${Number(item?.defaultPrintQuantity||10)}"></label><label>Printable File<input name="printableFile" value="${escapeHTML(item?.printableFile||"")}" placeholder="printables/example.pdf"></label><label>Condition<select name="condition">${["Available","Getting Low","Replace Soon","Out"].map(v=>`<option value="${v}" ${item?.condition===v?"selected":""}>${v}</option>`).join("")}</select></label><label>Supplier<input name="supplier" value="${escapeHTML(item?.supplier||"")}"></label><label>Supplier / Resource URL<input name="purchaseUrl" value="${escapeHTML(item?.purchaseUrl||item?.resourceUrl||"")}" placeholder="https://..."></label><label class="full-width">Item Photo<input id="inventoryImageInput" type="file" accept="image/*"></label><div class="full-width inventory-image-preview" id="inventoryImagePreview">${item?.imageData?`<img src="${item.imageData}" alt="">`:`<span>No photo added</span>`}</div><label class="full-width">Notes<textarea name="notes" rows="3">${escapeHTML(item?.notes||"")}</textarea></label></form>`,[{label:"Cancel"},{label:item?"Save Changes":"Add Item",kind:"primary",onClick:()=>saveInventoryItem(itemId)}]);
    const input=document.getElementById("inventoryImageInput"); if(input) input.addEventListener("change",async()=>{const file=input.files?.[0];if(!file)return;const compressed=await compressInventoryImage(file);input.dataset.imageData=compressed;document.getElementById("inventoryImagePreview").innerHTML=`<img src="${compressed}" alt="">`;});
  }
  function compressInventoryImage(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>{const image=new Image();image.onerror=reject;image.onload=()=>{const max=480,scale=Math.min(1,max/Math.max(image.width,image.height)),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/jpeg",.72));};image.src=reader.result;};reader.readAsDataURL(file);});}


  function inventoryItemReferences(itemId) {
    const products = productsUsingInventoryItem(itemId);
    const kits = inventoryItems().filter(item => (item.components || []).some(component => component.itemId === itemId));
    return {products,kits};
  }

  function confirmDeleteInventoryItem(itemId) {
    const item = inventoryItemById(itemId);
    if (!item) return;
    const refs = inventoryItemReferences(itemId);
    const blocked = refs.products.length || refs.kits.length;
    if (blocked) {
      return showModal(
        "This item is still in use",
        `<p><strong>${escapeHTML(item.name)}</strong> cannot be deleted until its connections are removed.</p>
        ${refs.products.length ? `<p>Used by products: ${refs.products.map(product => escapeHTML(product.name)).join(", ")}</p>` : ""}
        ${refs.kits.length ? `<p>Used in kit definitions: ${refs.kits.map(kit => escapeHTML(kit.name)).join(", ")}</p>` : ""}`,
        [{label:"Close"}]
      );
    }
    showModal(
      "Delete inventory item?",
      `<p>This permanently removes <strong>${escapeHTML(item.name)}</strong> from the catalog. Existing transaction history remains.</p>`,
      [
        {label:"Keep Item"},
        {label:"Delete Item",kind:"danger",onClick:() => deleteInventoryItem(itemId)}
      ]
    );
  }

  function deleteInventoryItem(itemId) {
    const item = inventoryItemById(itemId);
    if (!item) return;
    data.inventoryCatalog.items = data.inventoryCatalog.items.filter(entry => entry.id !== itemId);
    data.activity.unshift({text:`Deleted inventory item: ${item.name}`,time:"Just now"});
    saveData();
    renderInventoryCatalog(inventoryViewState.category || "overview");
    showToast("Inventory item deleted.");
  }

  function saveInventoryItem(itemId) {
    const form = document.getElementById("inventoryItemForm");
    if (!form) return;
    const formData = new FormData(form);
    const tracking = formData.get("tracking");
    const existing = itemId ? inventoryItemById(itemId) : null;
    const updated = {
      ...(existing || {}),
      id: existing?.id || uid("inventory"),
      name: formData.get("name").trim(),
      category: formData.get("category"),
      materialType: formData.get("materialType").trim() || "Other",
      craft: formData.get("craft"),
      tracking,
      restockType: formData.get("restockType"),
      quantity: Math.max(0, Number(formData.get("quantity") || 0)),
      reorderAt: Math.max(0, Number(formData.get("reorderAt") || 0)),
      preferredStock: Math.max(0, Number(formData.get("preferredStock") || 0)),
      defaultPrintQuantity: Math.max(1, Number(formData.get("defaultPrintQuantity") || existing?.defaultPrintQuantity || 10)),
      printableFile: formData.get("printableFile").trim(),
      condition: formData.get("condition"),
      supplier: formData.get("supplier").trim(),
      purchaseUrl: formData.get("purchaseUrl").trim(),
      notes: formData.get("notes").trim(),
      imageData: document.getElementById("inventoryImageInput")?.dataset.imageData || existing?.imageData || ""
    };
    if (existing) Object.assign(existing,updated);
    else data.inventoryCatalog.items.push(updated);
    syncInventoryProductLinks();
    data.activity.unshift({text:`${existing ? "Updated" : "Added"} inventory item: ${updated.name}`,time:"Just now"});
    saveData();
    renderInventoryCatalog(inventoryViewState.category || "overview");
  }

  function openInventoryLink(itemId) {
    const item = inventoryItemById(itemId);
    const url = item?.purchaseUrl || item?.resourceUrl;
    if (url) window.open(url,"_blank","noopener");
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


  function recipeById(id){ return (window.SUW_RECIPES||[]).find(r=>r.id===id); }
  function recipeByProductId(productId){ return (window.SUW_RECIPES||[]).find(r=>r.productId===productId); }


  function renderProductMasterLibrary() {
    pageTitle.textContent = "Product Master";
    setActiveNav("products");
    viewContainer.innerHTML = `
      <section class="page-section wide">
        <section class="recipe-library-hero">
          <div>
            <p class="eyebrow">Single source of truth</p>
            <h3>Product Master</h3>
            <p>Define each product once: colors, recipe, materials, fabrication kit, packaging, and inventory relationships.</p>
          </div>
          <button class="button primary" data-action="add-product-master">+ Add Product</button>
        </section>
        <section class="recipe-library-grid">
          ${productMasters().map(master => `
            <article class="recipe-library-card">
              <div class="recipe-card-art">${master.imageData ? `<img src="${master.imageData}" alt="">` : master.craft === "Crochet" ? "⌁" : "✦"}</div>
              <div class="recipe-card-body">
                <p class="eyebrow">${escapeHTML(master.craft || "Other")} · ${escapeHTML(master.status || "Active")}</p>
                <h3>${escapeHTML(master.name)}</h3>
                <p>${master.colors?.length || 0} color${master.colors?.length === 1 ? "" : "s"} · ${(master.materials || []).length} material connection${(master.materials || []).length === 1 ? "" : "s"}</p>
                <div class="recipe-card-meta">
                  <span>${master.recipeId ? "Recipe linked" : "No recipe"}</span>
                  <span>${escapeHTML(master.packaging?.mailerType || "No mailer")}</span>
                </div>
                <div class="inventory-card-actions">
                  <button class="button primary" data-action="open-product-master" data-product-id="${master.id}">Open Product</button>
                  <button class="button secondary" data-action="open-recipe" data-recipe-id="${master.recipeId || master.id}">Open Recipe</button>
                </div>
              </div>
            </article>`).join("")}
        </section>
      </section>`;
  }

  function openProductMaster(productId) {
    const master = productMasterById(productId);
    if (!master) return showToast("Product not found.");
    const recipe = recipeById(master.recipeId || master.id);
    pageTitle.textContent = "Product Master";
    setActiveNav("products");
    viewContainer.innerHTML = `
      <section class="page-section wide">
        <button class="back-button" data-view="products">← Back to Product Master</button>
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

  function showProductMasterEditor(productId = null) {
    const master = productId ? productMasterById(productId) : null;
    const recipes = window.SUW_RECIPES || [];
    const inventoryOptions = inventoryItems().map(item => `<option value="${item.id}">${escapeHTML(item.name)}</option>`).join("");
    const productTagOptions = inventoryItems().filter(item => item.materialType === "Product Tag").map(item => `<option value="${item.id}">${escapeHTML(item.name)}</option>`).join("");
    showModal(
      master ? "Edit Product Master" : "Add Product",
      `<form id="productMasterForm" class="product-master-form">
        <label>Product Name<input name="name" value="${escapeHTML(master?.name || "")}" required></label>
        <label>Short Name<input name="shortName" value="${escapeHTML(master?.shortName || "")}"></label>
        <label>Craft<select name="craft">${["Macramé","Crochet","Other"].map(value => `<option value="${value}" ${master?.craft === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
        <label>Status<select name="status">${["Active","Coming Soon","Archived"].map(value => `<option value="${value}" ${master?.status === value ? "selected" : ""}>${value}</option>`).join("")}</select></label>
        <label class="full-width">Colors
          <input name="colors" value="${escapeHTML((master?.colors || []).join(", "))}" placeholder="Natural/Beige, White, Black">
        </label>
        <label>Workshop Recipe<select name="recipeId"><option value="">No recipe</option>${recipes.map(recipe => `<option value="${recipe.id}" ${master?.recipeId === recipe.id ? "selected" : ""}>${escapeHTML(recipe.title)}</option>`).join("")}</select></label>
        <label>Mailer Type<input name="mailerType" value="${escapeHTML(master?.packaging?.mailerType || "")}"></label>
        <label>Product Tag Inventory Item<select name="productTagInventoryId"><option value="">Not set</option>${productTagOptions}</select></label>
        <label>Care Sheet<select name="careSheetInventoryId"><option value="">Not set</option>${inventoryOptions}</select></label>
        <label>Company Sticker<select name="companyStickerInventoryId"><option value="">Not set</option>${inventoryOptions}</select></label>
        <label class="full-width">Packaging Notes<textarea name="packagingNotes" rows="3">${escapeHTML(master?.packaging?.notes || "")}</textarea></label>

        <fieldset class="full-width product-material-editor">
          <legend>Materials</legend>
          <div id="productMaterialRows"></div>
          <button type="button" class="button secondary small" id="addProductMaterial">+ Add Material</button>
        </fieldset>
      </form>`,
      [
        {label:"Cancel"},
        {label:master ? "Save Product" : "Add Product",kind:"primary",onClick:() => saveProductMaster(productId)}
      ]
    );

    const form = document.getElementById("productMasterForm");
    if (master) {
      form.productTagInventoryId.value = master.packaging?.productTagInventoryId || "";
      form.careSheetInventoryId.value = master.packaging?.careSheetInventoryId || "";
      form.companyStickerInventoryId.value = master.packaging?.companyStickerInventoryId || "";
    }

    const rows = document.getElementById("productMaterialRows");
    const initial = master?.materials?.length ? master.materials : [];
    initial.forEach(row => addProductMaterialRow(row));
    document.getElementById("addProductMaterial").addEventListener("click",() => addProductMaterialRow());
  }

  function addProductMaterialRow(value = {}) {
    const container = document.getElementById("productMaterialRows");
    const row = document.createElement("div");
    row.className = "product-material-edit-row";
    row.innerHTML = `
      <select class="pm-item">${inventoryItems().map(item => `<option value="${item.id}">${escapeHTML(item.name)}</option>`).join("")}</select>
      <input class="pm-qty" type="number" min="0.01" step="0.01" value="${Number(value.quantity || 1)}">
      <select class="pm-role">
        ${["raw","kit","separate","packaging"].map(role => `<option value="${role}" ${value.role === role ? "selected" : ""}>${role}</option>`).join("")}
      </select>
      <button type="button" class="remove-line">×</button>`;
    row.querySelector(".pm-item").value = value.inventoryItemId || inventoryItems()[0]?.id || "";
    row.querySelector(".remove-line").addEventListener("click",() => row.remove());
    container.appendChild(row);
  }

  function saveProductMaster(productId) {
    const form = document.getElementById("productMasterForm");
    if (!form) return;
    const fd = new FormData(form);
    const rows = [...document.querySelectorAll(".product-material-edit-row")].map(row => ({
      inventoryItemId: row.querySelector(".pm-item").value,
      quantity: Number(row.querySelector(".pm-qty").value || 1),
      role: row.querySelector(".pm-role").value,
      colorSpecific: false
    }));
    const existing = productId ? productMasterById(productId) : null;
    const id = existing?.id || fd.get("name").trim().toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || uid("product");
    const updated = {
      ...(existing || {}),
      id,
      name: fd.get("name").trim(),
      shortName: fd.get("shortName").trim() || fd.get("name").trim(),
      craft: fd.get("craft"),
      status: fd.get("status"),
      colors: fd.get("colors").split(",").map(value => value.trim()).filter(Boolean),
      recipeId: fd.get("recipeId"),
      materials: rows,
      packaging: {
        ...(existing?.packaging || {}),
        mailerType: fd.get("mailerType").trim(),
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


  function renderRecipeLibrary(){
    pageTitle.textContent="Product Master"; setActiveNav("products");
    const recipes=window.SUW_RECIPES||[];
    viewContainer.innerHTML=`<section class="page-section wide"><section class="recipe-library-hero"><div><p class="eyebrow">Your digital cut sheets</p><h3>Product Master</h3><p>Keep every measurement, pattern, milestone, quality check, and workshop tip in one permanent place.</p></div><div class="recipe-hero-mark">SU</div></section><section class="recipe-library-grid">${recipes.map(r=>`<article class="recipe-library-card"><div class="recipe-card-art">${r.category==="Crochet"?"⌁":"✦"}</div><div class="recipe-card-body"><p class="eyebrow">${escapeHTML(r.category)} · Recipe v${escapeHTML(r.version)}</p><h3>${escapeHTML(r.title)}</h3><p>${escapeHTML(r.summary)}</p><div class="recipe-card-meta"><span>${escapeHTML(r.estimatedTime)}</span><span>${escapeHTML(r.status)}</span></div><button class="button primary" data-action="open-recipe" data-recipe-id="${r.id}">Open Recipe</button></div></article>`).join("")}</section></section>`;
  }

  function openRecipe(recipeId,orderId=null,itemId=null){
    const r=recipeById(recipeId); if(!r)return showToast("Recipe not found.");
    pageTitle.textContent="Workshop Recipe"; setActiveNav("products");
    const order=orderId?data.orders.find(o=>o.id===orderId):null; const item=order?.items.find(i=>i.id===itemId);
    viewContainer.innerHTML=`<section class="page-section wide">${orderId ? `<button class="back-button" data-action="return-to-order" data-order-id="${orderId}" data-item-id="${itemId}">← Return to This Order</button>` : `<button class="back-button" data-view="products">← Back to Product Master</button>`}<section class="recipe-view-hero"><div><p class="eyebrow">${escapeHTML(r.category)} · Master Recipe v${escapeHTML(r.version)}</p><h3>${escapeHTML(r.title)}</h3><p>${escapeHTML(r.summary)}</p>${item?'<div class="recipe-order-context">Opened for an active production traveler.</div>':''}</div><div class="recipe-hero-actions"><button class="button secondary" data-action="recipe-focus" data-recipe-id="${r.id}">Focus View</button><button class="button primary" data-action="print-recipe" data-recipe-id="${r.id}">Print Cut Sheet</button></div></section><section class="recipe-overview-grid">${[['Estimated Time',r.estimatedTime],['Difficulty',r.difficulty],['Last Revised',r.lastRevised],['Recipe Status',r.status]].map(([a,b])=>`<article class="summary-card"><strong>${escapeHTML(b)}</strong><span>${escapeHTML(a)}</span></article>`).join('')}</section><section class="recipe-section panel"><div class="panel-heading"><div><p class="eyebrow">Choose the path</p><h3>Production Methods</h3></div></div><div class="recipe-method-grid">${r.methods.map(m=>`<article class="recipe-method-card"><strong>${escapeHTML(m.title)}</strong><p>${escapeHTML(m.description)}</p></article>`).join('')}</div></section><section class="recipe-section panel"><div class="panel-heading"><div><p class="eyebrow">At a glance</p><h3>Quick Reference</h3></div></div><div class="quick-reference-grid">${r.quickReference.map(q=>`<article class="quick-reference-card"><span>${escapeHTML(q.label)}</span><strong>${escapeHTML(q.value)}</strong><small>${escapeHTML(q.note||'')}</small></article>`).join('')}</div></section><section class="recipe-two-column"><article class="recipe-section panel"><div class="panel-heading"><div><p class="eyebrow">What you need</p><h3>Materials</h3></div></div><div class="recipe-list">${r.materials.map(m=>`<div><strong>${escapeHTML(m.name)}</strong><span>${escapeHTML(m.quantity)}</span></div>`).join('')}</div></article><article class="recipe-section panel"><div class="panel-heading"><div><p class="eyebrow">Worktable</p><h3>Tools</h3></div></div><div class="recipe-list simple">${r.tools.map(t=>`<div><strong>${escapeHTML(t)}</strong></div>`).join('')}</div></article></section><section class="recipe-section"><div class="section-heading"><p class="eyebrow">Build from scratch</p><h3>Production Stages</h3><p>Open details only when needed. Check off the meaningful milestone.</p></div><div class="recipe-stage-list">${r.stages.map((st,idx)=>renderRecipeStage(r,st,idx,orderId,itemId)).join('')}</div></section><section class="recipe-wisdom"><div><p class="eyebrow">Lessons from the workbench</p><h3>Workshop Wisdom</h3></div><div class="wisdom-list">${r.wisdom.map(w=>`<blockquote>${escapeHTML(w)}</blockquote>`).join('')}</div></section><section class="recipe-two-column"><article class="recipe-section panel"><div class="panel-heading"><div><p class="eyebrow">Before mailing</p><h3>Packing</h3></div></div><ol class="recipe-numbered-list">${r.packing.map(x=>`<li>${escapeHTML(x)}</li>`).join('')}</ol></article><article class="recipe-section panel"><div class="panel-heading"><div><p class="eyebrow">Master record</p><h3>Recipe History</h3></div></div><div class="recipe-history">${r.history.map(h=>`<div><strong>v${escapeHTML(h.version)} · ${escapeHTML(h.date)}</strong><p>${escapeHTML(h.changes)}</p></div>`).join('')}</div></article></section></section>`;
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

    const lowStock = inventoryItems().filter(inventoryNeedsAttention);
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

    document.getElementById("activeOrders").innerHTML = `<div class="order-list">${activeOrders().slice(0,5).map(order => `
      <div class="order-item"><button data-action="open-order" data-order-id="${order.id}">
      <strong>${escapeHTML(order.customerName)} · Etsy #${escapeHTML(order.etsyOrderNumber)}</strong>
      <span>${order.items.length} item${order.items.length === 1 ? "" : "s"} · ${order.items.map(item => escapeHTML(item.productName)).join(", ")}</span>
      </button><span class="badge status">${escapeHTML(order.status)}</span></div>`).join("") || "<p>No active orders yet.</p>"}</div>`;

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

  function renderWorkshopView() {
    pageTitle.textContent = "Workshop";
    setActiveNav("workshop");
    viewContainer.replaceChildren(document.getElementById("workshopTemplate").content.cloneNode(true));
    renderWorkshopFilters();
    renderWorkshopOrders();
  }

  function renderWorkshopFilters() {
    const filters = ["Active","New","Preparing","Manufacturing","Waiting on Material","Packing","Ready to Mail","Completed","All"];
    document.getElementById("workshopFilters").innerHTML = filters.map(filter => `<button class="filter-chip ${currentWorkshopFilter === filter ? "active" : ""}" data-action="filter-workshop" data-filter="${filter}">${filter}</button>`).join("");
  }

  function renderWorkshopOrders() {
    const container = document.getElementById("workshopOrders");
    let orders = [...data.orders].sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    if (currentWorkshopFilter === "Active") orders = orders.filter(o => o.status !== "Completed");
    else if (currentWorkshopFilter !== "All") orders = orders.filter(o => o.status === currentWorkshopFilter || o.items.some(i => i.status === currentWorkshopFilter));

    container.innerHTML = orders.map(order => `
      <article class="workspace-order-card">
        <div class="workspace-order-header">
          <div><p class="eyebrow">Etsy #${escapeHTML(order.etsyOrderNumber)}</p><h4>${escapeHTML(order.customerName)}</h4><p>${order.items.length} independently tracked item${order.items.length === 1 ? "" : "s"}</p></div>
          <div class="item-action-group"><span class="badge status">${escapeHTML(order.status)}</span><button class="button primary small" data-action="open-order" data-order-id="${order.id}">Open Processing Area</button></div>
        </div>
        <div class="workspace-items">${order.items.map((item,index) => `
          <div class="workspace-item"><div><h5>${escapeHTML(item.productName)} #${index+1}</h5><p>${escapeHTML(item.color)} · ${escapeHTML(item.status)}</p></div>
          <span class="badge ${item.status === "Completed" ? "complete" : item.status === "Waiting on Material" ? "waiting" : "status"}">${workflowPercent(item)}%</span></div>`).join("")}
        </div>
      </article>`).join("") || `<div class="panel"><p>No orders match this view.</p></div>`;
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
    row.innerHTML = `<label>Product<select class="line-product"></select></label><label>Color<select class="line-color"></select></label><label>Quantity<input class="line-quantity" type="number" min="1" value="${values.quantity || 1}" /></label><button type="button" class="remove-line" title="Remove product">×</button>`;
    const productSelect = row.querySelector(".line-product");
    productSelect.innerHTML = data.products.map(p => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join("");
    productSelect.value = values.productId || data.products[0].id;
    const refreshColors = () => {
      const product = data.products.find(p => p.id === productSelect.value);
      const colorSelect = row.querySelector(".line-color");
      colorSelect.innerHTML = product.colors.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join("");
      if (values.color && product.colors.includes(values.color)) colorSelect.value = values.color;
    };
    productSelect.addEventListener("change", () => { values.color = null; refreshColors(); });
    refreshColors();
    row.querySelector(".remove-line").addEventListener("click", () => {
      if (lineItems.children.length === 1) return showToast("An order needs at least one product.");
      row.remove();
    });
    lineItems.appendChild(row);
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
    const order={id:uid("order"),customerName:form.customerName.value.trim(),etsyOrderNumber:form.etsyOrderNumber.value.trim(),notes:form.notes.value.trim(),status:"New",items,createdAt:now,updatedAt:now,shipping:{careSheetPrinted:false,packingSlipPrinted:false,shippoOpened:false,labelAttached:false,companyStickerAttached:false,mailerSealed:false,packedAt:null,mailedAt:null,productTagChecks:{},inventoryTaskTransactions:{}}};
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
    const container=document.getElementById("orderWorkspace");
    container.innerHTML=`
      <section class="order-hero"><div><p class="eyebrow">Etsy #${escapeHTML(order.etsyOrderNumber)}</p><h3>${escapeHTML(order.customerName)}</h3><p>${escapeHTML(order.status)} · Updated ${formatDate(order.updatedAt)}</p></div>
      <div class="order-hero-actions"><button class="button secondary small" data-action="edit-order" data-order-id="${order.id}">Edit Order</button><button class="button secondary small" data-action="reset-order" data-order-id="${order.id}">Reset Progress</button><button class="button danger small" data-action="cancel-order" data-order-id="${order.id}">Cancel Order</button></div></section>

      <section class="order-summary-grid"><div class="summary-card"><strong>${counts.total}</strong><span>Total items</span></div><div class="summary-card"><strong>${counts.active}</strong><span>Still active</span></div><div class="summary-card"><strong>${counts.complete}</strong><span>Completed</span></div></section>

      <section class="processing-intro panel"><div><p class="eyebrow">Processing area</p><h3>Production Planning → Manufacturing & Assembly → Pack & Ship</h3><p>Open an item and use the three tabs. Every checkbox, note, fulfillment choice, and active tab is saved automatically.</p></div></section>

      <section class="item-workspace-list">${order.items.map((item,index) => renderItemCard(order,item,index,focusItemId)).join("")}</section>

      ${order.notes ? `<section class="order-notes"><h4>Order Notes</h4><p>${escapeHTML(order.notes)}</p></section>` : ""}
    `;
    touchOrder(order,focusItemId ? order.items.find(i => i.id===focusItemId) : order.items[0]);
    saveData();
    if (focusItemId) setTimeout(() => document.querySelector(`[data-item-card="${focusItemId}"]`)?.scrollIntoView({behavior:"smooth",block:"center"}),50);
  }

  function renderItemCard(order,item,index,focusItemId) {
    const expanded=item.id===focusItemId || item.id===data.settings.lastOpenedItemId;
    const tab=item.workflow.activeTab || tabForStatus(item.status);
    return `
      <article class="item-card ${expanded ? "expanded" : ""}" data-item-card="${item.id}">
        <div class="item-card-heading"><div><h4>${escapeHTML(item.productName)} #${index+1}</h4><p>${escapeHTML(item.color)} · ${escapeHTML(item.status)}</p></div>
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
      rows.push({name:"Wooden dowel",needed:"1",available:recordedInventoryQuantity("paper-towel-dowels"),state:item.workflow.materialStatuses["wood-dowel"] || "Available"});
      rows.push({name:"End caps",needed:"2",available:recordedInventoryQuantity("end-caps"),state:item.workflow.materialStatuses["end-caps"] || "Available"});
    } else if (item.productId === "macrame-toilet-paper-holder") {
      rows.push({name:"Macramé cord",needed:"Recipe amount",available:"Condition tracked",state:item.workflow.materialStatuses["cord"] || "Available"});
      rows.push({name:"Wooden ring",needed:"1",available:recordedInventoryQuantity("wood-rings"),state:item.workflow.materialStatuses["wood-ring"] || "Available"});
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
    const matchingKit = inventoryItems().find(entry => entry.category === "fabrication-kits" && entry.productId === item.productId && entry.color === item.color);
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
            <span>Fabrication Kits</span>
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
            <h6>What the fabrication kit covers</h6>
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
    return `
      <div class="process-pane-heading"><div><p class="eyebrow">Step 3</p><h4>Pack & Ship</h4><p>Finish item packing, shared order packaging, and shipping in one workspace.</p></div></div>
      ${outstanding.length ? `<section class="panel outstanding-work"><div class="panel-heading"><div><p class="eyebrow">Outstanding Work</p><h3>Earlier work still needs attention</h3></div><span class="badge attention">${outstanding.length}</span></div><div class="compact-list">${outstanding.map(outstandingItem => `<div><strong>${escapeHTML(outstandingItem.productName)} — ${escapeHTML(outstandingItem.color)}</strong><span>${escapeHTML(outstandingItem.status)}</span></div>`).join("")}</div></section>` : ""}
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
    const done = tagDone + mailersDone + [careSheetDone,labelDone,stickerDone,sealedDone].filter(Boolean).length;
    const total = tagGroups.length + mailerTasks.length + 4;
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
      const needsDowel = orderItem.productId === "macrame-paper-towel-holder";
      return `<label class="process-check inventory-aware-check pack-mailer-task ${checked ? "checked" : ""}">
        <input type="checkbox" ${checked ? "checked" : ""} data-action="packing-check" data-index="${entry.index}" data-order-id="${order.id}" data-item-id="${orderItem.id}">
        <span class="check-box">${checked ? "✓" : ""}</span>
        <span class="process-check-copy">
          <span>Pack Mailer — ${escapeHTML(orderItem.productName)} — ${escapeHTML(orderItem.color)}</span>
          <small class="pack-mailer-contents">Insert the tagged product · care sheet with Etsy packing slip on reverse${needsDowel ? " · prepared dowel" : ""}</small>
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
        ${mailerTasks.map(renderMailerTask).join("")}
        <div class="process-check task-with-link ${labelDone ? "checked" : ""}"><label class="process-check-main"><input type="checkbox" ${labelDone ? "checked" : ""} data-action="shipping-check" data-key="labelAttached" data-order-id="${order.id}"><span class="check-box">${labelDone ? "✓" : ""}</span><span class="process-check-copy"><span>Print & Attach Shipping Label</span><small>Purchase and print the label in Shippo, then attach it to the mailer.</small></span></label><button class="button secondary small" type="button" data-action="external-link" data-link="shippo">Open Shippo</button></div>
        <label class="process-check inventory-aware-check ${stickerDone ? "checked" : ""}"><input type="checkbox" ${stickerDone ? "checked" : ""} data-action="shipping-check" data-key="companyStickerAttached" data-order-id="${order.id}"><span class="check-box">${stickerDone ? "✓" : ""}</span><span class="process-check-copy"><span>Apply Simply Ummiby Branding Sticker</span><small class="inventory-task-detail ${Number(sticker?.quantity || 0) <= 0 ? "out" : ""}">${sticker ? `${Number(sticker.quantity || 0)} available · Required 1 · ${escapeHTML(sticker.name)}` : "Company sticker inventory link missing"}</small></span></label>
        <label class="process-check ${sealedDone ? "checked" : ""}"><input type="checkbox" ${sealedDone ? "checked" : ""} data-action="shipping-check" data-key="mailerSealed" data-order-id="${order.id}"><span class="check-box">${sealedDone ? "✓" : ""}</span><span class="process-check-copy"><span>Close & Seal Package</span></span></label>
      </div>
      <div class="process-footer"><span>${order.status === "Ready to Mail" || order.status === "Completed" ? "Everything is packed." : ready ? "Everything is packed. Mark the order packed when you are finished." : "Complete the packing sequence, then mark the order packed."}</span>${order.status === "Ready to Mail" || order.status === "Completed" ? "" : `<button class="button primary" data-action="ready-mail" data-order-id="${order.id}" ${ready ? "" : "disabled"}>Mark Order Packed</button>`}</div>
      ${renderReadyToMailSection(order)}
    </section>`;
  }

  function renderReadyToMailSection(order) {
    if (!['Ready to Mail','Completed'].includes(order.status)) return '';
    const packedLabel = order.shipping?.packedAt ? new Date(order.shipping.packedAt).toLocaleString() : 'Packed';
    if (order.status === 'Completed') {
      const mailedLabel = order.shipping?.mailedAt ? new Date(order.shipping.mailedAt).toLocaleString() : 'Mailed';
      return `<section class="ready-mail-panel complete"><div><p class="eyebrow">Order complete</p><h3>Mailed</h3><p>This order was marked mailed on ${escapeHTML(mailedLabel)}.</p></div><span class="badge complete">100%</span></section>`;
    }
    return `<section class="ready-mail-panel"><div><p class="eyebrow">Final step</p><h3>Ready to Mail</h3><p>Packed ${escapeHTML(packedLabel)}. Check this off after the package has actually been mailed.</p></div><label class="ready-mail-check"><input type="checkbox" data-action="mark-mailed" data-order-id="${order.id}"><span class="check-box"></span><span>Mark as Mailed</span></label></section>`;
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
    data.activity.unshift({text:`Selected ${value==="finished" ? "finished inventory" : value==="kit" ? "fabrication kit" : "raw materials"} for ${item.productName}`,time:"Just now"});
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

  function markOrderMailed(orderId) {
    const order=data.orders.find(o => o.id===orderId);
    if (!order) return;
    if (order.status !== "Ready to Mail") return showToast("Mark the order packed before marking it mailed.");
    order.shipping.mailedAt = new Date().toISOString();
    order.items.forEach(item => { item.status = "Completed"; item.updatedAt = order.shipping.mailedAt; });
    touchOrder(order);
    data.activity.unshift({text:`Mailed order for ${order.customerName}; order complete`,time:"Just now"});
    saveData();
    showToast("Order marked mailed and completed.");
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
    showModal("Cancel this order?",`<p>This removes <strong>${escapeHTML(order.customerName)} · Etsy #${escapeHTML(order.etsyOrderNumber)}</strong> from the Workshop.</p>`,[
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
    if (action==="open-product-master") openProductMaster(button.dataset.productId);
    if (action==="edit-product-master") showProductMasterEditor(button.dataset.productId);
    if (action==="add-product-master") showProductMasterEditor();
    if (action==="inventory-category") { inventoryViewState={category:button.dataset.category,search:"",craft:"All",materialType:"All",stock:"All",sort:"name-asc",group:"none"}; renderInventoryCatalog(button.dataset.category); }
    if (action==="adjust-inventory") adjustInventory(button.dataset.itemId,button.dataset.delta);
    if (action==="edit-inventory-item") showInventoryItemEditor(button.dataset.itemId);
    if (action==="add-inventory-item") showInventoryItemEditor();
    if (action==="open-inventory-link") openInventoryLink(button.dataset.itemId);
    if (action==="kit-transaction") showKitTransaction(button.dataset.itemId,button.dataset.mode);
    if (action==="stock-adjustment") showStockAdjustment(button.dataset.itemId);
    if (action==="clear-inventory-filters") { inventoryViewState.search="";inventoryViewState.craft="All";inventoryViewState.materialType="All";inventoryViewState.stock="All";inventoryViewState.sort="name-asc";inventoryViewState.group="none";renderInventoryCatalog(inventoryViewState.category); }
    if (action==="open-recipe") openRecipe(button.dataset.recipeId);
    if (action==="recipe-focus") renderRecipeFocus(button.dataset.recipeId);
    if (action==="print-recipe") printRecipe(button.dataset.recipeId);
    if (action==="open-item-recipe") openRecipe(button.dataset.recipeId,orderId,itemId);
    if (action==="return-to-order") openOrder(orderId,itemId);
    if (action==="complete-working-recipe") completeWorkingRecipe(orderId,itemId);
    if (action==="open-order") openOrder(orderId,itemId);
    if (action==="resume-focus") { const focus=findFocus(); focus ? openOrder(focus.order.id,focus.item.id) : showNewOrder(); }
    if (action==="filter-workshop") { currentWorkshopFilter=filter; renderWorkshopFilters(); renderWorkshopOrders(); }
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
    if (action==="mark-mailed") markOrderMailed(orderId);
    if (action==="print-care-sheet") printCareSheet();
    if (action==="external-link") openExternal(link);
    if (action==="restock-status-all") updateMaterialStatusAcrossOrders(button.dataset.materialId,button.dataset.status);
    if (action==="reset-item") resetItem(orderId,itemId);
    if (action==="reset-order") resetOrder(orderId);
    if (action==="cancel-order") cancelOrder(orderId);
  });

  document.addEventListener("change",event => {
    const el=event.target;
    const {action,orderId,itemId,index,key}=el.dataset;
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

  document.getElementById("backupButton").addEventListener("click",downloadBackup);
  document.getElementById("menuButton").addEventListener("click",() => sidebar.classList.toggle("open"));
  document.getElementById("modalClose").addEventListener("click",hideModal);
  document.getElementById("modalBackdrop").addEventListener("click",event => { if (event.target.id==="modalBackdrop") hideModal(); });

  showView("dashboard");
})();