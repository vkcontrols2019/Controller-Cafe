/**
 * CraftMatrix Pro Sub-Recipe Master Module
 * Manages kitchen & bar prep items, semi-finished goods, batch yields, cost rollups & batch cooking.
 */

import { db, CATEGORIES } from '../store/db.js';
import { formatCurrency, formatNumber, showToast, openModal, closeModal, generateId, playSound } from '../utils/helpers.js';
import { UOM_DEFINITIONS, calculateIngredientCost, convertUom } from '../store/uom.js';

let selectedSubRecipeId = null;
let currentSubCategoryFilter = 'all';
let searchQuery = '';

export function initSubRecipesModule() {
  renderSubCategoryFilters();
  renderSubRecipeList();
  setupEventListeners();

  const subRecipes = db.getSubRecipes();
  if (subRecipes.length > 0 && !selectedSubRecipeId) {
    selectedSubRecipeId = subRecipes[0].id;
  }
  renderSubRecipeDetail(selectedSubRecipeId);
}

function renderSubCategoryFilters() {
  const container = document.getElementById('subrecipe-category-filters');
  if (!container) return;

  const categories = [
    { id: 'all', label: 'All Prep Items', icon: '🥣' },
    { id: CATEGORIES.LIQUOR, label: 'Bar & Cocktail Preps', icon: '🍸' },
    { id: CATEGORIES.FOOD, label: 'Kitchen & Sauces', icon: '🍲' },
    { id: CATEGORIES.NAB, label: 'Coffee & Syrups', icon: '☕' }
  ];

  container.innerHTML = categories.map(cat => `
    <button class="filter-tab ${currentSubCategoryFilter === cat.id ? 'active' : ''}" data-cat="${cat.id}">
      <span>${cat.icon}</span>
      <span>${cat.label}</span>
    </button>
  `).join('');

  container.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentSubCategoryFilter = btn.dataset.cat;
      renderSubCategoryFilters();
      renderSubRecipeList();
    });
  });
}

export function renderSubRecipeList() {
  const container = document.getElementById('subrecipe-list-container');
  if (!container) return;

  let subRecipes = db.getSubRecipes(currentSubCategoryFilter);

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    subRecipes = subRecipes.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.sku && s.sku.toLowerCase().includes(q)) ||
      (s.allergens && s.allergens.some(a => a.toLowerCase().includes(q)))
    );
  }

  if (subRecipes.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">🥣</div>
        <div>No sub-recipes found matching filters.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = subRecipes.map(sub => {
    const batchCost = computeSubRecipeBatchCost(sub);
    const unitCost = sub.yieldQty > 0 ? batchCost / sub.yieldQty : 0;
    const isSelected = sub.id === selectedSubRecipeId;

    return `
      <div class="card glass-panel glass-panel-hover subrecipe-item-card ${isSelected ? 'active-recipe' : ''}" 
           data-id="${sub.id}" 
           style="margin-bottom: 0.75rem; padding: 1rem; cursor: pointer; border-left: ${isSelected ? '4px solid var(--accent-secondary)' : '1px solid var(--border-subtle)'};">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">${sub.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem; display: flex; gap: 0.5rem; align-items: center;">
              <span class="mono-font">${sub.sku || 'SUB'}</span>
              <span>•</span>
              <span>⏱️ ${sub.prepTimeMins || 15}m prep</span>
              <span>•</span>
              <span>${sub.ingredients?.length || 0} Ingredients</span>
            </div>
          </div>
          <span class="badge badge-info" style="font-size: 0.65rem;">
            ${(sub.yieldQty || 1)} ${sub.yieldUom || 'units'}
          </span>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; font-size: 0.85rem;">
          <span style="color: var(--text-secondary);">Batch Cost: <strong class="mono-font" style="color: var(--text-primary);">${formatCurrency(batchCost)}</strong></span>
          <span style="color: var(--text-secondary);">Unit Cost: <strong class="mono-font" style="color: var(--accent-secondary);">${formatCurrency(unitCost)} / ${sub.yieldUom}</strong></span>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.subrecipe-item-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedSubRecipeId = card.dataset.id;
      renderSubRecipeList();
      renderSubRecipeDetail(selectedSubRecipeId);
    });
  });
}

export function computeSubRecipeBatchCost(subRecipe) {
  if (!subRecipe || !subRecipe.ingredients) return 0;

  let totalCost = 0;
  subRecipe.ingredients.forEach(ing => {
    if (ing.itemId) {
      const item = db.getItemById(ing.itemId);
      if (item) {
        const cost = calculateIngredientCost(item.packageCost, item.packageUom, ing.qty, ing.uom, 100 - (ing.yieldLoss || 0));
        totalCost += cost;
      }
    } else if (ing.subRecipeId) {
      const nestedSub = db.getSubRecipeById(ing.subRecipeId);
      if (nestedSub) {
        const nestedTotal = computeSubRecipeBatchCost(nestedSub);
        const unitCost = nestedTotal / (nestedSub.yieldQty || 1);
        totalCost += unitCost * ing.qty;
      }
    }
  });

  return totalCost;
}

export function renderSubRecipeDetail(subRecipeId) {
  const container = document.getElementById('subrecipe-detail-container');
  if (!container) return;

  const sub = db.getSubRecipeById(subRecipeId);
  if (!sub) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem; color: var(--text-muted);">
        Select a sub-recipe from the list to view formulation, batch yield, and unit prep costing.
      </div>
    `;
    return;
  }

  const batchCost = computeSubRecipeBatchCost(sub);
  const unitCost = sub.yieldQty > 0 ? batchCost / sub.yieldQty : 0;
  const allergenList = (sub.allergens && sub.allergens.length > 0) ? sub.allergens : ['None'];

  container.innerHTML = `
    <div class="card" style="border: 1px solid var(--border-strong);">
      <div class="card-header" style="flex-wrap: wrap;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <h2 style="font-size: 1.35rem;">${sub.name}</h2>
            <span class="mono-font badge badge-secondary">${sub.sku || 'SUB-SKU'}</span>
            <span class="badge badge-${sub.category}">${sub.category.toUpperCase()} PREP</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.3rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <span>📍 Storage: <strong>${sub.storageZone || 'Prep Cooler (36°F)'}</strong></span>
            <span>⏱️ Prep Time: <strong>${sub.prepTimeMins || 15} minutes</strong></span>
            <span>⏳ Shelf Life: <strong>${sub.shelfLifeDays || 14} days</strong></span>
          </div>
        </div>

        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-primary btn-sm" id="btn-cook-subrecipe" style="background: linear-gradient(135deg, #06b6d4, #0891b2);">
            ⚡ Cook / Prep Batch
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-edit-subrecipe">✏️ Edit</button>
          <button class="btn btn-secondary btn-sm" id="btn-delete-subrecipe" style="color: var(--status-danger);">🗑️ Delete</button>
        </div>
      </div>

      <div class="card-body">
        <!-- KPI Strip -->
        <div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 1.5rem;">
          <div class="kpi-card" style="padding: 1rem;">
            <div class="kpi-title">Batch Total Cost</div>
            <div class="kpi-value mono-font" style="font-size: 1.35rem; color: var(--text-primary);">${formatCurrency(batchCost)}</div>
            <div class="kpi-subtext">Sum of raw ingredients</div>
          </div>

          <div class="kpi-card" style="padding: 1rem;">
            <div class="kpi-title">Batch Standard Yield</div>
            <div class="kpi-value mono-font" style="font-size: 1.35rem; color: var(--accent-secondary);">${sub.yieldQty} ${sub.yieldUom}</div>
            <div class="kpi-subtext">Output per preparation</div>
          </div>

          <div class="kpi-card" style="padding: 1rem;">
            <div class="kpi-title">Unit Prep Cost</div>
            <div class="kpi-value mono-font" style="font-size: 1.35rem; color: var(--accent-primary-light);">${formatCurrency(unitCost)}</div>
            <div class="kpi-subtext">Cost per ${sub.yieldUom}</div>
          </div>

          <div class="kpi-card" style="padding: 1rem;">
            <div class="kpi-title">Allergens Declared</div>
            <div style="display: flex; gap: 0.3rem; flex-wrap: wrap; margin-top: 0.35rem;">
              ${allergenList.map(a => `<span class="badge ${a === 'None' ? 'badge-success' : 'badge-warning'}" style="font-size: 0.7rem;">${a}</span>`).join('')}
            </div>
          </div>
        </div>

        <!-- BOM Ingredients Table -->
        <div style="font-weight: 700; font-size: 1rem; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
          <span>Sub-Recipe Ingredients (Bill of Materials)</span>
          <span class="mono-font" style="font-size: 0.85rem; color: var(--accent-secondary);">1 Standard Batch (${sub.yieldQty} ${sub.yieldUom})</span>
        </div>

        <div class="table-responsive" style="margin-bottom: 1.5rem;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ingredient / Raw Material</th>
                <th>Quantity</th>
                <th>Yield Loss %</th>
                <th>Current Stock</th>
                <th>Item Unit Cost</th>
                <th style="text-align: right;">BOM Cost</th>
              </tr>
            </thead>
            <tbody>
              ${(sub.ingredients || []).map(ing => {
                let name = 'Unknown Item';
                let stockText = 'N/A';
                let unitCostText = '';
                let lineCost = 0;

                if (ing.itemId) {
                  const item = db.getItemById(ing.itemId);
                  if (item) {
                    name = item.name;
                    stockText = `${formatNumber(item.currentStock, 1)} ${item.packageUom}`;
                    unitCostText = `${formatCurrency(item.packageCost)} / ${item.packageUom}`;
                    lineCost = calculateIngredientCost(item.packageCost, item.packageUom, ing.qty, ing.uom, 100 - (ing.yieldLoss || 0));
                  }
                } else if (ing.subRecipeId) {
                  const nestedSub = db.getSubRecipeById(ing.subRecipeId);
                  if (nestedSub) {
                    name = `🥣 [Sub-Recipe] ${nestedSub.name}`;
                    const nestedCost = computeSubRecipeBatchCost(nestedSub);
                    const nUnitCost = nestedCost / (nestedSub.yieldQty || 1);
                    stockText = 'Prep On-Demand';
                    unitCostText = `${formatCurrency(nUnitCost)} / ${nestedSub.yieldUom}`;
                    lineCost = nUnitCost * ing.qty;
                  }
                }

                return `
                  <tr>
                    <td style="font-weight: 600;">${name}</td>
                    <td class="mono-font">${formatNumber(ing.qty, 2)} ${ing.uom}</td>
                    <td>${ing.yieldLoss || 0}%</td>
                    <td style="color: var(--text-secondary);">${stockText}</td>
                    <td class="mono-font" style="font-size: 0.8rem; color: var(--text-muted);">${unitCostText}</td>
                    <td class="mono-font" style="font-weight: 600; text-align: right;">${formatCurrency(lineCost)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Preparation Instructions -->
        ${sub.instructions ? `
          <div style="background: rgba(15, 23, 42, 0.6); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <div style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--accent-secondary); margin-bottom: 0.5rem;">
              Standard Operating Procedure (SOP) & Prep Instructions
            </div>
            <div style="font-size: 0.9rem; line-height: 1.6; color: var(--text-secondary); white-space: pre-line;">
              ${sub.instructions}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // Attach button handlers
  const cookBtn = document.getElementById('btn-cook-subrecipe');
  if (cookBtn) cookBtn.addEventListener('click', () => openBatchPrepModal(sub.id));

  const editBtn = document.getElementById('btn-edit-subrecipe');
  if (editBtn) editBtn.addEventListener('click', () => openSubRecipeFormModal(sub.id));

  const deleteBtn = document.getElementById('btn-delete-subrecipe');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (confirm(`Delete sub-recipe "${sub.name}"?`)) {
        db.deleteSubRecipe(sub.id);
        selectedSubRecipeId = null;
        renderSubRecipeList();
        renderSubRecipeDetail(null);
        showToast('Sub-recipe deleted', 'info');
      }
    });
  }
}

export function openBatchPrepModal(subRecipeId) {
  const sub = db.getSubRecipeById(subRecipeId);
  if (!sub) return;

  const modal = document.getElementById('batch-prep-modal');
  const body = document.getElementById('batch-prep-content');
  if (!modal || !body) return;

  body.innerHTML = `
    <div style="margin-bottom: 1.25rem;">
      <div style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">${sub.name}</div>
      <div style="font-size: 0.8rem; color: var(--text-muted);">
        Standard Yield per batch: <strong>${sub.yieldQty} ${sub.yieldUom}</strong>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Batch Multiplier (How many batches to prep?)</label>
      <div style="display: flex; gap: 0.5rem; align-items: center;">
        <input type="number" min="0.5" step="0.5" class="form-input" id="prep-batch-count" value="1" style="width: 100px; text-align: center; font-size: 1.1rem; font-weight: 700;">
        <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('prep-batch-count').value = '1'; updatePrepSummary();">1x</button>
        <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('prep-batch-count').value = '2'; updatePrepSummary();">2x</button>
        <button type="button" class="btn btn-secondary btn-sm" onclick="document.getElementById('prep-batch-count').value = '5'; updatePrepSummary();">5x</button>
      </div>
    </div>

    <div style="background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.25); border-radius: var(--radius-md); padding: 1rem; margin-top: 1rem;">
      <div style="font-size: 0.85rem; font-weight: 700; color: var(--accent-secondary); margin-bottom: 0.5rem;">
        Inventory Depletion Preview
      </div>
      <div id="prep-depletion-preview" style="font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.4rem;">
        <!-- Dynamically rendered -->
      </div>
    </div>
  `;

  function updatePrepSummary() {
    const mult = parseFloat(document.getElementById('prep-batch-count').value) || 1;
    const preview = document.getElementById('prep-depletion-preview');
    if (!preview) return;

    preview.innerHTML = (sub.ingredients || []).map(ing => {
      if (ing.itemId) {
        const item = db.getItemById(ing.itemId);
        const needed = (ing.qty * mult);
        const inStock = item ? item.currentStock : 0;
        const isSufficient = inStock >= needed;

        return `
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>${item ? item.name : 'Unknown'}: <strong>${needed.toFixed(2)} ${ing.uom}</strong></span>
            <span style="color: ${isSufficient ? 'var(--status-success)' : 'var(--status-danger)'}; font-weight: 600;">
              ${isSufficient ? '✓ In Stock' : `⚠️ Short (Have: ${inStock} ${item ? item.packageUom : ''})`}
            </span>
          </div>
        `;
      }
      return '';
    }).join('');
  }

  document.getElementById('prep-batch-count').addEventListener('input', updatePrepSummary);
  updatePrepSummary();

  openModal('batch-prep-modal');

  const confirmBtn = document.getElementById('btn-confirm-prep');
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      const count = parseFloat(document.getElementById('prep-batch-count').value) || 1;
      const res = db.prepSubRecipeBatch(sub.id, count);
      if (res.success) {
        playSound('success');
        closeModal('batch-prep-modal');
        showToast(`Prepped ${res.multiplier}x batch (${res.totalYield} ${sub.yieldUom}) of "${sub.name}"! Raw ingredients depleted from Item Master.`, 'success');
        renderSubRecipeDetail(sub.id);
      } else {
        showToast(res.message || 'Prep failed', 'error');
      }
    };
  }
}

export function openSubRecipeFormModal(subRecipeId = null) {
  const isEdit = !!subRecipeId;
  const sub = isEdit ? db.getSubRecipeById(subRecipeId) : {
    id: generateId('sub'),
    sku: `SUB-${Date.now().toString().slice(-4)}`,
    name: '',
    category: currentSubCategoryFilter !== 'all' ? currentSubCategoryFilter : CATEGORIES.LIQUOR,
    yieldQty: 32,
    yieldUom: 'fl_oz',
    prepTimeMins: 20,
    shelfLifeDays: 14,
    storageZone: 'Walk-In Cooler (36°F)',
    allergens: ['None'],
    instructions: '',
    ingredients: [
      { itemId: 'item_sugar_granulated', qty: 1.0, uom: 'lb', yieldLoss: 0 }
    ]
  };

  const modal = document.getElementById('subrecipe-form-modal');
  const form = document.getElementById('subrecipe-form');
  if (!modal || !form) return;

  const allItems = db.getItems();
  const allSubRecipes = db.getSubRecipes().filter(s => s.id !== sub.id);

  form.innerHTML = `
    <div class="form-grid-2">
      <div class="form-group">
        <label class="form-label">Sub-Recipe Name *</label>
        <input type="text" class="form-input" id="sub-form-name" value="${sub.name || ''}" required placeholder="e.g. Rich Simple Syrup (2:1)">
      </div>
      <div class="form-group">
        <label class="form-label">Code / SKU *</label>
        <input type="text" class="form-input" id="sub-form-sku" value="${sub.sku || ''}" required>
      </div>
    </div>

    <div class="form-grid-3">
      <div class="form-group">
        <label class="form-label">Category</label>
        <select class="form-select" id="sub-form-category">
          <option value="${CATEGORIES.LIQUOR}" ${sub.category === CATEGORIES.LIQUOR ? 'selected' : ''}>🍸 Bar & Cocktail Prep</option>
          <option value="${CATEGORIES.FOOD}" ${sub.category === CATEGORIES.FOOD ? 'selected' : ''}>🍲 Kitchen & Sauces</option>
          <option value="${CATEGORIES.NAB}" ${sub.category === CATEGORIES.NAB ? 'selected' : ''}>☕ Coffee & Syrups</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Batch Yield Quantity *</label>
        <input type="number" step="0.5" class="form-input" id="sub-form-yield-qty" value="${sub.yieldQty || 1}">
      </div>
      <div class="form-group">
        <label class="form-label">Yield UOM *</label>
        <select class="form-select" id="sub-form-yield-uom">
          ${Object.entries(UOM_DEFINITIONS).map(([key, def]) => `
            <option value="${key}" ${sub.yieldUom === key ? 'selected' : ''}>${def.label}</option>
          `).join('')}
        </select>
      </div>
    </div>

    <div class="form-grid-3">
      <div class="form-group">
        <label class="form-label">Prep Time (Minutes)</label>
        <input type="number" step="5" class="form-input" id="sub-form-preptime" value="${sub.prepTimeMins || 15}">
      </div>
      <div class="form-group">
        <label class="form-label">Shelf Life (Days)</label>
        <input type="number" step="1" class="form-input" id="sub-form-shelflife" value="${sub.shelfLifeDays || 14}">
      </div>
      <div class="form-group">
        <label class="form-label">Storage Station / Temp</label>
        <input type="text" class="form-input" id="sub-form-storage" value="${sub.storageZone || 'Walk-In Cooler (36°F)'}">
      </div>
    </div>

    <div style="margin: 1.25rem 0 0.5rem; display: flex; justify-content: space-between; align-items: center;">
      <span style="font-weight: 700; font-size: 0.9rem; text-transform: uppercase; color: var(--accent-secondary);">Raw Ingredients &amp; Sub-Components (BOM)</span>
      <button type="button" class="btn btn-secondary btn-sm" id="btn-add-sub-ing">+ Add Ingredient</button>
    </div>

    <div id="sub-ingredients-rows" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 200px; overflow-y: auto; padding-right: 0.3rem;">
      ${(sub.ingredients || []).map((ing, idx) => renderSubIngRow(ing, idx, allItems, allSubRecipes)).join('')}
    </div>

    <div class="form-group" style="margin-top: 1rem;">
      <label class="form-label">Step-by-Step Preparation Method (SOP)</label>
      <textarea class="form-textarea" id="sub-form-instructions" rows="3" placeholder="Describe boiling, blending, emulsifying, chilling steps...">${sub.instructions || ''}</textarea>
    </div>
  `;

  openModal('subrecipe-form-modal');

  const addBtn = document.getElementById('btn-add-sub-ing');
  if (addBtn) {
    addBtn.onclick = () => {
      const container = document.getElementById('sub-ingredients-rows');
      const idx = container.children.length;
      const dummy = document.createElement('div');
      dummy.innerHTML = renderSubIngRow({ itemId: allItems[0]?.id || '', qty: 1, uom: 'lb', yieldLoss: 0 }, idx, allItems, allSubRecipes);
      container.appendChild(dummy.firstElementChild);
      attachSubIngRowListeners();
    };
  }

  attachSubIngRowListeners();

  const saveBtn = document.getElementById('btn-save-subrecipe');
  if (saveBtn) {
    saveBtn.onclick = () => {
      const name = document.getElementById('sub-form-name').value.trim();
      const sku = document.getElementById('sub-form-sku').value.trim();
      if (!name || !sku) {
        showToast('Please fill in Sub-Recipe Name and Code', 'error');
        return;
      }

      const rows = document.querySelectorAll('.sub-ing-row');
      const ingredients = [];
      rows.forEach(row => {
        const val = row.querySelector('.sub-ing-select').value;
        const qty = parseFloat(row.querySelector('.sub-ing-qty').value) || 0;
        const uom = row.querySelector('.sub-ing-uom').value;
        const loss = parseFloat(row.querySelector('.sub-ing-loss').value) || 0;

        if (val.startsWith('item_')) {
          ingredients.push({ itemId: val, qty, uom, yieldLoss: loss });
        } else if (val.startsWith('sub_')) {
          ingredients.push({ subRecipeId: val, qty, uom, yieldLoss: loss });
        }
      });

      const updatedSub = {
        ...sub,
        name,
        sku,
        category: document.getElementById('sub-form-category').value,
        yieldQty: parseFloat(document.getElementById('sub-form-yield-qty').value) || 1,
        yieldUom: document.getElementById('sub-form-yield-uom').value,
        prepTimeMins: parseInt(document.getElementById('sub-form-preptime').value) || 15,
        shelfLifeDays: parseInt(document.getElementById('sub-form-shelflife').value) || 14,
        storageZone: document.getElementById('sub-form-storage').value.trim(),
        instructions: document.getElementById('sub-form-instructions').value.trim(),
        ingredients
      };

      db.saveSubRecipe(updatedSub);
      selectedSubRecipeId = updatedSub.id;
      closeModal('subrecipe-form-modal');
      renderSubRecipeList();
      renderSubRecipeDetail(selectedSubRecipeId);
      showToast(`Sub-Recipe "${updatedSub.name}" saved!`, 'success');
    };
  }
}

function renderSubIngRow(ing, idx, allItems, allSubRecipes) {
  const currentVal = ing.itemId || ing.subRecipeId || '';

  return `
    <div class="sub-ing-row" style="display: grid; grid-template-columns: 2fr 1fr 1.2fr 1fr 36px; gap: 0.5rem; align-items: center; background: var(--bg-surface); padding: 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
      <select class="form-select sub-ing-select" style="font-size: 0.8rem; padding: 0.4rem;">
        <optgroup label="📦 Raw Materials (Item Master)">
          ${allItems.map(item => `
            <option value="${item.id}" ${currentVal === item.id ? 'selected' : ''}>${item.name} (${item.packageUom})</option>
          `).join('')}
        </optgroup>
        ${allSubRecipes.length > 0 ? `
          <optgroup label="🥣 Other Sub-Recipes">
            ${allSubRecipes.map(s => `
              <option value="${s.id}" ${currentVal === s.id ? 'selected' : ''}>${s.name} (${s.yieldUom})</option>
            `).join('')}
          </optgroup>
        ` : ''}
      </select>

      <input type="number" step="0.1" class="form-input sub-ing-qty" value="${ing.qty || 1}" style="font-size: 0.8rem; padding: 0.4rem;" placeholder="Qty">

      <select class="form-select sub-ing-uom" style="font-size: 0.8rem; padding: 0.4rem;">
        ${Object.entries(UOM_DEFINITIONS).map(([key, def]) => `
          <option value="${key}" ${ing.uom === key ? 'selected' : ''}>${def.label}</option>
        `).join('')}
      </select>

      <input type="number" step="1" class="form-input sub-ing-loss" value="${ing.yieldLoss || 0}" style="font-size: 0.8rem; padding: 0.4rem;" placeholder="Loss %">

      <button type="button" class="btn btn-secondary btn-icon-only btn-remove-sub-ing" style="color: var(--status-danger); padding: 0.3rem;">✕</button>
    </div>
  `;
}

function attachSubIngRowListeners() {
  document.querySelectorAll('.btn-remove-sub-ing').forEach(btn => {
    btn.onclick = () => {
      const row = btn.closest('.sub-ing-row');
      if (row) row.remove();
    };
  });
}

function setupEventListeners() {
  const searchInput = document.getElementById('subrecipe-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderSubRecipeList();
    });
  }

  const addBtn = document.getElementById('btn-create-subrecipe');
  if (addBtn) {
    addBtn.addEventListener('click', () => openSubRecipeFormModal(null));
  }

  db.subscribe(() => {
    renderSubRecipeList();
    if (selectedSubRecipeId) renderSubRecipeDetail(selectedSubRecipeId);
  });
}
