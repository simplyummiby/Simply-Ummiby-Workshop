(() => {
  const STORAGE_KEY = "simplyUmmibyWorkshopData";
  const VERSION = "0.4.0";
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
        mailerSealed: Boolean(order.shipping?.mailerSealed)
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
        packingChecks: normalizeChecks(workflow.packingChecks, product.packingChecklist)
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
    if (view === "inventory") return renderRestockView();
    if (view === "products") return renderRecipeLibrary();

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

  function renderRecipeLibrary(){
    pageTitle.textContent="Workshop Recipes"; setActiveNav("products");
    const recipes=window.SUW_RECIPES||[];
    viewContainer.innerHTML=`<section class="page-section wide"><section class="recipe-library-hero"><div><p class="eyebrow">Your digital cut sheets</p><h3>Workshop Recipes</h3><p>Keep every measurement, pattern, milestone, quality check, and workshop tip in one permanent place.</p></div><div class="recipe-hero-mark">SU</div></section><section class="recipe-library-grid">${recipes.map(r=>`<article class="recipe-library-card"><div class="recipe-card-art">${r.category==="Crochet"?"⌁":"✦"}</div><div class="recipe-card-body"><p class="eyebrow">${escapeHTML(r.category)} · Recipe v${escapeHTML(r.version)}</p><h3>${escapeHTML(r.title)}</h3><p>${escapeHTML(r.summary)}</p><div class="recipe-card-meta"><span>${escapeHTML(r.estimatedTime)}</span><span>${escapeHTML(r.status)}</span></div><button class="button primary" data-action="open-recipe" data-recipe-id="${r.id}">Open Recipe</button></div></article>`).join("")}</section></section>`;
  }

  function openRecipe(recipeId,orderId=null,itemId=null){
    const r=recipeById(recipeId); if(!r)return showToast("Recipe not found.");
    pageTitle.textContent="Workshop Recipe"; setActiveNav("products");
    const order=orderId?data.orders.find(o=>o.id===orderId):null; const item=order?.items.find(i=>i.id===itemId);
    viewContainer.innerHTML=`<section class="page-section wide"><button class="back-button" data-view="products">← Back to Workshop Recipes</button><section class="recipe-view-hero"><div><p class="eyebrow">${escapeHTML(r.category)} · Master Recipe v${escapeHTML(r.version)}</p><h3>${escapeHTML(r.title)}</h3><p>${escapeHTML(r.summary)}</p>${item?'<div class="recipe-order-context">Opened for an active production traveler.</div>':''}</div><div class="recipe-hero-actions"><button class="button secondary" data-action="recipe-focus" data-recipe-id="${r.id}">Focus View</button><button class="button primary" data-action="print-recipe" data-recipe-id="${r.id}">Print Cut Sheet</button></div></section><section class="recipe-overview-grid">${[['Estimated Time',r.estimatedTime],['Difficulty',r.difficulty],['Last Revised',r.lastRevised],['Recipe Status',r.status]].map(([a,b])=>`<article class="summary-card"><strong>${escapeHTML(b)}</strong><span>${escapeHTML(a)}</span></article>`).join('')}</section><section class="recipe-section panel"><div class="panel-heading"><div><p class="eyebrow">Choose the path</p><h3>Production Methods</h3></div></div><div class="recipe-method-grid">${r.methods.map(m=>`<article class="recipe-method-card"><strong>${escapeHTML(m.title)}</strong><p>${escapeHTML(m.description)}</p></article>`).join('')}</div></section><section class="recipe-section panel"><div class="panel-heading"><div><p class="eyebrow">At a glance</p><h3>Quick Reference</h3></div></div><div class="quick-reference-grid">${r.quickReference.map(q=>`<article class="quick-reference-card"><span>${escapeHTML(q.label)}</span><strong>${escapeHTML(q.value)}</strong><small>${escapeHTML(q.note||'')}</small></article>`).join('')}</div></section><section class="recipe-two-column"><article class="recipe-section panel"><div class="panel-heading"><div><p class="eyebrow">What you need</p><h3>Materials</h3></div></div><div class="recipe-list">${r.materials.map(m=>`<div><strong>${escapeHTML(m.name)}</strong><span>${escapeHTML(m.quantity)}</span></div>`).join('')}</div></article><article class="recipe-section panel"><div class="panel-heading"><div><p class="eyebrow">Worktable</p><h3>Tools</h3></div></div><div class="recipe-list simple">${r.tools.map(t=>`<div><strong>${escapeHTML(t)}</strong></div>`).join('')}</div></article></section><section class="recipe-section"><div class="section-heading"><p class="eyebrow">Build from scratch</p><h3>Production Stages</h3><p>Open details only when needed. Check off the meaningful milestone.</p></div><div class="recipe-stage-list">${r.stages.map((st,idx)=>renderRecipeStage(r,st,idx,orderId,itemId)).join('')}</div></section><section class="recipe-wisdom"><div><p class="eyebrow">Lessons from the workbench</p><h3>Workshop Wisdom</h3></div><div class="wisdom-list">${r.wisdom.map(w=>`<blockquote>${escapeHTML(w)}</blockquote>`).join('')}</div></section><section class="recipe-two-column"><article class="recipe-section panel"><div class="panel-heading"><div><p class="eyebrow">Before mailing</p><h3>Packing</h3></div></div><ol class="recipe-numbered-list">${r.packing.map(x=>`<li>${escapeHTML(x)}</li>`).join('')}</ol></article><article class="recipe-section panel"><div class="panel-heading"><div><p class="eyebrow">Master record</p><h3>Recipe History</h3></div></div><div class="recipe-history">${r.history.map(h=>`<div><strong>v${escapeHTML(h.version)} · ${escapeHTML(h.date)}</strong><p>${escapeHTML(h.changes)}</p></div>`).join('')}</div></article></section></section>`;
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

    const lowStock = data.inventory.filter(item => item.quantity <= item.minimum);
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
      <div class="alert-item"><div><strong>${escapeHTML(item.name)}</strong><span>${item.quantity} remaining · ${escapeHTML(item.category)}</span></div><span class="badge warning">Low stock</span></div>
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
    const order={id:uid("order"),customerName:form.customerName.value.trim(),etsyOrderNumber:form.etsyOrderNumber.value.trim(),notes:form.notes.value.trim(),status:"New",items,createdAt:now,updatedAt:now,shipping:{careSheetPrinted:false,packingSlipPrinted:false,shippoOpened:false,labelAttached:false,companyStickerAttached:false,mailerSealed:false}};
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

      ${renderOrderShipping(order)}
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
          <div class="traveler-recipe-strip"><div><span>Workshop Recipe</span><strong>Recipe v${escapeHTML(item.recipeVersion || recipeByProductId(item.productId)?.version || "0.1")}</strong></div><button class="text-button" data-action="open-item-recipe" data-order-id="${order.id}" data-item-id="${item.id}" data-recipe-id="${item.productId}">View Master Recipe</button></div><div class="process-tabs">
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

  function renderManufacturePane(order,item) {
    const product = productById(item.productId);
    const totalSteps = product.manufacturingSections.reduce((sum, section) => sum + section.steps.length, 0);
    const done = countDone(item.workflow.manufacturingChecks);
    const missing = product.materials.filter(material => item.workflow.materialStatuses[material.id] !== "Available");
    return `
      <div class="process-pane-heading">
        <div>
          <p class="eyebrow">Step 2</p>
          <h4>Manufacturing & Assembly</h4>
          <p>Complete the making steps first, then the hardware or finishing steps. Missing later-stage materials do not stop you from starting.</p>
        </div>
        <span class="badge status">${done} of ${totalSteps}</span>
      </div>

      ${missing.length ? `<div class="shipping-rule"><strong>Still needed later:</strong> ${missing.map(material => `${escapeHTML(material.name)} (${escapeHTML(item.workflow.materialStatuses[material.id])})`).join(", ")}</div>` : ""}

      <div class="traveler-sections">
        ${product.manufacturingSections.map((section, sectionIndex) => `
          <section class="traveler-section">
            <div class="traveler-section-heading">
              <span>${sectionIndex + 1}</span>
              <h5>${escapeHTML(section.title)}</h5>
            </div>
            ${renderManufacturingChecklist(section.steps, item.workflow.manufacturingChecks, sectionIndex, order.id, item.id)}
          </section>
        `).join("")}
      </div>

      <div class="process-footer">
        <button class="button secondary" data-action="process-tab" data-tab="prepare" data-order-id="${order.id}" data-item-id="${item.id}">← Back to Planning</button>
        <button class="button primary" data-action="complete-manufacture" data-order-id="${order.id}" data-item-id="${item.id}" ${done===totalSteps ? "" : "disabled"}>Ready for Packing →</button>
      </div>`;
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

  function renderPackPane(order,item) {
    const product=productById(item.productId);
    const done=countDone(item.workflow.packingChecks);
    return `
      <div class="process-pane-heading"><div><p class="eyebrow">Step 3</p><h4>Pack this item</h4><p>These item-level steps prepare it for the order’s final shipping checklist below.</p></div><span class="badge status">${done} of ${product.packingChecklist.length}</span></div>
      <div class="shipping-rule">${item.productId==="macrame-paper-towel-holder" ? "<strong>Paper towel holder rule:</strong> Two or more paper towel holders must use separate mailers." : "<strong>Standard mailer:</strong> This product uses the shared smaller poly-mailer size."}</div>
      <div class="checklist-card">${renderChecklist(product.packingChecklist,item.workflow.packingChecks,"packing-check",order.id,item.id)}</div>
      <div class="resource-shortcuts">
        <button class="button secondary small" data-action="print-care-sheet">Print Care Sheet</button>
        <button class="button secondary small" data-action="external-link" data-link="etsyOrders">Open Etsy Orders</button>
        <button class="button secondary small" data-action="external-link" data-link="shippo">Open Shippo</button>
        <button class="button secondary small" data-action="external-link" data-link="cricut">Open Cricut</button>
      </div>
      <div class="process-footer"><button class="button secondary" data-action="process-tab" data-tab="manufacture" data-order-id="${order.id}" data-item-id="${item.id}">← Back to Manufacture</button>
      <button class="button primary" data-action="complete-pack" data-order-id="${order.id}" data-item-id="${item.id}" ${done===product.packingChecklist.length ? "" : "disabled"}>Mark Item Packed</button></div>`;
  }

  function renderChecklist(labels,checks,action,orderId,itemId,numbered=false) {
    return `<div class="process-checklist">${labels.map((label,index) => `
      <label class="process-check ${checks[index] ? "checked" : ""}"><input type="checkbox" ${checks[index] ? "checked" : ""} data-action="${action}" data-index="${index}" data-order-id="${orderId}" data-item-id="${itemId}">
      <span class="check-box">${checks[index] ? "✓" : ""}</span>${numbered ? `<span class="step-number">${index+1}</span>` : ""}<span>${escapeHTML(label)}</span></label>`).join("")}</div>`;
  }

  function renderOrderShipping(order) {
    const allPacked=order.items.every(i => ["Packed","Ready to Mail","Completed"].includes(i.status));
    const checks=[
      ["careSheetPrinted","Print and insert care instruction sheet"],
      ["packingSlipPrinted","Print packing slip; mark what is inside each mailer when split"],
      ["shippoOpened","Open Shippo and purchase/print shipping label"],
      ["labelAttached","Attach address or shipping label"],
      ["companyStickerAttached","Attach Simply Ummiby company sticker"],
      ["mailerSealed","Confirm all mailers are sealed"]
    ];
    const done=checks.filter(([key]) => order.shipping[key]).length;
    const ready=allPacked && done===checks.length;
    return `<section class="order-shipping panel">
      <div class="panel-heading"><div><p class="eyebrow">Whole order</p><h3>Final Shipping Checklist</h3><p>Every item must be packed before the whole Etsy order can be marked Ready to Mail.</p></div><span class="badge ${ready ? "complete" : "status"}">${done} of ${checks.length}</span></div>
      ${!allPacked ? `<div class="shipping-notice">Finish packing every item above to unlock Ready to Mail.</div>` : ""}
      <div class="process-checklist">${checks.map(([key,label]) => `
        <label class="process-check ${order.shipping[key] ? "checked" : ""}"><input type="checkbox" ${order.shipping[key] ? "checked" : ""} data-action="shipping-check" data-key="${key}" data-order-id="${order.id}">
        <span class="check-box">${order.shipping[key] ? "✓" : ""}</span><span>${label}</span></label>`).join("")}</div>
      <div class="resource-shortcuts">
        <button class="button secondary small" data-action="print-care-sheet">Print Care Sheet</button>
        <button class="button secondary small" data-action="external-link" data-link="etsyOrders">Open Etsy Orders</button>
        <button class="button secondary small" data-action="external-link" data-link="etsyCompleted">Open Etsy Completed</button>
        <button class="button secondary small" data-action="external-link" data-link="shippo">Open Shippo</button>
      </div>
      <div class="process-footer"><span>${ready ? "Everything is packed, labeled, stickered, and sealed." : "Complete all item and order shipping steps."}</span>
      <button class="button primary" data-action="ready-mail" data-order-id="${order.id}" ${ready ? "" : "disabled"}>Mark Order Ready to Mail</button></div>
    </section>`;
  }

  function workflowPercent(item) {
    const product = productById(item.productId);
    const manufacturingTotal = product.manufacturingSections.reduce((sum, section) => sum + section.steps.length, 0);
    const total = manufacturingTotal + product.packingChecklist.length + 1;
    const done = countDone(item.workflow.manufacturingChecks) + countDone(item.workflow.packingChecks) + (item.workflow.fulfillmentMethod ? 1 : 0);
    if (item.status === "Completed") return 100;
    return Math.round((done / total) * 100);
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
    if (!allChecked(item.workflow.packingChecks)) return;
    item.status="Packed";
    touchOrder(order,item); data.activity.unshift({text:`Packed ${item.productName}`,time:"Just now"}); saveData(); renderOrderWorkspace(order,item.id);
  }

  function updateShippingCheck(orderId,key,checked) {
    const order=data.orders.find(o => o.id===orderId);
    if (!order) return;
    order.shipping[key]=checked;
    touchOrder(order); saveData(); renderOrderWorkspace(order);
  }

  function markReadyMail(orderId) {
    const order=data.orders.find(o => o.id===orderId);
    const allPacked=order.items.every(i => ["Packed","Ready to Mail","Completed"].includes(i.status));
    const shippingDone=Object.values(order.shipping).every(Boolean);
    if (!allPacked || !shippingDone) return showToast("Complete all packing and shipping steps first.");
    order.items.forEach(i => { if (i.status!=="Completed") i.status="Ready to Mail"; });
    touchOrder(order); data.activity.unshift({text:`Order for ${order.customerName} is ready to mail`,time:"Just now"}); saveData(); renderOrderWorkspace(order);
  }

  function printCareSheet() {
    const popup=window.open("","_blank","width=800,height=900");
    if (!popup) return showToast("Please allow pop-ups to print the care sheet.");
    popup.document.write(`<!doctype html><html><head><title>Simply Ummiby Care Instructions</title><style>body{font-family:Arial,sans-serif;color:#333;padding:60px;line-height:1.6}.sheet{border:3px solid #d96d7b;border-radius:24px;padding:42px;max-width:650px;margin:auto}h1{color:#9f3d4d;margin-top:0}.note{margin-top:32px;font-size:12px;color:#777}@media print{body{padding:0}.sheet{border-width:2px}}</style></head><body><section class="sheet"><h1>Simply Ummiby</h1><h2>Care Instructions</h2><p>Thank you for supporting handmade work.</p><p><strong>Gentle care:</strong> Spot clean as needed and allow the item to air dry. Handle the handmade fibers and finished details gently.</p><p><strong>Macramé:</strong> If the cord shifts during use or shipping, gently straighten and smooth it by hand.</p><p><strong>Crochet:</strong> Reshape gently after cleaning and allow it to dry flat when appropriate.</p><p class="note">Temporary Version 0.3 care sheet. Replace with your final shop PDF when the Resources module is completed.</p></section><script>window.onload=()=>window.print();<\/script></body></html>`);
    popup.document.close();
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
      button.addEventListener("click",() => { hideModal(); action.onClick?.(); });
      actionsEl.appendChild(button);
    });
    document.getElementById("modalBackdrop").classList.remove("hidden");
  }
  function hideModal(){ document.getElementById("modalBackdrop").classList.add("hidden"); }

  function resetItem(orderId,itemId) {
    const order=data.orders.find(o => o.id===orderId);
    const item=order?.items.find(i => i.id===itemId);
    showModal("Reset this item?",`<p>This returns <strong>${escapeHTML(item.productName)}</strong> to New and clears its workflow and notes. Inventory is not affected in Version 0.3.2.</p>`,[
      {label:"Keep Progress"},
      {label:"Reset Item",kind:"danger",onClick:() => {
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
        order.items=order.items.map((item,index) => migrateItem({id:item.id,productId:item.productId,productName:item.productName,color:item.color,status:"New"},index));
        order.shipping={careSheetPrinted:false,packingSlipPrinted:false,shippoOpened:false,labelAttached:false,companyStickerAttached:false,mailerSealed:false};
        touchOrder(order); data.activity.unshift({text:`Reset order for ${order.customerName}`,time:"Just now"}); saveData(); renderOrderWorkspace(order);
      }}
    ]);
  }

  function cancelOrder(orderId) {
    const order=data.orders.find(o => o.id===orderId);
    showModal("Cancel this order?",`<p>This removes <strong>${escapeHTML(order.customerName)} · Etsy #${escapeHTML(order.etsyOrderNumber)}</strong> from the Workshop.</p>`,[
      {label:"Keep Order"},
      {label:"Cancel Order",kind:"danger",onClick:() => { data.orders=data.orders.filter(o => o.id!==orderId); data.activity.unshift({text:`Cancelled order for ${order.customerName}`,time:"Just now"}); saveData(); showView("workshop"); showToast("Order cancelled."); }}
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
    if (action==="open-recipe") openRecipe(button.dataset.recipeId);
    if (action==="recipe-focus") renderRecipeFocus(button.dataset.recipeId);
    if (action==="print-recipe") printRecipe(button.dataset.recipeId);
    if (action==="open-item-recipe") openRecipe(button.dataset.recipeId,orderId,itemId);
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
    if (action==="fulfillment") selectFulfillment(orderId,itemId,el.value);
    if (action==="material-status") updateMaterialStatus(orderId,itemId,el.dataset.materialId,el.value);
    if (action==="manufacturing-check") updateManufacturingCheck(orderId,itemId,key,el.checked);
    if (action==="packing-check") updatePackingCheck(orderId,itemId,index,el.checked);
    if (action==="shipping-check") updateShippingCheck(orderId,key,el.checked);
    if (action==="recipe-stage-check") { const order=data.orders.find(o=>o.id===orderId); const item=order?.items.find(i=>i.id===itemId); if(item){ item.recipeStageChecks ||= {}; item.recipeStageChecks[el.dataset.stageId]=el.checked; touchOrder(order,item); saveData(); openRecipe(item.productId,orderId,itemId); } }
  });

  document.addEventListener("input",event => {
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