/**
 * CraftMatrix Pro Recipe Card Studio Module
 * Comprehensive Culinary & Bar Recipe Spec Cards with portion costing,
 * target margins, allergen tracking, banquet scaling, and printable kitchen sheets.
 */

import { db, CATEGORIES } from '../store/db.js';
import { formatCurrency, formatNumber, showToast, openModal, closeModal, generateId } from '../utils/helpers.js';
import { UOM_DEFINITIONS, calculateIngredientCost, convertUom } from '../store/uom.js';

let selectedRecipeId = null;
let currentRecipeCategory = 'all';
let scaleFactor = 1;
let recipeSearchQuery = '';

export function initRecipesModule() {
  renderRecipeCategoryFilters();
  renderRecipeList();
  setupEventListeners();

  const recipes = db.getRecipes();
  if (recipes.length > 0 && !selectedRecipeId) {
    selectedRecipeId = recipes[0].id;
  }
  renderRecipeDetail(selectedRecipeId);
}

function renderRecipeCategoryFilters() {
  const container = document.getElementById('recipe-category-filters');
  if (!container) return;

  const categories = [
    { id: 'all', label: 'All Recipe Cards', icon: '📖' },
    { id: CATEGORIES.LIQUOR, label: 'Cocktails & Spirits', icon: '🍸' },
    { id: CATEGORIES.FOOD, label: 'Kitchen & Entrees', icon: '🍔' },
    { id: CATEGORIES.NAB, label: 'Coffee & NAB', icon: '☕' },
    { id: CATEGORIES.BREWERY, label: 'Brewery Pours', icon: '🍺' },
    { id: CATEGORIES.TOBACCO, label: 'Tobacco & Retail', icon: '🚬' }
  ];

  container.innerHTML = categories.map(cat => `
    <button class="filter-tab ${currentRecipeCategory === cat.id ? 'active' : ''}" data-cat="${cat.id}">
      <span>${cat.icon}</span>
      <span>${cat.label}</span>
    </button>
  `).join('');

  container.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentRecipeCategory = btn.dataset.cat;
      renderRecipeCategoryFilters();
      renderRecipeList();
    });
  });
}

export function renderRecipeList() {
  const listContainer = document.getElementById('recipe-list-container');
  if (!listContainer) return;

  let recipes = db.getRecipes();
  if (currentRecipeCategory !== 'all') {
    recipes = recipes.filter(r => r.category === currentRecipeCategory);
  }

  if (recipeSearchQuery.trim()) {
    const q = recipeSearchQuery.toLowerCase();
    recipes = recipes.filter(r =>
      r.name.toLowerCase().includes(q) ||
      (r.sku && r.sku.toLowerCase().includes(q)) ||
      (r.station && r.station.toLowerCase().includes(q))
    );
  }

  if (recipes.length === 0) {
    listContainer.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">📖</div>
        <div>No recipe cards found in this category.</div>
      </div>
    `;
    return;
  }

  listContainer.innerHTML = recipes.map(rec => {
    const cost = computeRecipeTotalCost(rec);
    const price = rec.menuPrice || 0;
    const costPercent = price > 0 ? (cost / price) * 100 : 0;
    const isSelected = rec.id === selectedRecipeId;

    let costBadgeClass = 'badge-success';
    if (costPercent > 34) costBadgeClass = 'badge-danger';
    else if (costPercent > 25) costBadgeClass = 'badge-warning';

    return `
      <div class="card glass-panel glass-panel-hover recipe-item-card ${isSelected ? 'active-recipe' : ''}" 
           data-id="${rec.id}" 
           style="margin-bottom: 0.75rem; padding: 1rem; cursor: pointer; border-left: ${isSelected ? '4px solid var(--accent-primary-light)' : '1px solid var(--border-subtle)'};">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">${rec.name}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">
              <span class="mono-font">${rec.sku || 'REC'}</span> • ${rec.station || 'Main Kitchen'} • ${rec.ingredients?.length || 0} Ingredients
            </div>
          </div>
          <span class="badge ${costBadgeClass}" style="font-size: 0.7rem;">
            ${costPercent.toFixed(1)}% Cost
          </span>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; font-size: 0.85rem;">
          <span style="color: var(--text-secondary);">COGS: <strong class="mono-font" style="color: var(--text-primary);">${formatCurrency(cost)}</strong></span>
          <span style="color: var(--text-secondary);">Menu Price: <strong class="mono-font" style="color: var(--accent-primary-light);">${formatCurrency(price)}</strong></span>
        </div>
      </div>
    `;
  }).join('');

  listContainer.querySelectorAll('.recipe-item-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedRecipeId = card.dataset.id;
      scaleFactor = 1;
      renderRecipeList();
      renderRecipeDetail(selectedRecipeId);
    });
  });
}

export function computeRecipeTotalCost(recipe) {
  if (!recipe || !recipe.ingredients) return 0;

  let totalCost = 0;
  recipe.ingredients.forEach(ing => {
    if (ing.itemId) {
      const item = db.getItemById(ing.itemId);
      if (item) {
        const cost = calculateIngredientCost(item.packageCost, item.packageUom, ing.qty, ing.uom, 100 - (ing.yieldLoss || 0));
        totalCost += cost;
      }
    } else if (ing.subRecipeId) {
      const sub = db.getSubRecipeById(ing.subRecipeId);
      if (sub) {
        let subBatchCost = 0;
        (sub.ingredients || []).forEach(subIng => {
          if (subIng.itemId) {
            const subItem = db.getItemById(subIng.itemId);
            if (subItem) {
              subBatchCost += calculateIngredientCost(subItem.packageCost, subItem.packageUom, subIng.qty, subIng.uom, 100 - (subIng.yieldLoss || 0));
            }
          }
        });
        const subYield = sub.yieldQty || 1;
        const costPerUnit = subBatchCost / subYield;
        totalCost += costPerUnit * ing.qty;
      }
    }
  });

  return totalCost;
}

export function renderRecipeDetail(recipeId) {
  const container = document.getElementById('recipe-detail-container');
  if (!container) return;

  const recipe = db.getRecipeById(recipeId);
  if (!recipe) {
    container.innerHTML = `
      <div style="text-align: center; padding: 4rem; color: var(--text-muted);">
        Select a recipe on the left to view the detailed Culinary Recipe Spec Card, portion scaling, and margin health.
      </div>
    `;
    return;
  }

  const baseCost = computeRecipeTotalCost(recipe);
  const scaledCost = baseCost * scaleFactor;
  const menuPrice = recipe.menuPrice || 0;
  const grossProfit = menuPrice - baseCost;
  const foodCostPercent = menuPrice > 0 ? (baseCost / menuPrice) * 100 : 0;
  const marginPercent = menuPrice > 0 ? (grossProfit / menuPrice) * 100 : 0;

  let costHealthBadge = `<span class="badge badge-success">Optimal Margin (${foodCostPercent.toFixed(1)}% Cost)</span>`;
  if (foodCostPercent > 34) {
    costHealthBadge = `<span class="badge badge-danger">High Cost Warning (${foodCostPercent.toFixed(1)}% Cost)</span>`;
  } else if (foodCostPercent > 25) {
    costHealthBadge = `<span class="badge badge-warning">Moderate Cost (${foodCostPercent.toFixed(1)}% Cost)</span>`;
  }

  // Target prices
  const price20 = baseCost / 0.20;
  const price25 = baseCost / 0.25;
  const price30 = baseCost / 0.30;

  const allergenList = (recipe.allergens && recipe.allergens.length > 0) ? recipe.allergens : ['None'];

  container.innerHTML = `
    <div class="card recipe-spec-card" style="border: 1px solid var(--border-strong);">
      <div class="card-header" style="flex-wrap: wrap;">
        <div>
          <div style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
            <h2 style="font-size: 1.4rem;">${recipe.name}</h2>
            <span class="mono-font badge badge-secondary">${recipe.sku || 'REC-SPEC'}</span>
            <span class="badge badge-${recipe.category}">${recipe.category.toUpperCase()}</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.3rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
            <span>🍳 Station: <strong>${recipe.station || 'Main Line'}</strong></span>
            ${recipe.glassware ? `<span>🍽️ Service: <strong>${recipe.glassware}</strong></span>` : ''}
            ${recipe.garnish ? `<span>🌿 Garnish: <strong>${recipe.garnish}</strong></span>` : ''}
          </div>
        </div>

        <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
          <button class="btn btn-primary btn-sm" id="btn-print-recipe-card" style="background: linear-gradient(135deg, #d97706, #b45309);">
            🖨️ Print Recipe Spec Sheet
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-edit-recipe">✏️ Edit Recipe</button>
          <button class="btn btn-secondary btn-sm" id="btn-delete-recipe" style="color: var(--status-danger);">🗑️ Delete</button>
        </div>
      </div>

      <div class="card-body">
        <!-- Financial KPI Strip -->
        <div class="kpi-grid" style="grid-template-columns: repeat(4, 1fr); margin-bottom: 1.5rem;">
          <div class="kpi-card" style="padding: 1rem;">
            <div class="kpi-title">Cost Per Serving (COGS)</div>
            <div class="kpi-value mono-font" style="font-size: 1.4rem; color: var(--text-primary);">${formatCurrency(baseCost)}</div>
            <div class="kpi-subtext">BOM ingredients rollup</div>
          </div>

          <div class="kpi-card" style="padding: 1rem;">
            <div class="kpi-title">Menu Selling Price</div>
            <div class="kpi-value mono-font" style="font-size: 1.4rem; color: var(--accent-primary-light);">${formatCurrency(menuPrice)}</div>
            <div class="kpi-subtext">POS Register Retail</div>
          </div>

          <div class="kpi-card" style="padding: 1rem;">
            <div class="kpi-title">Gross Profit / Serving</div>
            <div class="kpi-value mono-font" style="font-size: 1.4rem; color: var(--status-success);">${formatCurrency(grossProfit)}</div>
            <div class="kpi-subtext">Margin: ${marginPercent.toFixed(1)}%</div>
          </div>

          <div class="kpi-card" style="padding: 1rem;">
            <div class="kpi-title">Food Cost % Health</div>
            <div style="margin-top: 0.4rem;">${costHealthBadge}</div>
            <div class="kpi-subtext">Target Benchmark: &lt; 28%</div>
          </div>
        </div>

        <!-- Allergen & Pricing Recommendation Bar -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.85rem 1rem;">
            <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--accent-secondary); margin-bottom: 0.35rem;">
              🏷️ Allergen Safety Declarations
            </div>
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
              ${allergenList.map(a => `<span class="badge ${a === 'None' ? 'badge-success' : 'badge-warning'}">${a}</span>`).join('')}
            </div>
          </div>

          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 0.85rem 1rem;">
            <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--accent-primary-light); margin-bottom: 0.35rem;">
              💡 Suggested Menu Pricing Benchmarks
            </div>
            <div style="font-size: 0.8rem; display: flex; justify-content: space-between;">
              <span>20% Cost: <strong>${formatCurrency(price20)}</strong></span>
              <span>25% Cost: <strong>${formatCurrency(price25)}</strong></span>
              <span>30% Cost: <strong>${formatCurrency(price30)}</strong></span>
            </div>
          </div>
        </div>

        <!-- Dynamic Portion Scaler & Batch Planner -->
        <div style="background: var(--bg-surface-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 1rem 1.25rem; margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.25rem;">⚖️</span>
            <div>
              <div style="font-weight: 600; font-size: 0.9rem;">Interactive Banquet &amp; Portion Scaler</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">Dynamically multiply ingredient quantities for kitchen prep or banquet catering</div>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 0.8rem; color: var(--text-secondary);">Servings:</span>
            <button class="btn btn-secondary btn-sm btn-scale ${scaleFactor === 1 ? 'active' : ''}" data-scale="1">1x</button>
            <button class="btn btn-secondary btn-sm btn-scale ${scaleFactor === 10 ? 'active' : ''}" data-scale="10">10x</button>
            <button class="btn btn-secondary btn-sm btn-scale ${scaleFactor === 25 ? 'active' : ''}" data-scale="25">25x</button>
            <button class="btn btn-secondary btn-sm btn-scale ${scaleFactor === 50 ? 'active' : ''}" data-scale="50">50x</button>
            <button class="btn btn-secondary btn-sm btn-scale ${scaleFactor === 100 ? 'active' : ''}" data-scale="100">100x</button>
            <input type="number" min="1" max="1000" id="custom-scale-input" value="${scaleFactor}" class="form-input" style="width: 70px; padding: 0.35rem 0.5rem; font-size: 0.85rem; text-align: center;">
          </div>
        </div>

        <!-- Bill of Materials (BOM) Table -->
        <div style="font-weight: 700; font-size: 1rem; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
          <span>Bill of Materials (BOM Ingredients) - ${scaleFactor} Portion${scaleFactor > 1 ? 's' : ''}</span>
          <span class="mono-font" style="font-size: 0.9rem; color: var(--accent-primary-light);">Scaled Cost: ${formatCurrency(scaledCost)}</span>
        </div>

        <div class="table-responsive" style="margin-bottom: 1.5rem;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Ingredient / Sub-Recipe</th>
                <th>Qty (${scaleFactor}x)</th>
                <th>Yield Loss %</th>
                <th>Inventory Stock Available</th>
                <th>Unit Cost</th>
                <th style="text-align: right;">Line Cost</th>
              </tr>
            </thead>
            <tbody>
              ${(recipe.ingredients || []).map(ing => {
                let name = 'Unknown';
                let stockText = 'N/A';
                let lineCost = 0;
                let unitCostText = '';
                const scaledQty = (ing.qty * scaleFactor);

                if (ing.itemId) {
                  const item = db.getItemById(ing.itemId);
                  if (item) {
                    name = item.name;
                    stockText = `${formatNumber(item.currentStock, 1)} ${item.packageUom}`;
                    lineCost = calculateIngredientCost(item.packageCost, item.packageUom, scaledQty, ing.uom, 100 - (ing.yieldLoss || 0));
                    unitCostText = `${formatCurrency(item.packageCost)} / ${item.packageUom}`;
                  }
                } else if (ing.subRecipeId) {
                  const sub = db.getSubRecipeById(ing.subRecipeId);
                  if (sub) {
                    name = `🥣 [Sub-Recipe] ${sub.name}`;
                    let subBatchCost = 0;
                    (sub.ingredients || []).forEach(sIng => {
                      if (sIng.itemId) {
                        const sItem = db.getItemById(sIng.itemId);
                        if (sItem) {
                          subBatchCost += calculateIngredientCost(sItem.packageCost, sItem.packageUom, sIng.qty, sIng.uom, 100 - (sIng.yieldLoss || 0));
                        }
                      }
                    });
                    const costPerUnit = subBatchCost / (sub.yieldQty || 1);
                    lineCost = costPerUnit * scaledQty;
                    unitCostText = `${formatCurrency(costPerUnit)} / ${sub.yieldUom}`;
                    stockText = 'Prep On-Demand';
                  }
                }

                return `
                  <tr>
                    <td style="font-weight: 600;">${name}</td>
                    <td class="mono-font">${formatNumber(scaledQty, 2)} ${ing.uom}</td>
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

        <!-- Plating & Assembly Steps -->
        ${recipe.instructions ? `
          <div style="background: rgba(15, 23, 42, 0.6); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
            <div style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--accent-primary-light); margin-bottom: 0.5rem;">
              Culinary Preparation &amp; Plating Assembly SOP
            </div>
            <div style="font-size: 0.9rem; line-height: 1.6; color: var(--text-secondary); white-space: pre-line;">
              ${recipe.instructions}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // Attach dynamic scaling listeners
  container.querySelectorAll('.btn-scale').forEach(btn => {
    btn.addEventListener('click', () => {
      scaleFactor = parseInt(btn.dataset.scale);
      renderRecipeDetail(recipeId);
    });
  });

  const scaleInput = document.getElementById('custom-scale-input');
  if (scaleInput) {
    scaleInput.addEventListener('change', (e) => {
      const val = parseInt(e.target.value) || 1;
      scaleFactor = Math.max(1, Math.min(1000, val));
      renderRecipeDetail(recipeId);
    });
  }

  const printBtn = document.getElementById('btn-print-recipe-card');
  if (printBtn) printBtn.addEventListener('click', () => openPrintRecipeModal(recipe.id));

  const editBtn = document.getElementById('btn-edit-recipe');
  if (editBtn) editBtn.addEventListener('click', () => openRecipeFormModal(recipe.id));

  const deleteBtn = document.getElementById('btn-delete-recipe');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (confirm(`Delete recipe "${recipe.name}"?`)) {
        db.deleteRecipe(recipe.id);
        selectedRecipeId = null;
        renderRecipeList();
        renderRecipeDetail(null);
        showToast('Recipe deleted', 'info');
      }
    });
  }
}

export function openPrintRecipeModal(recipeId) {
  const recipe = db.getRecipeById(recipeId);
  if (!recipe) return;

  const modal = document.getElementById('recipe-print-modal');
  const body = document.getElementById('recipe-print-content');
  if (!modal || !body) return;

  const baseCost = computeRecipeTotalCost(recipe);
  const costPercent = recipe.menuPrice > 0 ? (baseCost / recipe.menuPrice) * 100 : 0;

  body.innerHTML = `
    <div class="printable-recipe-sheet" style="background: #ffffff; color: #0f172a; padding: 2rem; border-radius: 8px; font-family: 'Inter', sans-serif;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 1rem; margin-bottom: 1.25rem;">
        <div>
          <div style="font-size: 1.6rem; font-weight: 800; text-transform: uppercase; color: #0f172a;">${recipe.name}</div>
          <div style="font-size: 0.9rem; color: #475569; margin-top: 0.2rem;">
            SKU: ${recipe.sku || 'REC-SPEC'} • Station: ${recipe.station || 'Main Kitchen'} • Category: ${recipe.category.toUpperCase()}
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 1.4rem; font-weight: 800; color: #0f172a;">${formatCurrency(recipe.menuPrice)}</div>
          <div style="font-size: 0.85rem; color: #475569;">Portion Cost: ${formatCurrency(baseCost)} (${costPercent.toFixed(1)}%)</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem; font-size: 0.85rem; background: #f8fafc; padding: 0.75rem; border-radius: 6px;">
        <div><strong>Plating / Glassware:</strong> ${recipe.glassware || 'Standard Dinnerware'}</div>
        <div><strong>Garnish:</strong> ${recipe.garnish || 'Chef Choice'}</div>
        <div><strong>Allergens:</strong> ${(recipe.allergens || ['None']).join(', ')}</div>
        <div><strong>Target Margin:</strong> ${(100 - costPercent).toFixed(1)}%</div>
      </div>

      <div style="font-weight: 700; font-size: 1rem; text-transform: uppercase; margin-bottom: 0.5rem; color: #0f172a;">
        Mise-en-Place &amp; Ingredients (BOM)
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; font-size: 0.85rem;">
        <thead>
          <tr style="background: #e2e8f0; text-align: left;">
            <th style="padding: 0.5rem; border: 1px solid #cbd5e1;">Ingredient / Component</th>
            <th style="padding: 0.5rem; border: 1px solid #cbd5e1;">Portion Qty</th>
            <th style="padding: 0.5rem; border: 1px solid #cbd5e1;">Unit</th>
            <th style="padding: 0.5rem; border: 1px solid #cbd5e1; text-align: right;">Unit Cost</th>
          </tr>
        </thead>
        <tbody>
          ${(recipe.ingredients || []).map(ing => {
            let name = 'Item';
            let unitCost = 0;
            if (ing.itemId) {
              const item = db.getItemById(ing.itemId);
              name = item ? item.name : ing.itemId;
              unitCost = item ? calculateIngredientCost(item.packageCost, item.packageUom, ing.qty, ing.uom) : 0;
            } else if (ing.subRecipeId) {
              const sub = db.getSubRecipeById(ing.subRecipeId);
              name = sub ? `[Prep] ${sub.name}` : ing.subRecipeId;
            }
            return `
              <tr>
                <td style="padding: 0.5rem; border: 1px solid #e2e8f0; font-weight: 600;">${name}</td>
                <td style="padding: 0.5rem; border: 1px solid #e2e8f0;">${ing.qty}</td>
                <td style="padding: 0.5rem; border: 1px solid #e2e8f0;">${ing.uom}</td>
                <td style="padding: 0.5rem; border: 1px solid #e2e8f0; text-align: right;">${formatCurrency(unitCost)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>

      <div style="font-weight: 700; font-size: 1rem; text-transform: uppercase; margin-bottom: 0.5rem; color: #0f172a;">
        Preparation &amp; Assembly Method (SOP)
      </div>
      <div style="font-size: 0.85rem; line-height: 1.6; color: #334155; white-space: pre-line; background: #f8fafc; padding: 1rem; border-radius: 6px;">
        ${recipe.instructions || 'Follow standard station mise-en-place guidelines.'}
      </div>
    </div>
  `;

  openModal('recipe-print-modal');

  const actionBtn = document.getElementById('btn-print-recipe-action');
  if (actionBtn) {
    actionBtn.onclick = () => {
      window.print();
    };
  }
}

export function openRecipeFormModal(recipeId = null) {
  const isEdit = !!recipeId;
  const recipe = isEdit ? db.getRecipeById(recipeId) : {
    id: generateId('rec'),
    sku: `REC-${Date.now().toString().slice(-4)}`,
    name: '',
    type: 'finished_item',
    category: currentRecipeCategory !== 'all' ? currentRecipeCategory : CATEGORIES.LIQUOR,
    menuPrice: 15.00,
    targetMarginPercent: 80,
    station: 'Main Kitchen',
    glassware: '',
    garnish: '',
    allergens: ['None'],
    instructions: '',
    ingredients: [
      { itemId: 'item_bourbon_makers', qty: 2.0, uom: 'fl_oz', yieldLoss: 0 }
    ]
  };

  const modal = document.getElementById('recipe-form-modal');
  const form = document.getElementById('recipe-form');
  if (!modal || !form) return;

  const allItems = db.getItems();
  const allSubRecipes = db.getSubRecipes();

  form.innerHTML = `
    <div class="form-grid-2">
      <div class="form-group">
        <label class="form-label">Recipe Card Name *</label>
        <input type="text" class="form-input" id="rec-form-name" value="${recipe.name || ''}" required placeholder="e.g. Smoked Kentucky Old Fashioned">
      </div>
      <div class="form-group">
        <label class="form-label">Recipe SKU / Code *</label>
        <input type="text" class="form-input" id="rec-form-sku" value="${recipe.sku || ''}" required>
      </div>
    </div>

    <div class="form-grid-3">
      <div class="form-group">
        <label class="form-label">Category</label>
        <select class="form-select" id="rec-form-category">
          <option value="${CATEGORIES.LIQUOR}" ${recipe.category === CATEGORIES.LIQUOR ? 'selected' : ''}>🍸 Cocktails & Spirits</option>
          <option value="${CATEGORIES.FOOD}" ${recipe.category === CATEGORIES.FOOD ? 'selected' : ''}>🍔 Kitchen & Entrees</option>
          <option value="${CATEGORIES.NAB}" ${recipe.category === CATEGORIES.NAB ? 'selected' : ''}>☕ Coffee & NAB</option>
          <option value="${CATEGORIES.BREWERY}" ${recipe.category === CATEGORIES.BREWERY ? 'selected' : ''}>🍺 Brewery Draft / Can</option>
          <option value="${CATEGORIES.TOBACCO}" ${recipe.category === CATEGORIES.TOBACCO ? 'selected' : ''}>🚬 Tobacco & Retail</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Menu Selling Price ($)</label>
        <input type="number" step="0.5" class="form-input" id="rec-form-price" value="${recipe.menuPrice || 0}">
      </div>
      <div class="form-group">
        <label class="form-label">Prep Station / Line</label>
        <input type="text" class="form-input" id="rec-form-station" value="${recipe.station || 'Cocktail Station #1'}" placeholder="e.g. Hot Line, Grill, Espresso Bar">
      </div>
    </div>

    <div class="form-grid-2">
      <div class="form-group">
        <label class="form-label">Glassware / Plating Dish</label>
        <input type="text" class="form-input" id="rec-form-glass" value="${recipe.glassware || ''}" placeholder="e.g. Rocks Glass with Ice Sphere, Heated Dinner Plate">
      </div>
      <div class="form-group">
        <label class="form-label">Garnish / Presentation</label>
        <input type="text" class="form-input" id="rec-form-garnish" value="${recipe.garnish || ''}" placeholder="e.g. Expressed Orange Peel, Charred Rosemary">
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Allergen Declarations (Comma-separated)</label>
      <input type="text" class="form-input" id="rec-form-allergens" value="${(recipe.allergens || ['None']).join(', ')}" placeholder="e.g. Gluten, Dairy, Egg">
    </div>

    <div style="margin: 1.25rem 0 0.5rem; display: flex; justify-content: space-between; align-items: center;">
      <span style="font-weight: 700; font-size: 0.9rem; text-transform: uppercase; color: var(--accent-primary-light);">Recipe Ingredients (BOM)</span>
      <button type="button" class="btn btn-secondary btn-sm" id="btn-add-ing-row">+ Add Ingredient</button>
    </div>

    <div id="recipe-ingredients-rows" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 200px; overflow-y: auto; padding-right: 0.3rem;">
      ${(recipe.ingredients || []).map((ing, idx) => renderIngredientInputRow(ing, idx, allItems, allSubRecipes)).join('')}
    </div>

    <div class="form-group" style="margin-top: 1rem;">
      <label class="form-label">Culinary Assembly &amp; Plating Steps (SOP)</label>
      <textarea class="form-textarea" id="rec-form-instructions" rows="3" placeholder="Step by step preparation and plating method...">${recipe.instructions || ''}</textarea>
    </div>
  `;

  openModal('recipe-form-modal');

  const addIngBtn = document.getElementById('btn-add-ing-row');
  if (addIngBtn) {
    addIngBtn.onclick = () => {
      const container = document.getElementById('recipe-ingredients-rows');
      const idx = container.children.length;
      const dummy = document.createElement('div');
      dummy.innerHTML = renderIngredientInputRow({ itemId: allItems[0]?.id || '', qty: 1, uom: 'fl_oz', yieldLoss: 0 }, idx, allItems, allSubRecipes);
      container.appendChild(dummy.firstElementChild);
      attachIngRowListeners();
    };
  }

  attachIngRowListeners();

  const saveBtn = document.getElementById('btn-save-recipe');
  if (saveBtn) {
    saveBtn.onclick = () => {
      const name = document.getElementById('rec-form-name').value.trim();
      const sku = document.getElementById('rec-form-sku').value.trim();
      if (!name || !sku) {
        showToast('Please enter Recipe Name and SKU', 'error');
        return;
      }

      const rows = document.querySelectorAll('.recipe-ing-row');
      const ingredients = [];
      rows.forEach(row => {
        const typeSelect = row.querySelector('.ing-source-select').value;
        const qty = parseFloat(row.querySelector('.ing-qty-input').value) || 0;
        const uom = row.querySelector('.ing-uom-select').value;
        const yieldLoss = parseFloat(row.querySelector('.ing-loss-input').value) || 0;

        if (typeSelect.startsWith('item_')) {
          ingredients.push({ itemId: typeSelect, qty, uom, yieldLoss });
        } else if (typeSelect.startsWith('sub_')) {
          ingredients.push({ subRecipeId: typeSelect, qty, uom, yieldLoss });
        }
      });

      const rawAllergens = document.getElementById('rec-form-allergens').value.split(',').map(s => s.trim()).filter(Boolean);

      const updatedRecipe = {
        ...recipe,
        name,
        sku,
        type: 'finished_item',
        category: document.getElementById('rec-form-category').value,
        menuPrice: parseFloat(document.getElementById('rec-form-price').value) || 0,
        station: document.getElementById('rec-form-station').value.trim(),
        glassware: document.getElementById('rec-form-glass').value.trim(),
        garnish: document.getElementById('rec-form-garnish').value.trim(),
        allergens: rawAllergens.length > 0 ? rawAllergens : ['None'],
        instructions: document.getElementById('rec-form-instructions').value.trim(),
        ingredients
      };

      db.saveRecipe(updatedRecipe);
      selectedRecipeId = updatedRecipe.id;
      closeModal('recipe-form-modal');
      renderRecipeList();
      renderRecipeDetail(selectedRecipeId);
      showToast(`Recipe Card "${updatedRecipe.name}" saved!`, 'success');
    };
  }
}

function renderIngredientInputRow(ing, idx, allItems, allSubRecipes) {
  const currentVal = ing.itemId || ing.subRecipeId || '';

  return `
    <div class="recipe-ing-row" style="display: grid; grid-template-columns: 2fr 1fr 1.2fr 1fr 36px; gap: 0.5rem; align-items: center; background: var(--bg-surface); padding: 0.5rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
      <select class="form-select ing-source-select" style="font-size: 0.8rem; padding: 0.4rem;">
        <optgroup label="📦 Raw Materials (Item Master)">
          ${allItems.map(item => `
            <option value="${item.id}" ${currentVal === item.id ? 'selected' : ''}>${item.name} (${item.packageUom})</option>
          `).join('')}
        </optgroup>
        ${allSubRecipes.length > 0 ? `
          <optgroup label="🥣 Prep Components (Sub-Recipe Master)">
            ${allSubRecipes.map(sub => `
              <option value="${sub.id}" ${currentVal === sub.id ? 'selected' : ''}>[Prep] ${sub.name} (${sub.yieldUom})</option>
            `).join('')}
          </optgroup>
        ` : ''}
      </select>

      <input type="number" step="0.1" class="form-input ing-qty-input" value="${ing.qty || 1}" style="font-size: 0.8rem; padding: 0.4rem;" placeholder="Qty">

      <select class="form-select ing-uom-select" style="font-size: 0.8rem; padding: 0.4rem;">
        ${Object.entries(UOM_DEFINITIONS).map(([key, def]) => `
          <option value="${key}" ${ing.uom === key ? 'selected' : ''}>${def.label}</option>
        `).join('')}
      </select>

      <input type="number" step="1" class="form-input ing-loss-input" value="${ing.yieldLoss || 0}" style="font-size: 0.8rem; padding: 0.4rem;" placeholder="Loss %">

      <button type="button" class="btn btn-secondary btn-icon-only btn-remove-ing" style="color: var(--status-danger); padding: 0.3rem;">✕</button>
    </div>
  `;
}

function attachIngRowListeners() {
  document.querySelectorAll('.btn-remove-ing').forEach(btn => {
    btn.onclick = () => {
      const row = btn.closest('.recipe-ing-row');
      if (row) row.remove();
    };
  });
}

function setupEventListeners() {
  const searchInput = document.getElementById('recipe-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      recipeSearchQuery = e.target.value;
      renderRecipeList();
    });
  }

  const createBtn = document.getElementById('btn-create-recipe');
  if (createBtn) {
    createBtn.addEventListener('click', () => openRecipeFormModal(null));
  }

  db.subscribe(() => {
    renderRecipeList();
    if (selectedRecipeId) renderRecipeDetail(selectedRecipeId);
  });
}
