(() => {
  const STORAGE_KEY = "simplyUmmibyWorkshopData";
  const ITEM_STATUSES = ["New","Preparing","Manufacturing","Waiting on Material","Ready for Packing","Packed","Ready to Mail","Completed"];
  const STATUS_PROGRESS = {
    "New": 5, "Preparing": 20, "Manufacturing": 50, "Waiting on Material": 35,
    "Ready for Packing": 70, "Packed": 85, "Ready to Mail": 95, "Completed": 100
  };
  const data = loadData();
  const viewContainer = document.getElementById("viewContainer");
  const pageTitle = document.getElementById("pageTitle");
  const sidebar = document.getElementById("sidebar");
  let currentWorkshopFilter = "Active";
  let editingOrderId = null;

  const viewContent = {
    batch: { title: "Batch Production", copy: "Prepare fabrication kits, make finished inventory, and replenish printed or Cricut-made supplies.", card: "Targets, current stock, and suggested batch quantities are planned for Version 0.6." },
    inventory: { title: "Inventory", copy: "Track raw materials, fabrication kits, finished products, poly mailers, tags, care sheets, labels, and stickers.", card: "The order workflow is ready first; full deductions arrive with the inventory release." },
    products: { title: "Products & Recipes", copy: "Each product will hold color options, fabrication-kit recipes, manufacturing steps, packaging rules, and linked resources.", card: "Your three current products and colors are already available in manual order entry." },
    resources: { title: "Resources", copy: "Your print-and-link toolbox for Etsy, Shippo, Cricut Design Space, care instructions, packing slips, and supplier links.", card: "Polished shortcuts and printing tools are planned for a later release." },
    settings: { title: "Settings", copy: "Manage stock thresholds, shop preferences, backups, and future Google Drive integration.", card: "Version 0.2.0 stores progress locally and supports downloadable JSON backups." }
  };

  function uid(prefix = "id") {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function loadData() {
    let parsed;
    try { parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (_) {}
    const initial = parsed || structuredClone(window.SUW_SAMPLE_DATA);
    initial.version = "0.2.0";
    initial.products ||= structuredClone(window.SUW_SAMPLE_DATA.products);
    initial.inventory ||= structuredClone(window.SUW_SAMPLE_DATA.inventory);
    initial.orders ||= [];
    initial.activity ||= [];
    initial.settings ||= {};
    initial.settings.lastOpenedOrderId ||= null;
    initial.settings.lastOpenedItemId ||= null;

    initial.orders = initial.orders.map(order => ({
      id: order.id || uid("order"),
      customerName: order.customerName || "Unnamed Customer",
      etsyOrderNumber: order.etsyOrderNumber || "",
      notes: order.notes || "",
      status: order.status || calculateOrderStatus(order.items || []),
      createdAt: order.createdAt || new Date().toISOString(),
      updatedAt: order.updatedAt || order.createdAt || new Date().toISOString(),
      items: (order.items || []).map((item, index) => ({
        id: item.id || uid("item"),
        unitNumber: item.unitNumber || index + 1,
        productId: item.productId || productIdFromName(item.productName),
        productName: item.productName || "Product",
        color: item.color || "Not specified",
        status: item.status || statusFromLegacy(item.progress),
        notes: item.notes || "",
        custom: Boolean(item.custom),
        updatedAt: item.updatedAt || new Date().toISOString()
      }))
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }

  function productIdFromName(name = "") {
    return window.SUW_SAMPLE_DATA.products.find(p => p.name === name)?.id || "";
  }

  function statusFromLegacy(progress = "") {
    if (/ready for packing/i.test(progress)) return "Ready for Packing";
    if (/manufactur/i.test(progress) || /\d+\s+of\s+\d+/i.test(progress)) return "Manufacturing";
    return "New";
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

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

  function activeOrders() {
    return data.orders.filter(o => o.status !== "Completed");
  }

  function touchOrder(order, item = null) {
    const now = new Date().toISOString();
    order.updatedAt = now;
    if (item) item.updatedAt = now;
    order.status = calculateOrderStatus(order.items);
    data.settings.lastOpenedOrderId = order.id;
    if (item) data.settings.lastOpenedItemId = item.id;
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

  function renderDashboardView() {
    pageTitle.textContent = "Dashboard";
    setActiveNav("dashboard");
    const template = document.getElementById("dashboardTemplate");
    viewContainer.replaceChildren(template.content.cloneNode(true));
    renderDashboard();
  }

  function renderDashboard() {
    const allItems = data.orders.flatMap(o => o.items.map(i => ({...i, orderId:o.id})));
    const counts = {
      waiting: allItems.filter(i => i.status === "New" || i.status === "Preparing").length,
      making: allItems.filter(i => i.status === "Manufacturing").length,
      packing: allItems.filter(i => i.status === "Ready for Packing" || i.status === "Packed").length,
      ready: data.orders.filter(o => o.status === "Ready to Mail").length,
      material: allItems.filter(i => i.status === "Waiting on Material").length
    };
    const metrics = [
      [counts.waiting, "Orders/items waiting"],
      [counts.making, "Currently making"],
      [counts.packing, "Ready to pack"],
      [counts.ready, "Orders ready to mail"],
      [counts.material, "Waiting on materials"]
    ];
    document.getElementById("metricGrid").innerHTML = metrics.map(([value,label]) => `<article class="metric-card"><strong>${value}</strong><span>${label}</span></article>`).join("");

    const focus = findFocus();
    const focusPanel = document.getElementById("todayFocus");
    if (focus) {
      focusPanel.innerHTML = `
        <div class="focus-main">
          <div class="focus-flower">SU</div>
          <div><p class="eyebrow">Today's focus</p><h3>${escapeHTML(focus.item.productName)} · ${escapeHTML(focus.item.color)}</h3>
          <p>${escapeHTML(focus.order.customerName)} · Etsy #${escapeHTML(focus.order.etsyOrderNumber)} · ${escapeHTML(focus.item.status)}</p></div>
        </div>
        <button class="button primary" data-action="open-order" data-order-id="${focus.order.id}" data-item-id="${focus.item.id}">Resume →</button>`;
    } else {
      focusPanel.classList.add("empty");
      focusPanel.innerHTML = `
        <div class="focus-main"><div class="focus-flower">SU</div><div><p class="eyebrow">Today's focus</p>
        <h3>Your worktable is ready.</h3><p>Create an order when you're ready to begin.</p></div></div>
        <button class="button primary" data-action="new-order">Create Order</button>`;
    }

    const lowStock = data.inventory.filter(item => item.quantity <= item.minimum);
    document.getElementById("inventoryAlerts").innerHTML = `<div class="alert-list">${lowStock.map(item => `
      <div class="alert-item"><div><strong>${escapeHTML(item.name)}</strong><span>${item.quantity} remaining · ${escapeHTML(item.category)}</span></div><span class="badge warning">Low stock</span></div>
    `).join("") || "<p>No inventory alerts.</p>"}</div>`;

    document.getElementById("activeOrders").innerHTML = `<div class="order-list">${activeOrders().slice(0,5).map(order => `
      <div class="order-item"><button data-action="open-order" data-order-id="${order.id}">
        <strong>${escapeHTML(order.customerName)} · Etsy #${escapeHTML(order.etsyOrderNumber)}</strong>
        <span>${order.items.length} item${order.items.length === 1 ? "" : "s"} · ${order.items.map(item => escapeHTML(item.productName)).join(", ")}</span>
      </button><span class="badge status">${escapeHTML(order.status)}</span></div>
    `).join("") || "<p>No active orders yet.</p>"}</div>`;

    document.getElementById("activityFeed").innerHTML = `<div class="activity-list">${data.activity.slice(0,6).map(entry => `
      <div class="activity-item"><strong>${escapeHTML(entry.text)}</strong><span>${escapeHTML(entry.time)}</span></div>
    `).join("")}</div>`;
  }

  function findFocus() {
    const lastOrder = data.orders.find(o => o.id === data.settings.lastOpenedOrderId && o.status !== "Completed");
    const lastItem = lastOrder?.items.find(i => i.id === data.settings.lastOpenedItemId && i.status !== "Completed");
    if (lastOrder && lastItem) return {order:lastOrder, item:lastItem};
    const candidates = data.orders.flatMap(order => order.items.filter(i => i.status !== "Completed").map(item => ({order,item})));
    candidates.sort((a,b) => new Date(b.item.updatedAt) - new Date(a.item.updatedAt));
    return candidates[0] || null;
  }

  function renderWorkshopView() {
    pageTitle.textContent = "Workshop";
    setActiveNav("workshop");
    const template = document.getElementById("workshopTemplate");
    viewContainer.replaceChildren(template.content.cloneNode(true));
    renderWorkshopFilters();
    renderWorkshopOrders();
  }

  function renderWorkshopFilters() {
    const filters = ["Active","New","Preparing","Manufacturing","Waiting on Material","Packing","Ready to Mail","Completed","All"];
    document.getElementById("workshopFilters").innerHTML = filters.map(filter => `
      <button class="filter-chip ${currentWorkshopFilter === filter ? "active" : ""}" data-action="filter-workshop" data-filter="${filter}">${filter}</button>
    `).join("");
  }

  function renderWorkshopOrders() {
    const container = document.getElementById("workshopOrders");
    let orders = [...data.orders].sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    if (currentWorkshopFilter === "Active") orders = orders.filter(o => o.status !== "Completed");
    else if (currentWorkshopFilter !== "All") orders = orders.filter(o => o.status === currentWorkshopFilter || o.items.some(i => i.status === currentWorkshopFilter));

    container.innerHTML = orders.map(order => `
      <article class="workspace-order-card">
        <div class="workspace-order-header">
          <div><p class="eyebrow">Etsy #${escapeHTML(order.etsyOrderNumber)}</p><h4>${escapeHTML(order.customerName)}</h4>
          <p>${order.items.length} independently tracked item${order.items.length === 1 ? "" : "s"}</p></div>
          <div class="item-action-group"><span class="badge status">${escapeHTML(order.status)}</span>
          <button class="button primary small" data-action="open-order" data-order-id="${order.id}">Open Order</button></div>
        </div>
        <div class="workspace-items">
          ${order.items.map((item,index) => `
            <div class="workspace-item">
              <div><h5>${escapeHTML(item.productName)} #${index+1}</h5><p>${escapeHTML(item.color)} · ${escapeHTML(item.status)}</p></div>
              <span class="badge ${item.status === "Completed" ? "complete" : item.status === "Waiting on Material" ? "waiting" : "status"}">${STATUS_PROGRESS[item.status] || 0}%</span>
            </div>`).join("")}
        </div>
      </article>
    `).join("") || `<div class="panel"><p>No orders match this view.</p></div>`;
  }

  function showNewOrder(orderId = null) {
    editingOrderId = orderId;
    pageTitle.textContent = orderId ? "Edit Order" : "New Order";
    setActiveNav("");
    const template = document.getElementById("newOrderTemplate");
    viewContainer.replaceChildren(template.content.cloneNode(true));
    const order = orderId ? data.orders.find(o => o.id === orderId) : null;
    if (order) {
      document.getElementById("orderFormTitle").textContent = "Edit workshop order";
      const form = document.getElementById("newOrderForm");
      form.customerName.value = order.customerName;
      form.etsyOrderNumber.value = order.etsyOrderNumber;
      form.notes.value = order.notes;
    }

    const lineItems = document.getElementById("lineItems");
    const initialLines = order
      ? groupOrderItems(order.items)
      : [{productId:data.products[0].id, color:data.products[0].colors[0], quantity:1, custom:false}];
    initialLines.forEach(line => addLineItemRow(line));

    document.getElementById("addLineItem").addEventListener("click", () => addLineItemRow());
    document.getElementById("newOrderForm").addEventListener("submit", saveOrderForm);
  }

  function groupOrderItems(items) {
    const groups = new Map();
    items.forEach(item => {
      const key = `${item.productId}|${item.color}|${item.custom}`;
      const existing = groups.get(key) || {productId:item.productId, color:item.color, quantity:0, custom:item.custom};
      existing.quantity += 1;
      groups.set(key, existing);
    });
    return [...groups.values()];
  }

  function addLineItemRow(values = {}) {
    const lineItems = document.getElementById("lineItems");
    const row = document.createElement("div");
    row.className = "line-item-row";
    row.dataset.lineId = uid("line");
    row.innerHTML = `
      <label>Product<select class="line-product"></select></label>
      <label>Color<select class="line-color"></select></label>
      <label>Quantity<input class="line-quantity" type="number" min="1" value="${values.quantity || 1}" /></label>
      <button type="button" class="remove-line" title="Remove product">×</button>
    `;
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
    const rows = [...document.querySelectorAll(".line-item-row")];
    const specs = rows.map(row => ({
      productId: row.querySelector(".line-product").value,
      color: row.querySelector(".line-color").value,
      quantity: Number(row.querySelector(".line-quantity").value)
    }));
    if (specs.some(s => !s.quantity || s.quantity < 1)) return showToast("Please enter a valid quantity.");

    const now = new Date().toISOString();
    if (editingOrderId) {
      const order = data.orders.find(o => o.id === editingOrderId);
      const oldItems = [...order.items];
      const rebuilt = [];
      specs.forEach(spec => {
        const product = data.products.find(p => p.id === spec.productId);
        for (let n=0; n<spec.quantity; n++) {
          const reusableIndex = oldItems.findIndex(i => i.productId === spec.productId && i.color === spec.color);
          if (reusableIndex >= 0) rebuilt.push(oldItems.splice(reusableIndex,1)[0]);
          else rebuilt.push({id:uid("item"), productId:product.id, productName:product.name, color:spec.color, status:"New", notes:"", custom:false, updatedAt:now});
        }
      });
      rebuilt.forEach((item,index) => item.unitNumber = index+1);
      order.customerName = form.customerName.value.trim();
      order.etsyOrderNumber = form.etsyOrderNumber.value.trim();
      order.notes = form.notes.value.trim();
      order.items = rebuilt;
      touchOrder(order);
      data.activity.unshift({text:`Updated order for ${order.customerName}`, time:"Just now"});
      saveData();
      showToast("Order updated.");
      return openOrder(order.id);
    }

    const items = [];
    specs.forEach(spec => {
      const product = data.products.find(p => p.id === spec.productId);
      for (let n=0; n<spec.quantity; n++) items.push({
        id:uid("item"), unitNumber:items.length+1, productId:product.id, productName:product.name,
        color:spec.color, status:"New", notes:"", custom:false, updatedAt:now
      });
    });
    const order = {
      id:uid("order"), customerName:form.customerName.value.trim(), etsyOrderNumber:form.etsyOrderNumber.value.trim(),
      notes:form.notes.value.trim(), status:"New", items, createdAt:now, updatedAt:now
    };
    data.orders.unshift(order);
    data.activity.unshift({text:`Created order for ${order.customerName}`, time:"Just now"});
    touchOrder(order, items[0]);
    saveData();
    showToast("Order saved locally.");
    openOrder(order.id);
  }

  function openOrder(orderId, focusItemId = null) {
    const order = data.orders.find(o => o.id === orderId);
    if (!order) return showToast("Order not found.");
    pageTitle.textContent = "Order Workspace";
    setActiveNav("workshop");
    const template = document.getElementById("orderWorkspaceTemplate");
    viewContainer.replaceChildren(template.content.cloneNode(true));
    renderOrderWorkspace(order, focusItemId);
  }

  function renderOrderWorkspace(order, focusItemId = null) {
    const counts = {
      total: order.items.length,
      active: order.items.filter(i => i.status !== "Completed").length,
      complete: order.items.filter(i => i.status === "Completed").length
    };
    const container = document.getElementById("orderWorkspace");
    container.innerHTML = `
      <section class="order-hero">
        <div><p class="eyebrow">Etsy #${escapeHTML(order.etsyOrderNumber)}</p><h3>${escapeHTML(order.customerName)}</h3>
        <p>${escapeHTML(order.status)} · Updated ${formatDate(order.updatedAt)}</p></div>
        <div class="order-hero-actions">
          <button class="button secondary small" data-action="edit-order" data-order-id="${order.id}">Edit Order</button>
          <button class="button secondary small" data-action="reset-order" data-order-id="${order.id}">Reset Progress</button>
          <button class="button danger small" data-action="cancel-order" data-order-id="${order.id}">Cancel Order</button>
        </div>
      </section>

      <section class="order-summary-grid">
        <div class="summary-card"><strong>${counts.total}</strong><span>Total items</span></div>
        <div class="summary-card"><strong>${counts.active}</strong><span>Still active</span></div>
        <div class="summary-card"><strong>${counts.complete}</strong><span>Completed</span></div>
      </section>

      <section class="item-workspace-list">
        ${order.items.map((item,index) => renderItemCard(order,item,index,focusItemId)).join("")}
      </section>

      ${order.notes ? `<section class="order-notes"><h4>Order Notes</h4><p>${escapeHTML(order.notes)}</p></section>` : ""}
    `;
    touchOrder(order, focusItemId ? order.items.find(i => i.id === focusItemId) : order.items[0]);
    saveData();
    if (focusItemId) setTimeout(() => document.querySelector(`[data-item-card="${focusItemId}"]`)?.scrollIntoView({behavior:"smooth", block:"center"}), 50);
  }

  function renderItemCard(order,item,index,focusItemId) {
    const expanded = item.id === focusItemId || item.id === data.settings.lastOpenedItemId;
    return `
      <article class="item-card ${expanded ? "expanded" : ""}" data-item-card="${item.id}">
        <div class="item-card-heading">
          <div><h4>${escapeHTML(item.productName)} #${index+1}</h4><p>${escapeHTML(item.color)} · ${escapeHTML(item.status)}</p></div>
          <div class="item-action-group"><span class="badge ${item.status === "Completed" ? "complete" : item.status === "Waiting on Material" ? "waiting" : "status"}">${STATUS_PROGRESS[item.status] || 0}%</span>
          <button class="button secondary small" data-action="toggle-item" data-order-id="${order.id}" data-item-id="${item.id}">${expanded ? "Close" : "Open"}</button></div>
        </div>
        <div class="item-card-body">
          <div class="item-fields">
            <label class="status-select-wrap"><span>Status</span>
              <select data-action="change-item-status" data-order-id="${order.id}" data-item-id="${item.id}">
                ${ITEM_STATUSES.map(status => `<option value="${status}" ${status === item.status ? "selected" : ""}>${status}</option>`).join("")}
              </select>
            </label>
            <label>Item notes<textarea rows="3" data-action="item-notes" data-order-id="${order.id}" data-item-id="${item.id}" placeholder="Anything to remember while making this item...">${escapeHTML(item.notes)}</textarea></label>
          </div>
          <div class="progress-rail"><span style="width:${STATUS_PROGRESS[item.status] || 0}%"></span></div>
          <div class="item-actions">
            <div class="item-action-group">
              <button class="button secondary small" data-action="previous-status" data-order-id="${order.id}" data-item-id="${item.id}">← Previous</button>
              <button class="button primary small" data-action="next-status" data-order-id="${order.id}" data-item-id="${item.id}">Next Stage →</button>
            </div>
            <button class="button danger small" data-action="reset-item" data-order-id="${order.id}" data-item-id="${item.id}">Reset Item</button>
          </div>
        </div>
      </article>`;
  }

  function updateItemStatus(orderId,itemId,status) {
    const order = data.orders.find(o => o.id === orderId);
    const item = order?.items.find(i => i.id === itemId);
    if (!item) return;
    item.status = status;
    touchOrder(order,item);
    data.activity.unshift({text:`${item.productName} moved to ${status}`, time:"Just now"});
    saveData();
    renderOrderWorkspace(order,item.id);
  }

  function stepItem(orderId,itemId,direction) {
    const order = data.orders.find(o => o.id === orderId);
    const item = order?.items.find(i => i.id === itemId);
    if (!item) return;
    const index = ITEM_STATUSES.indexOf(item.status);
    const next = Math.max(0, Math.min(ITEM_STATUSES.length-1, index + direction));
    updateItemStatus(orderId,itemId,ITEM_STATUSES[next]);
  }

  function showModal(title, body, actions) {
    document.getElementById("modalTitle").textContent = title;
    document.getElementById("modalBody").innerHTML = body;
    const actionsEl = document.getElementById("modalActions");
    actionsEl.innerHTML = "";
    actions.forEach(action => {
      const button = document.createElement("button");
      button.className = `button ${action.kind || "secondary"}`;
      button.textContent = action.label;
      button.addEventListener("click", () => { hideModal(); action.onClick?.(); });
      actionsEl.appendChild(button);
    });
    document.getElementById("modalBackdrop").classList.remove("hidden");
  }

  function hideModal() {
    document.getElementById("modalBackdrop").classList.add("hidden");
  }

  function resetItem(orderId,itemId) {
    const order = data.orders.find(o => o.id === orderId);
    const item = order?.items.find(i => i.id === itemId);
    showModal("Reset this item?", `<p>This returns <strong>${escapeHTML(item.productName)}</strong> to New and clears its item notes. Inventory is not affected in Version 0.2.0.</p>`, [
      {label:"Keep Progress"},
      {label:"Reset Item", kind:"danger", onClick:() => { item.status="New"; item.notes=""; touchOrder(order,item); data.activity.unshift({text:`Reset ${item.productName}`,time:"Just now"}); saveData(); renderOrderWorkspace(order,item.id); }}
    ]);
  }

  function resetOrder(orderId) {
    const order = data.orders.find(o => o.id === orderId);
    showModal("Reset the whole order?", `<p>Every item in <strong>${escapeHTML(order.customerName)}'s</strong> order will return to New. Item notes will be cleared.</p>`, [
      {label:"Keep Progress"},
      {label:"Reset Order", kind:"danger", onClick:() => { order.items.forEach(i => {i.status="New";i.notes="";}); touchOrder(order); data.activity.unshift({text:`Reset order for ${order.customerName}`,time:"Just now"}); saveData(); renderOrderWorkspace(order); }}
    ]);
  }

  function cancelOrder(orderId) {
    const order = data.orders.find(o => o.id === orderId);
    showModal("Cancel this order?", `<p>This removes <strong>${escapeHTML(order.customerName)} · Etsy #${escapeHTML(order.etsyOrderNumber)}</strong> from the Workshop. This cannot be undone from inside the app.</p>`, [
      {label:"Keep Order"},
      {label:"Cancel Order", kind:"danger", onClick:() => { data.orders = data.orders.filter(o => o.id !== orderId); data.activity.unshift({text:`Cancelled order for ${order.customerName}`,time:"Just now"}); saveData(); showView("workshop"); showToast("Order cancelled."); }}
    ]);
  }

  function formatDate(value) {
    try { return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}).format(new Date(value)); } catch (_) { return ""; }
  }

  function downloadBackup() {
    const backup = {app:"Simply Ummiby Workshop",version:"0.2.0",exportedAt:new Date().toISOString(),data};
    const blob = new Blob([JSON.stringify(backup,null,2)],{type:"application/json"});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `simply-ummiby-workshop-backup-${new Date().toISOString().slice(0,10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    data.activity.unshift({text:"Downloaded a local backup",time:"Just now"});
    saveData();
    showToast("Backup downloaded.");
  }

  function showToast(message) {
    document.querySelector(".toast")?.remove();
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(),2500);
  }

  document.addEventListener("click", event => {
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) showView(viewButton.dataset.view);

    const button = event.target.closest("[data-action]");
    if (!button) return;
    const {action,orderId,itemId,filter} = button.dataset;

    if (action === "new-order") showNewOrder();
    if (action === "open-order") openOrder(orderId,itemId);
    if (action === "resume-focus") {
      const focus = findFocus();
      focus ? openOrder(focus.order.id,focus.item.id) : showNewOrder();
    }
    if (action === "filter-workshop") { currentWorkshopFilter=filter; renderWorkshopFilters(); renderWorkshopOrders(); }
    if (action === "edit-order") showNewOrder(orderId);
    if (action === "toggle-item") {
      const card = document.querySelector(`[data-item-card="${itemId}"]`);
      card?.classList.toggle("expanded");
      data.settings.lastOpenedOrderId=orderId; data.settings.lastOpenedItemId=itemId; saveData();
      button.textContent = card?.classList.contains("expanded") ? "Close" : "Open";
    }
    if (action === "previous-status") stepItem(orderId,itemId,-1);
    if (action === "next-status") stepItem(orderId,itemId,1);
    if (action === "reset-item") resetItem(orderId,itemId);
    if (action === "reset-order") resetOrder(orderId);
    if (action === "cancel-order") cancelOrder(orderId);
  });

  document.addEventListener("change", event => {
    const el = event.target;
    if (el.dataset.action === "change-item-status") updateItemStatus(el.dataset.orderId,el.dataset.itemId,el.value);
  });

  document.addEventListener("input", event => {
    const el = event.target;
    if (el.dataset.action === "item-notes") {
      const order = data.orders.find(o => o.id === el.dataset.orderId);
      const item = order?.items.find(i => i.id === el.dataset.itemId);
      if (item) { item.notes=el.value; touchOrder(order,item); saveData(); }
    }
  });

  document.getElementById("backupButton").addEventListener("click", downloadBackup);
  document.getElementById("menuButton").addEventListener("click", () => sidebar.classList.toggle("open"));
  document.getElementById("modalClose").addEventListener("click", hideModal);
  document.getElementById("modalBackdrop").addEventListener("click", event => { if (event.target.id === "modalBackdrop") hideModal(); });

  showView("dashboard");
})();