/**
 * CraftMatrix Pro Menu Master & Menu Engineering Module
 * Front-of-House POS Menu items, Modifiers/Add-ons, 86'd inventory availability & BCG Profitability Matrix.
 */

import { db, CATEGORIES } from '../store/db.js';
import { formatCurrency, formatNumber, showToast, openModal, closeModal, generateId } from '../utils/helpers.js';
import { computeRecipeTotalCost } from './recipes.js';

let currentDeptFilter = 'all';
let menuSearchQuery = '';

export function initMenuMasterModule() {
  renderMenuDeptFilters();
  renderMenuCatalog();
  renderMenuBcgMatrix();
  setupEventListeners();
}

function renderMenuDeptFilters() {
  const container = document.getElementById('menu-dept-filters');
  if (!container) return;

  const departments = [
    { id: 'all', label: 'All Menu Departments', icon: '🍽️' },
    { id: 'Burgers & Mains', label: 'Burgers & Mains', icon: '🍔' },
    { id: 'Craft Cocktails', label: 'Craft Cocktails', icon: '🍸' },
    { id: 'Draft Beer', label: 'Draft Beers', icon: '🍺' },
    { id: 'Barista & Coffee', label: 'Barista & Coffee', icon: '☕' },
    { id: 'Humidor & Cigars', label: 'Humidor & Cigars', icon: '🚬' }
  ];

  container.innerHTML = departments.map(d => `
    <button class="filter-tab ${currentDeptFilter === d.id ? 'active' : ''}" data-dept="${d.id}">
      <span>${d.icon}</span>
      <span>${d.label}</span>
    </button>
  `).join('');

  container.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentDeptFilter = btn.dataset.dept;
      renderMenuDeptFilters();
      renderMenuCatalog();
    });
  });
}

/**
 * Calculates how many servings can be prepared with current on-hand stock
 */
export function calculateMenuAvailability(menuItem) {
  if (!menuItem.isActive) {
    return { available: false, maxServings: 0, reason: 'Manually Disabled / 86\'d' };
  }

  const recipe = db.getRecipeById(menuItem.recipeId);
  if (!recipe || !recipe.ingredients || recipe.ingredients.length === 0) {
    return { available: true, maxServings: 99, reason: 'Ready' };
  }

  let minServings = Infinity;
  let bottleneck = null;

  for (const ing of recipe.ingredients) {
    if (ing.itemId) {
      const item = db.getItemById(ing.itemId);
      if (!item) continue;
      const inStock = item.currentStock || 0;
      const needed = ing.qty || 1;
      const possible = Math.floor(inStock / needed);
      if (possible < minServings) {
        minServings = possible;
        bottleneck = item.name;
      }
    }
  }

  if (minServings === Infinity) minServings = 99;

  return {
    available: minServings > 0,
    maxServings: Math.max(0, minServings),
    reason: minServings <= 0 ? `Out of ${bottleneck}` : `${minServings} servings possible`,
    bottleneck
  };
}

export function renderMenuCatalog() {
  const container = document.getElementById('menu-items-catalog-grid');
  if (!container) return;

  let items = db.getMenuItems();

  if (currentDeptFilter !== 'all') {
    items = items.filter(m => m.department === currentDeptFilter);
  }

  if (menuSearchQuery.trim()) {
    const q = menuSearchQuery.toLowerCase();
    items = items.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.code && m.code.toLowerCase().includes(q)) ||
      (m.description && m.description.toLowerCase().includes(q))
    );
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">🍽️</div>
        <div>No menu items found matching the selected department filter.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map(item => {
    const recipe = db.getRecipeById(item.recipeId);
    const cogs = recipe ? computeRecipeTotalCost(recipe) : 0;
    const price = item.price || 0;
    const profit = price - cogs;
    const marginPercent = price > 0 ? (profit / price) * 100 : 0;
    const avail = calculateMenuAvailability(item);

    let stockBadge = `<span class="badge badge-success" style="font-size: 0.7rem;">🟢 ${avail.maxServings} in stock</span>`;
    if (!item.isActive || avail.maxServings <= 0) {
      stockBadge = `<span class="badge badge-danger" style="font-size: 0.7rem;">🔴 86'd (${avail.reason})</span>`;
    } else if (avail.maxServings <= 5) {
      stockBadge = `<span class="badge badge-warning" style="font-size: 0.7rem;">⚠️ Low Stock (${avail.maxServings} left)</span>`;
    }

    const modifierCount = (item.modifiers || []).length;

    return `
      <div class="card glass-panel glass-panel-hover menu-item-master-card" data-id="${item.id}" style="display: flex; flex-direction: column; justify-content: space-between; border-top: 3px solid ${item.isActive ? 'var(--accent-primary-light)' : 'var(--status-danger)'};">
        <div>
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
            <div>
              <span class="mono-font badge badge-secondary" style="font-size: 0.65rem;">${item.code || 'MNU'}</span>
              <span class="badge badge-${item.category}" style="font-size: 0.65rem;">${item.department || item.category.toUpperCase()}</span>
            </div>
            ${stockBadge}
          </div>

          <div style="font-weight: 700; font-size: 1.1rem; color: var(--text-primary); margin-bottom: 0.35rem;">${item.name}</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 0.75rem;">
            ${item.description || 'Artisan hospitality selection.'}
          </div>

          ${modifierCount > 0 ? `
            <div style="background: rgba(15, 23, 42, 0.5); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); margin-bottom: 0.75rem;">
              <div style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: var(--accent-secondary); margin-bottom: 0.3rem;">
                Modifiers &amp; Add-ons (${modifierCount})
              </div>
              <div style="display: flex; gap: 0.3rem; flex-wrap: wrap;">
                ${(item.modifiers || []).map(m => `
                  <span class="badge badge-secondary" style="font-size: 0.65rem;">+${formatCurrency(m.price)} ${m.name}</span>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>

        <div>
          <!-- Financial breakdown -->
          <div style="border-top: 1px solid var(--border-subtle); padding-top: 0.6rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; margin-bottom: 0.75rem;">
            <div>
              <span style="color: var(--text-muted);">COGS: </span>
              <strong class="mono-font" style="color: var(--text-primary);">${formatCurrency(cogs)}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted);">Margin: </span>
              <strong class="mono-font" style="color: var(--status-success);">${marginPercent.toFixed(1)}%</strong>
            </div>
            <div>
              <span style="color: var(--text-muted);">Retail: </span>
              <strong class="mono-font" style="color: var(--accent-primary-light); font-size: 1.05rem;">${formatCurrency(price)}</strong>
            </div>
          </div>

          <!-- Quick Actions -->
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
            <button class="btn btn-secondary btn-sm btn-toggle-86" data-id="${item.id}" style="font-size: 0.75rem;">
              ${item.isActive ? '⚡ 86 / Disable' : '✓ Activate'}
            </button>
            <div style="display: flex; gap: 0.35rem;">
              <button class="btn btn-secondary btn-sm btn-edit-menu" data-id="${item.id}" title="Edit Menu Item">✏️</button>
              <button class="btn btn-secondary btn-sm btn-delete-menu" data-id="${item.id}" title="Delete" style="color: var(--status-danger);">🗑️</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach card event listeners
  container.querySelectorAll('.btn-toggle-86').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      const item = db.getMenuItemById(id);
      if (item) {
        item.isActive = !item.isActive;
        db.saveMenuItem(item);
        renderMenuCatalog();
        renderMenuBcgMatrix();
        showToast(`Menu item "${item.name}" ${item.isActive ? 'activated' : 'marked 86\'d'}!`, 'info');
      }
    });
  });

  container.querySelectorAll('.btn-edit-menu').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openMenuItemFormModal(btn.dataset.id);
    });
  });

  container.querySelectorAll('.btn-delete-menu').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = db.getMenuItemById(btn.dataset.id);
      if (item && confirm(`Delete menu item "${item.name}"?`)) {
        db.deleteMenuItem(item.id);
        renderMenuCatalog();
        renderMenuBcgMatrix();
        showToast('Menu item deleted', 'info');
      }
    });
  });
}

/**
 * Menu Engineering BCG Profitability Matrix
 * Categorizes menu items into 4 quadrants:
 * 1. Stars (High Profit, High Popularity)
 * 2. Plowhorses (Low Profit, High Popularity)
 * 3. Puzzles (High Profit, Low Popularity)
 * 4. Dogs (Low Profit, Low Popularity)
 */
export function renderMenuBcgMatrix() {
  const container = document.getElementById('menu-engineering-matrix-container');
  if (!container) return;

  const menuItems = db.getMenuItems();
  const recipes = db.getRecipes();

  // Simulated sales volume distribution
  const simulatedVolumes = {
    'menu_smash_burger': 185,
    'menu_truffle_ribeye': 42,
    'menu_old_fashioned': 160,
    'menu_casamigos_margarita': 140,
    'menu_moscow_mule': 95,
    'menu_hazy_ipa_pint': 220,
    'menu_craft_latte': 110,
    'menu_cohiba_cigar': 25
  };

  const analyzed = menuItems.map(item => {
    const recipe = db.getRecipeById(item.recipeId);
    const cogs = recipe ? computeRecipeTotalCost(recipe) : 0;
    const price = item.price || 0;
    const margin = price - cogs;
    const volume = simulatedVolumes[item.id] || 60;
    const totalProfit = margin * volume;

    return {
      item,
      cogs,
      price,
      margin,
      volume,
      totalProfit
    };
  });

  const avgMargin = analyzed.reduce((sum, a) => sum + a.margin, 0) / (analyzed.length || 1);
  const avgVolume = analyzed.reduce((sum, a) => sum + a.volume, 0) / (analyzed.length || 1);

  const stars = analyzed.filter(a => a.margin >= avgMargin && a.volume >= avgVolume);
  const plowhorses = analyzed.filter(a => a.margin < avgMargin && a.volume >= avgVolume);
  const puzzles = analyzed.filter(a => a.margin >= avgMargin && a.volume < avgVolume);
  const dogs = analyzed.filter(a => a.margin < avgMargin && a.volume < avgVolume);

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem;">
      
      <!-- STARS (High Profit, High Popularity) -->
      <div class="bcg-quadrant" style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-md); padding: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <div style="font-weight: 800; font-size: 1.05rem; color: #10b981; display: flex; align-items: center; gap: 0.4rem;">
            <span>⭐</span>
            <span>STARS (High Profit / High Volume)</span>
          </div>
          <span class="badge badge-success">${stars.length} Items</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">
          Action: Highly profitable flagship items. Maintain strict consistency &amp; prime menu positioning.
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.4rem;">
          ${stars.map(s => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 0.85rem;">
              <span style="font-weight: 600;">${s.item.name}</span>
              <span class="mono-font" style="color: #10b981;">+$${s.margin.toFixed(2)} margin (${s.volume} sold)</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- PUZZLES (High Profit, Low Popularity) -->
      <div class="bcg-quadrant" style="background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.3); border-radius: var(--radius-md); padding: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <div style="font-weight: 800; font-size: 1.05rem; color: #06b6d4; display: flex; align-items: center; gap: 0.4rem;">
            <span>🧩</span>
            <span>PUZZLES (High Profit / Low Volume)</span>
          </div>
          <span class="badge badge-info">${puzzles.length} Items</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">
          Action: High margins but lower volume. Reposition on menu, feature as specials, train servers to upsell.
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.4rem;">
          ${puzzles.map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 0.85rem;">
              <span style="font-weight: 600;">${p.item.name}</span>
              <span class="mono-font" style="color: #06b6d4;">+$${p.margin.toFixed(2)} margin (${p.volume} sold)</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- PLOWHORSES (Low Profit, High Popularity) -->
      <div class="bcg-quadrant" style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-md); padding: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <div style="font-weight: 800; font-size: 1.05rem; color: #f59e0b; display: flex; align-items: center; gap: 0.4rem;">
            <span>🐎</span>
            <span>PLOWHORSES (Low Profit / High Volume)</span>
          </div>
          <span class="badge badge-warning">${plowhorses.length} Items</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">
          Action: Guest favorites with lower margins. Test modest price increases (+$0.75-$1.50) or re-engineer recipe portions.
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.4rem;">
          ${plowhorses.map(pl => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 0.85rem;">
              <span style="font-weight: 600;">${pl.item.name}</span>
              <span class="mono-font" style="color: #f59e0b;">+$${pl.margin.toFixed(2)} margin (${pl.volume} sold)</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- DOGS (Low Profit, Low Popularity) -->
      <div class="bcg-quadrant" style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-md); padding: 1.25rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <div style="font-weight: 800; font-size: 1.05rem; color: #ef4444; display: flex; align-items: center; gap: 0.4rem;">
            <span>🐶</span>
            <span>DOGS (Low Profit / Low Volume)</span>
          </div>
          <span class="badge badge-danger">${dogs.length} Items</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">
          Action: Underperforming items. Consider removing from menu or replacing with higher-margin seasonal offerings.
        </div>
        <div style="display: flex; flex-direction: column; gap: 0.4rem;">
          ${dogs.length === 0 ? `
            <div style="font-size: 0.8rem; color: var(--text-muted); padding: 0.5rem;">No dog items currently! Excellent menu curation.</div>
          ` : dogs.map(d => `
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); font-size: 0.85rem;">
              <span style="font-weight: 600;">${d.item.name}</span>
              <span class="mono-font" style="color: #ef4444;">+$${d.margin.toFixed(2)} margin (${d.volume} sold)</span>
            </div>
          `).join('')}
        </div>
      </div>

    </div>
  `;
}

export function openMenuItemFormModal(menuItemId = null) {
  const isEdit = !!menuItemId;
  const item = isEdit ? db.getMenuItemById(menuItemId) : {
    id: generateId('menu'),
    code: `MNU-${Date.now().toString().slice(-4)}`,
    name: '',
    category: CATEGORIES.FOOD,
    department: 'Burgers & Mains',
    price: 16.00,
    taxCategory: 'standard',
    recipeId: '',
    description: '',
    isActive: true,
    sortOrder: 10,
    modifiers: []
  };

  const modal = document.getElementById('menuitem-form-modal');
  const form = document.getElementById('menuitem-form');
  if (!modal || !form) return;

  const recipes = db.getRecipes();

  form.innerHTML = `
    <div class="form-grid-2">
      <div class="form-group">
        <label class="form-label">Menu Item Display Name *</label>
        <input type="text" class="form-input" id="menu-form-name" value="${item.name || ''}" required placeholder="e.g. Craft Double Angus Smash Burger">
      </div>
      <div class="form-group">
        <label class="form-label">Menu Code / SKU *</label>
        <input type="text" class="form-input" id="menu-form-code" value="${item.code || ''}" required>
      </div>
    </div>

    <div class="form-grid-3">
      <div class="form-group">
        <label class="form-label">POS Department</label>
        <select class="form-select" id="menu-form-dept">
          <option value="Burgers & Mains" ${item.department === 'Burgers & Mains' ? 'selected' : ''}>🍔 Burgers & Mains</option>
          <option value="Craft Cocktails" ${item.department === 'Craft Cocktails' ? 'selected' : ''}>🍸 Craft Cocktails</option>
          <option value="Draft Beer" ${item.department === 'Draft Beer' ? 'selected' : ''}>🍺 Draft Beer</option>
          <option value="Barista & Coffee" ${item.department === 'Barista & Coffee' ? 'selected' : ''}>☕ Barista & Coffee</option>
          <option value="Humidor & Cigars" ${item.department === 'Humidor & Cigars' ? 'selected' : ''}>🚬 Humidor & Cigars</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Selling Retail Price ($) *</label>
        <input type="number" step="0.25" class="form-input" id="menu-form-price" value="${item.price || 0}">
      </div>
      <div class="form-group">
        <label class="form-label">Tax Category</label>
        <select class="form-select" id="menu-form-tax">
          <option value="standard" ${item.taxCategory === 'standard' ? 'selected' : ''}>Standard Sales Tax (8.875%)</option>
          <option value="liquor" ${item.taxCategory === 'liquor' ? 'selected' : ''}>Liquor & Alcohol Tax (10.0%)</option>
          <option value="zero" ${item.taxCategory === 'zero' ? 'selected' : ''}>Tax Exempt / Zero Rate</option>
        </select>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Linked Kitchen / Bar Recipe Card *</label>
      <select class="form-select" id="menu-form-recipe">
        <option value="">-- Direct Retail / No Recipe --</option>
        ${recipes.map(r => `
          <option value="${r.id}" ${item.recipeId === r.id ? 'selected' : ''}>${r.name} (${r.category.toUpperCase()})</option>
        `).join('')}
      </select>
    </div>

    <div class="form-group">
      <label class="form-label">Menu Item Description</label>
      <textarea class="form-textarea" id="menu-form-desc" rows="2" placeholder="Guest facing menu description...">${item.description || ''}</textarea>
    </div>

    <!-- Modifiers Builder -->
    <div style="margin: 1.25rem 0 0.5rem; display: flex; justify-content: space-between; align-items: center;">
      <span style="font-weight: 700; font-size: 0.9rem; text-transform: uppercase; color: var(--accent-primary-light);">Modifier Options &amp; Add-ons</span>
      <button type="button" class="btn btn-secondary btn-sm" id="btn-add-modifier-row">+ Add Modifier</button>
    </div>

    <div id="menu-modifiers-rows" style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 180px; overflow-y: auto;">
      ${(item.modifiers || []).map((mod, idx) => renderModifierInputRow(mod, idx)).join('')}
    </div>
  `;

  openModal('menuitem-form-modal');

  const addModBtn = document.getElementById('btn-add-modifier-row');
  if (addModBtn) {
    addModBtn.onclick = () => {
      const container = document.getElementById('menu-modifiers-rows');
      const idx = container.children.length;
      const dummy = document.createElement('div');
      dummy.innerHTML = renderModifierInputRow({ name: 'Extra Portion', price: 2.00 }, idx);
      container.appendChild(dummy.firstElementChild);
      attachModifierListeners();
    };
  }

  attachModifierListeners();

  const saveBtn = document.getElementById('btn-save-menuitem');
  if (saveBtn) {
    saveBtn.onclick = () => {
      const name = document.getElementById('menu-form-name').value.trim();
      const code = document.getElementById('menu-form-code').value.trim();
      if (!name || !code) {
        showToast('Please enter Menu Display Name and Code', 'error');
        return;
      }

      const rows = document.querySelectorAll('.menu-mod-row');
      const modifiers = [];
      rows.forEach(row => {
        const modName = row.querySelector('.mod-name-input').value.trim();
        const modPrice = parseFloat(row.querySelector('.mod-price-input').value) || 0;
        if (modName) {
          modifiers.push({
            id: generateId('mod'),
            name: modName,
            price: modPrice
          });
        }
      });

      const updatedMenuItem = {
        ...item,
        name,
        code,
        department: document.getElementById('menu-form-dept').value,
        price: parseFloat(document.getElementById('menu-form-price').value) || 0,
        taxCategory: document.getElementById('menu-form-tax').value,
        recipeId: document.getElementById('menu-form-recipe').value,
        description: document.getElementById('menu-form-desc').value.trim(),
        modifiers
      };

      db.saveMenuItem(updatedMenuItem);
      closeModal('menuitem-form-modal');
      renderMenuCatalog();
      renderMenuBcgMatrix();
      showToast(`Menu item "${updatedMenuItem.name}" saved!`, 'success');
    };
  }
}

function renderModifierInputRow(mod, idx) {
  return `
    <div class="menu-mod-row" style="display: grid; grid-template-columns: 2fr 1fr 36px; gap: 0.5rem; align-items: center; background: var(--bg-surface); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
      <input type="text" class="form-input mod-name-input" value="${mod.name || ''}" placeholder="e.g. Add Sharp Cheddar" style="font-size: 0.8rem; padding: 0.4rem;">
      <input type="number" step="0.25" class="form-input mod-price-input" value="${mod.price || 0}" placeholder="Price ($)" style="font-size: 0.8rem; padding: 0.4rem;">
      <button type="button" class="btn btn-secondary btn-icon-only btn-remove-mod" style="color: var(--status-danger); padding: 0.3rem;">✕</button>
    </div>
  `;
}

function attachModifierListeners() {
  document.querySelectorAll('.btn-remove-mod').forEach(btn => {
    btn.onclick = () => {
      const row = btn.closest('.menu-mod-row');
      if (row) row.remove();
    };
  });
}

function setupEventListeners() {
  const searchInput = document.getElementById('menu-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      menuSearchQuery = e.target.value;
      renderMenuCatalog();
    });
  }

  const addBtn = document.getElementById('btn-add-menu-item');
  if (addBtn) {
    addBtn.addEventListener('click', () => openMenuItemFormModal(null));
  }

  db.subscribe(() => {
    renderMenuCatalog();
    renderMenuBcgMatrix();
  });
}
