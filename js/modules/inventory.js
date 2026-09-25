/**
 * CraftMatrix Pro Item Master Module
 * Comprehensive Raw Materials & Inventory Catalog with multi-unit conversion,
 * where-used dependency explorer, par deficits, and stock adjustments.
 */

import { db, CATEGORIES, LOCATIONS, VENDORS } from '../store/db.js';
import { formatCurrency, formatNumber, showToast, openModal, closeModal, generateId, playSound } from '../utils/helpers.js';
import { UOM_DEFINITIONS } from '../store/uom.js';

let currentCategoryFilter = 'all';
let currentLocationFilter = 'all';
let searchQuery = '';
let onlyLowStock = false;

export function initInventoryModule() {
  renderCategoryTabs();
  renderLocationFilters();
  renderItemMasterKpis();
  renderInventoryTable();
  setupEventListeners();
}

function renderCategoryTabs() {
  const container = document.getElementById('inventory-category-filters');
  if (!container) return;

  const categories = [
    { id: 'all', label: 'All Raw Materials', icon: '📦' },
    { id: CATEGORIES.FOOD, label: 'Food & Perishables', icon: '🥩' },
    { id: CATEGORIES.LIQUOR, label: 'Liquor, Spirits & Wine', icon: '🥃' },
    { id: CATEGORIES.NAB, label: 'NAB (Non-Alcoholic)', icon: '🥤' },
    { id: CATEGORIES.TOBACCO, label: 'Tobacco & Cigars', icon: '🚬' },
    { id: CATEGORIES.BREWERY, label: 'Brewery Raw Materials', icon: '🍺' }
  ];

  container.innerHTML = categories.map(cat => `
    <button class="filter-tab ${currentCategoryFilter === cat.id ? 'active' : ''}" data-cat="${cat.id}">
      <span>${cat.icon}</span>
      <span>${cat.label}</span>
    </button>
  `).join('');

  container.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCategoryFilter = btn.dataset.cat;
      renderCategoryTabs();
      renderInventoryTable();
    });
  });
}

function renderLocationFilters() {
  const select = document.getElementById('inventory-location-filter');
  if (!select) return;

  select.innerHTML = `
    <option value="all">All Storage Locations</option>
    ${LOCATIONS.map(loc => `
      <option value="${loc.id}" ${currentLocationFilter === loc.id ? 'selected' : ''}>📍 ${loc.name}</option>
    `).join('')}
  `;

  select.addEventListener('change', (e) => {
    currentLocationFilter = e.target.value;
    renderInventoryTable();
  });
}

export function renderItemMasterKpis() {
  const items = db.getItems();
  const totalValuation = items.reduce((sum, i) => sum + ((i.currentStock || 0) * (i.packageCost || 0)), 0);
  const lowStockItems = items.filter(i => (i.currentStock || 0) <= (i.parLevel || 0));
  const outOfStockItems = items.filter(i => (i.currentStock || 0) <= 0);

  const valEl = document.getElementById('item-master-kpi-val');
  if (valEl) valEl.textContent = formatCurrency(totalValuation);

  const skusEl = document.getElementById('item-master-kpi-skus');
  if (skusEl) skusEl.textContent = items.length.toString();

  const lowEl = document.getElementById('item-master-kpi-low');
  if (lowEl) lowEl.textContent = lowStockItems.length.toString();

  const outEl = document.getElementById('item-master-kpi-out');
  if (outEl) outEl.textContent = outOfStockItems.length.toString();
}

export function renderInventoryTable() {
  const tableBody = document.getElementById('inventory-table-body');
  if (!tableBody) return;

  renderItemMasterKpis();

  let items = db.getItems(currentCategoryFilter);

  if (currentLocationFilter !== 'all') {
    items = items.filter(i => i.primaryLocationId === currentLocationFilter);
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    items = items.filter(i => 
      i.name.toLowerCase().includes(q) || 
      i.sku.toLowerCase().includes(q) || 
      (i.subCategory && i.subCategory.toLowerCase().includes(q)) ||
      (i.storageZone && i.storageZone.toLowerCase().includes(q))
    );
  }

  if (onlyLowStock) {
    items = items.filter(i => (i.currentStock || 0) <= (i.parLevel || 0));
  }

  if (items.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 3rem; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
          <div>No item master records found matching the selected filters.</div>
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = items.map(item => {
    const location = LOCATIONS.find(l => l.id === item.primaryLocationId)?.name || 'Default';
    const totalVal = (item.currentStock || 0) * (item.packageCost || 0);
    const par = item.parLevel || 1;
    const stockPercent = Math.min(100, Math.round(((item.currentStock || 0) / par) * 100));
    
    let healthClass = 'healthy';
    if (item.currentStock <= 0) healthClass = 'critical';
    else if (stockPercent < 50) healthClass = 'critical';
    else if (stockPercent < 85) healthClass = 'warning';

    const uomLabel = UOM_DEFINITIONS[item.packageUom]?.label.split(' ')[0] || item.packageUom;

    let extraTag = '';
    if (item.category === CATEGORIES.LIQUOR && item.abvPercent) {
      extraTag = `<span class="badge badge-liquor" style="font-size: 0.65rem;">${item.abvPercent}% ABV</span>`;
    } else if (item.category === CATEGORIES.TOBACCO && item.taxStampId) {
      extraTag = `<span class="badge badge-tobacco" style="font-size: 0.65rem;">Tax Stamped</span>`;
    } else if (item.category === CATEGORIES.BREWERY && item.alphaAcidPercent) {
      extraTag = `<span class="badge badge-brewery" style="font-size: 0.65rem;">${item.alphaAcidPercent}% AA</span>`;
    }

    return `
      <tr id="row_${item.id}">
        <td>
          <div style="font-weight: 600; font-size: 0.95rem;">${item.name}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted); display: flex; gap: 0.5rem; align-items: center; margin-top: 0.2rem; flex-wrap: wrap;">
            <span class="mono-font" style="color: var(--accent-primary-light);">${item.sku}</span>
            <span>•</span>
            <span>${item.subCategory || 'General'}</span>
            ${extraTag}
          </div>
        </td>
        <td>
          <span class="badge badge-${item.category}">
            ${item.category.toUpperCase()}
          </span>
        </td>
        <td>
          <div style="color: var(--text-primary); font-size: 0.85rem;">📍 ${location}</div>
          <div style="color: var(--text-muted); font-size: 0.75rem;">${item.storageZone || 'Ambient'}</div>
        </td>
        <td>
          <div style="font-weight: 700; font-family: 'JetBrains Mono'; font-size: 0.95rem;">
            ${formatNumber(item.currentStock, 1)} <span style="font-weight: 400; font-size: 0.8rem; color: var(--text-muted);">${uomLabel}</span>
          </div>
          ${item.category === CATEGORIES.LIQUOR && item.openBottleTenths !== undefined ? `
            <div style="font-size: 0.7rem; color: #c084fc;">
              Open: ${(item.openBottleTenths * 10).toFixed(0)}/10ths
            </div>
          ` : ''}
        </td>
        <td>
          <div class="stock-meter">
            <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted);">
              <span>Par: ${item.parLevel}</span>
              <span>${stockPercent}%</span>
            </div>
            <div class="stock-bar-track">
              <div class="stock-bar-fill ${healthClass}" style="width: ${stockPercent}%"></div>
            </div>
          </div>
        </td>
        <td class="mono-font" style="font-size: 0.85rem;">
          ${formatCurrency(item.packageCost)} / ${uomLabel}
        </td>
        <td class="mono-font" style="font-weight: 600; color: var(--text-primary);">
          ${formatCurrency(totalVal)}
        </td>
        <td style="text-align: right;">
          <div style="display: flex; gap: 0.35rem; justify-content: flex-end; flex-wrap: wrap;">
            <button class="btn btn-secondary btn-sm btn-adjust" data-id="${item.id}" title="Quick Stock Adjustment">
              ⚡ Adjust
            </button>
            <button class="btn btn-secondary btn-sm btn-where-used" data-id="${item.id}" title="Where-Used Dependency Explorer">
              🔍 Used In
            </button>
            <button class="btn btn-secondary btn-sm btn-edit" data-id="${item.id}" title="Edit Item Master">
              ✏️
            </button>
            <button class="btn btn-secondary btn-sm btn-delete" data-id="${item.id}" title="Delete Item" style="color: var(--status-danger);">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  // Attach button event listeners
  tableBody.querySelectorAll('.btn-adjust').forEach(btn => {
    btn.addEventListener('click', () => openStockAdjustmentModal(btn.dataset.id));
  });
  tableBody.querySelectorAll('.btn-where-used').forEach(btn => {
    btn.addEventListener('click', () => openWhereUsedModal(btn.dataset.id));
  });
  tableBody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openItemFormModal(btn.dataset.id));
  });
  tableBody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteItem(btn.dataset.id));
  });
}

function setupEventListeners() {
  const searchInput = document.getElementById('inventory-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderInventoryTable();
    });
  }

  const lowStockToggle = document.getElementById('toggle-low-stock');
  if (lowStockToggle) {
    lowStockToggle.addEventListener('change', (e) => {
      onlyLowStock = e.target.checked;
      renderInventoryTable();
    });
  }

  const addItemBtn = document.getElementById('btn-add-item');
  if (addItemBtn) {
    addItemBtn.addEventListener('click', () => openItemFormModal(null));
  }

  db.subscribe(() => {
    renderInventoryTable();
  });
}

export function openWhereUsedModal(itemId) {
  const item = db.getItemById(itemId);
  if (!item) return;

  const modal = document.getElementById('item-where-used-modal');
  const body = document.getElementById('item-where-used-content');
  if (!modal || !body) return;

  const subRecipes = db.getSubRecipes();
  const recipes = db.getRecipes();

  // Find sub-recipes consuming this item
  const consumingSubRecipes = subRecipes.filter(sub => 
    (sub.ingredients || []).some(ing => ing.itemId === item.id)
  );

  // Find finished recipes consuming this item directly
  const consumingRecipes = recipes.filter(rec =>
    (rec.ingredients || []).some(ing => ing.itemId === item.id)
  );

  body.innerHTML = `
    <div style="margin-bottom: 1.25rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <span style="font-size: 1.2rem;">📦</span>
        <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary);">${item.name}</h3>
      </div>
      <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
        SKU: <strong class="mono-font">${item.sku}</strong> • Current Stock: <strong>${formatNumber(item.currentStock, 1)} ${item.packageUom}</strong>
      </div>
    </div>

    <!-- 1. Consuming Sub-Recipes -->
    <div style="margin-bottom: 1.25rem;">
      <div style="font-weight: 700; font-size: 0.85rem; text-transform: uppercase; color: var(--accent-secondary); margin-bottom: 0.5rem;">
        🥣 Sub-Recipes (Kitchen/Bar Prep) - ${consumingSubRecipes.length} Uses
      </div>
      ${consumingSubRecipes.length === 0 ? `
        <div style="font-size: 0.85rem; color: var(--text-muted); padding: 0.5rem; background: var(--bg-surface); border-radius: var(--radius-sm);">
          Not currently used in any sub-recipes.
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 0.4rem;">
          ${consumingSubRecipes.map(sub => {
            const ing = (sub.ingredients || []).find(i => i.itemId === item.id);
            return `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.8rem; background: var(--bg-surface); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                <div>
                  <div style="font-weight: 600; font-size: 0.9rem;">${sub.name}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">Batch Yield: ${sub.yieldQty} ${sub.yieldUom}</div>
                </div>
                <div class="mono-font" style="font-size: 0.85rem; color: var(--accent-secondary);">
                  ${ing?.qty || 0} ${ing?.uom || ''} / batch
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>

    <!-- 2. Consuming Finished Dishes & Cocktails -->
    <div>
      <div style="font-weight: 700; font-size: 0.85rem; text-transform: uppercase; color: var(--accent-primary-light); margin-bottom: 0.5rem;">
        🍽️ Finished Recipe Cards - ${consumingRecipes.length} Uses
      </div>
      ${consumingRecipes.length === 0 ? `
        <div style="font-size: 0.85rem; color: var(--text-muted); padding: 0.5rem; background: var(--bg-surface); border-radius: var(--radius-sm);">
          Not directly used in any finished recipes.
        </div>
      ` : `
        <div style="display: flex; flex-direction: column; gap: 0.4rem;">
          ${consumingRecipes.map(rec => {
            const ing = (rec.ingredients || []).find(i => i.itemId === item.id);
            return `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0.8rem; background: var(--bg-surface); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                <div>
                  <div style="font-weight: 600; font-size: 0.9rem;">${rec.name}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${rec.category.toUpperCase()} • Price: ${formatCurrency(rec.menuPrice)}</div>
                </div>
                <div class="mono-font" style="font-size: 0.85rem; color: var(--accent-primary-light);">
                  ${ing?.qty || 0} ${ing?.uom || ''} / serving
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;

  openModal('item-where-used-modal');
}

export function openItemFormModal(itemId = null) {
  const modal = document.getElementById('item-form-modal');
  if (!modal) return;

  const isEdit = !!itemId;
  const item = isEdit ? db.getItemById(itemId) : {
    id: generateId('item'),
    sku: `SKU-${Date.now().toString().slice(-4)}`,
    name: '',
    category: currentCategoryFilter !== 'all' ? currentCategoryFilter : CATEGORIES.FOOD,
    subCategory: '',
    storageZone: '',
    primaryLocationId: 'loc_walkin',
    packageUom: 'lb',
    packageCost: 0,
    recipeUom: 'g',
    currentStock: 0,
    parLevel: 10,
    reorderQty: 20,
    yieldLossPercent: 0,
    shelfLifeDays: 14,
    vendorId: 'ven_sysco'
  };

  const titleEl = document.getElementById('item-modal-title');
  if (titleEl) titleEl.textContent = isEdit ? `Edit Item Master: ${item.name}` : 'Create New Item Master Record';

  const form = document.getElementById('item-form');
  if (!form) return;

  form.innerHTML = `
    <input type="hidden" id="edit-item-id" value="${item.id}">
    
    <div class="form-grid-2">
      <div class="form-group">
        <label class="form-label">Item Master Name *</label>
        <input type="text" class="form-input" id="item-name" value="${item.name || ''}" required placeholder="e.g. Maker's Mark Bourbon 750ml">
      </div>
      <div class="form-group">
        <label class="form-label">SKU / Code *</label>
        <input type="text" class="form-input" id="item-sku" value="${item.sku || ''}" required>
      </div>
    </div>

    <div class="form-grid-3">
      <div class="form-group">
        <label class="form-label">Category *</label>
        <select class="form-select" id="item-category">
          <option value="${CATEGORIES.FOOD}" ${item.category === CATEGORIES.FOOD ? 'selected' : ''}>🍗 Food & Perishables</option>
          <option value="${CATEGORIES.LIQUOR}" ${item.category === CATEGORIES.LIQUOR ? 'selected' : ''}>🥃 Liquor, Spirits & Wine</option>
          <option value="${CATEGORIES.NAB}" ${item.category === CATEGORIES.NAB ? 'selected' : ''}>🥤 NAB (Non-Alcoholic)</option>
          <option value="${CATEGORIES.TOBACCO}" ${item.category === CATEGORIES.TOBACCO ? 'selected' : ''}>🚬 Tobacco & Cigars</option>
          <option value="${CATEGORIES.BREWERY}" ${item.category === CATEGORIES.BREWERY ? 'selected' : ''}>🍺 Brewery Raw Materials</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Sub-Category</label>
        <input type="text" class="form-input" id="item-subCategory" value="${item.subCategory || ''}" placeholder="e.g. Bourbon, Hops, Meat">
      </div>
      <div class="form-group">
        <label class="form-label">Primary Storage Location</label>
        <select class="form-select" id="item-location">
          ${LOCATIONS.map(loc => `
            <option value="${loc.id}" ${item.primaryLocationId === loc.id ? 'selected' : ''}>📍 ${loc.name}</option>
          `).join('')}
        </select>
      </div>
    </div>

    <div class="form-grid-3">
      <div class="form-group">
        <label class="form-label">Purchase Package UOM *</label>
        <select class="form-select" id="item-pack-uom">
          ${Object.entries(UOM_DEFINITIONS).map(([key, def]) => `
            <option value="${key}" ${item.packageUom === key ? 'selected' : ''}>${def.label}</option>
          `).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Package Cost ($) *</label>
        <input type="number" step="0.01" class="form-input" id="item-cost" value="${item.packageCost || 0}">
      </div>
      <div class="form-group">
        <label class="form-label">Recipe Consumption UOM *</label>
        <select class="form-select" id="item-recipe-uom">
          ${Object.entries(UOM_DEFINITIONS).map(([key, def]) => `
            <option value="${key}" ${item.recipeUom === key ? 'selected' : ''}>${def.label}</option>
          `).join('')}
        </select>
      </div>
    </div>

    <div class="form-grid-3">
      <div class="form-group">
        <label class="form-label">Current Stock</label>
        <input type="number" step="0.1" class="form-input" id="item-current-stock" value="${item.currentStock || 0}">
      </div>
      <div class="form-group">
        <label class="form-label">Par Level Alert</label>
        <input type="number" step="0.1" class="form-input" id="item-par" value="${item.parLevel || 10}">
      </div>
      <div class="form-group">
        <label class="form-label">Yield Loss % (Trimming/Waste)</label>
        <input type="number" step="0.1" class="form-input" id="item-yield-loss" value="${item.yieldLossPercent || 0}" placeholder="e.g. 5%">
      </div>
    </div>

    <div class="form-grid-3">
      <div class="form-group">
        <label class="form-label">Reorder Quantity</label>
        <input type="number" step="1" class="form-input" id="item-reorder-qty" value="${item.reorderQty || 20}">
      </div>
      <div class="form-group">
        <label class="form-label">Shelf Life (Days)</label>
        <input type="number" step="1" class="form-input" id="item-shelflife" value="${item.shelfLifeDays || 14}">
      </div>
      <div class="form-group">
        <label class="form-label">Primary Vendor</label>
        <select class="form-select" id="item-vendor">
          ${VENDORS.map(v => `
            <option value="${v.id}" ${item.vendorId === v.id ? 'selected' : ''}>${v.name}</option>
          `).join('')}
        </select>
      </div>
    </div>

    <!-- Category Specific Dynamic Fields -->
    <div id="category-specific-fields" style="background: rgba(15, 23, 42, 0.6); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-top: 0.5rem;">
      <div style="font-size: 0.75rem; font-weight: 700; color: var(--accent-primary-light); text-transform: uppercase; margin-bottom: 0.75rem;">
        Category-Specific Attributes
      </div>
      <div class="form-grid-2">
        <div class="form-group" id="field-abv-container">
          <label class="form-label">ABV % / Proof</label>
          <input type="number" step="0.1" class="form-input" id="item-abv" value="${item.abvPercent || ''}" placeholder="e.g. 45.0">
        </div>
        <div class="form-group" id="field-taxstamp-container">
          <label class="form-label">Tax Stamp ID / Lot</label>
          <input type="text" class="form-input" id="item-tax-stamp" value="${item.taxStampId || ''}" placeholder="e.g. STAMP-2026-NY-991">
        </div>
      </div>
    </div>
  `;

  openModal('item-form-modal');

  const saveBtn = document.getElementById('btn-save-item');
  if (saveBtn) {
    saveBtn.onclick = () => {
      const name = document.getElementById('item-name').value.trim();
      const sku = document.getElementById('item-sku').value.trim();
      if (!name || !sku) {
        showToast('Please fill in Item Name and SKU', 'error');
        return;
      }

      const updatedItem = {
        ...item,
        name,
        sku,
        category: document.getElementById('item-category').value,
        subCategory: document.getElementById('item-subCategory').value.trim(),
        primaryLocationId: document.getElementById('item-location').value,
        packageUom: document.getElementById('item-pack-uom').value,
        packageCost: parseFloat(document.getElementById('item-cost').value) || 0,
        recipeUom: document.getElementById('item-recipe-uom').value,
        currentStock: parseFloat(document.getElementById('item-current-stock').value) || 0,
        parLevel: parseFloat(document.getElementById('item-par').value) || 0,
        yieldLossPercent: parseFloat(document.getElementById('item-yield-loss').value) || 0,
        reorderQty: parseFloat(document.getElementById('item-reorder-qty').value) || 10,
        shelfLifeDays: parseInt(document.getElementById('item-shelflife').value) || 14,
        vendorId: document.getElementById('item-vendor').value,
        abvPercent: parseFloat(document.getElementById('item-abv')?.value) || undefined,
        taxStampId: document.getElementById('item-tax-stamp')?.value.trim() || undefined
      };

      db.saveItem(updatedItem);
      closeModal('item-form-modal');
      showToast(`Item "${updatedItem.name}" saved to Item Master!`, 'success');
    };
  }
}

export function openStockAdjustmentModal(itemId) {
  const item = db.getItemById(itemId);
  if (!item) return;

  const modal = document.getElementById('stock-adjust-modal');
  if (!modal) return;

  const content = document.getElementById('stock-adjust-content');
  if (!content) return;

  const isLiquor = item.category === CATEGORIES.LIQUOR;

  content.innerHTML = `
    <div style="margin-bottom: 1.25rem;">
      <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">${item.name}</div>
      <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
        Current Stock: <strong>${formatNumber(item.currentStock, 2)} ${item.packageUom}</strong>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Adjustment Reason Code</label>
      <select class="form-select" id="adjust-type">
        <option value="CYCLE_COUNT">Cycle Count (Physical Inventory Audit)</option>
        <option value="RECEIVE">Receive Delivery (New Stock)</option>
        <option value="WASTE_BREAKAGE">Waste / Spoilage / Breakage</option>
        <option value="BAR_TRANSFER">Location Stock Transfer</option>
      </select>
    </div>

    <div class="form-group">
      <label class="form-label">Adjustment Quantity (+ to add, - to deduct, or new absolute count)</label>
      <div style="display: flex; gap: 0.5rem;">
        <input type="number" step="0.1" class="form-input" id="adjust-qty" value="${item.currentStock}" placeholder="New count or delta">
      </div>
    </div>

    ${isLiquor ? `
      <div class="form-group" style="background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.2); padding: 0.85rem; border-radius: var(--radius-md);">
        <label class="form-label" style="color: #c084fc;">Open Bottle Tenths Slider (0.0 to 1.0)</label>
        <div class="tenths-slider-container">
          <input type="range" min="0" max="1" step="0.1" value="${item.openBottleTenths || 0.5}" class="tenths-slider" id="adjust-tenths-slider">
          <div class="tenths-display" id="adjust-tenths-val">${((item.openBottleTenths || 0.5) * 10).toFixed(0)}/10</div>
        </div>
      </div>
    ` : ''}

    <div class="form-group">
      <label class="form-label">Notes / Justification</label>
      <input type="text" class="form-input" id="adjust-notes" placeholder="e.g. End of shift audit, broken bottle in speed rail">
    </div>
  `;

  if (isLiquor) {
    const slider = document.getElementById('adjust-tenths-slider');
    const display = document.getElementById('adjust-tenths-val');
    slider.addEventListener('input', () => {
      display.textContent = `${(parseFloat(slider.value) * 10).toFixed(0)}/10`;
    });
  }

  openModal('stock-adjust-modal');

  const saveBtn = document.getElementById('btn-save-adjust');
  if (saveBtn) {
    saveBtn.onclick = () => {
      const newStock = parseFloat(document.getElementById('adjust-qty').value);
      const adjustType = document.getElementById('adjust-type').value;
      const notes = document.getElementById('adjust-notes').value.trim();
      const tenths = isLiquor ? parseFloat(document.getElementById('adjust-tenths-slider').value) : undefined;

      const delta = newStock - item.currentStock;

      item.currentStock = newStock;
      if (tenths !== undefined) item.openBottleTenths = tenths;

      db.saveItem(item);
      db.recordTransaction({
        itemId: item.id,
        itemName: item.name,
        type: adjustType,
        deltaQty: delta,
        newStockQty: newStock,
        notes: notes || `Manual stock adjustment (${adjustType})`
      });

      closeModal('stock-adjust-modal');
      showToast(`Stock updated for ${item.name}`, 'success');
      
      const row = document.getElementById(`row_${item.id}`);
      if (row) {
        row.classList.add(delta >= 0 ? 'row-received' : 'row-depleted');
        setTimeout(() => row.classList.remove('row-received', 'row-depleted'), 1000);
      }
    };
  }
}

function handleDeleteItem(itemId) {
  const item = db.getItemById(itemId);
  if (!item) return;

  if (confirm(`Are you sure you want to delete "${item.name}" from Item Master?`)) {
    db.deleteItem(itemId);
    showToast(`Deleted ${item.name} from Item Master`, 'info');
  }
}
