/**
 * CraftMatrix Pro POS Sales Terminal & Automatic Recipe Depletion Engine
 * Uses Menu Master catalog, supports Modifiers, 86'd stock guards, and multi-level BOM depletion.
 */

import { db, CATEGORIES } from '../store/db.js';
import { formatCurrency, formatNumber, showToast, openModal, closeModal, playSound } from '../utils/helpers.js';
import { convertUom } from '../store/uom.js';
import { calculateMenuAvailability } from './menumaster.js';

let posCategoryFilter = 'all';
let cart = []; // [{ menuItemId, name, price, taxCategory, qty, menuItem, recipe, selectedModifiers: [] }]

export function initPosModule() {
  renderPosCategoryFilters();
  renderPosMenuGrid();
  renderCart();
  setupEventListeners();
}

function renderPosCategoryFilters() {
  const container = document.getElementById('pos-category-filters');
  if (!container) return;

  const categories = [
    { id: 'all', label: 'All Menu Items', icon: '⚡' },
    { id: CATEGORIES.FOOD, label: 'Kitchen & Mains', icon: '🍔' },
    { id: CATEGORIES.LIQUOR, label: 'Cocktails & Spirits', icon: '🍸' },
    { id: CATEGORIES.BREWERY, label: 'Draft Beers', icon: '🍺' },
    { id: CATEGORIES.NAB, label: 'Coffee & NAB', icon: '☕' },
    { id: CATEGORIES.TOBACCO, label: 'Cigars & Retail', icon: '🚬' }
  ];

  container.innerHTML = categories.map(cat => `
    <button class="filter-tab ${posCategoryFilter === cat.id ? 'active' : ''}" data-cat="${cat.id}">
      <span>${cat.icon}</span>
      <span>${cat.label}</span>
    </button>
  `).join('');

  container.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      posCategoryFilter = btn.dataset.cat;
      renderPosCategoryFilters();
      renderPosMenuGrid();
    });
  });
}

export function renderPosMenuGrid() {
  const grid = document.getElementById('pos-menu-items');
  if (!grid) return;

  let menuItems = db.getMenuItems();
  if (posCategoryFilter !== 'all') {
    menuItems = menuItems.filter(m => m.category === posCategoryFilter);
  }

  if (menuItems.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-muted);">
        No menu items found in this department.
      </div>
    `;
    return;
  }

  grid.innerHTML = menuItems.map(item => {
    const avail = calculateMenuAvailability(item);
    const isOutOfStock = !item.isActive || avail.maxServings <= 0;
    const recipe = db.getRecipeById(item.recipeId);
    const modCount = (item.modifiers || []).length;

    return `
      <div class="pos-item-card ${isOutOfStock ? 'pos-item-disabled' : ''}" data-id="${item.id}" style="${isOutOfStock ? 'opacity: 0.55; pointer-events: none; border-color: var(--status-danger);' : ''}">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <span class="badge badge-${item.category}" style="font-size: 0.65rem;">${item.department || item.category.toUpperCase()}</span>
          <span class="pos-item-price">${formatCurrency(item.price)}</span>
        </div>
        <div class="pos-item-name">${item.name}</div>
        
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: auto; display: flex; justify-content: space-between; align-items: center;">
          <span>${modCount > 0 ? `⚙️ ${modCount} Modifiers` : 'Single Item'}</span>
          <span style="font-size: 0.7rem; color: ${isOutOfStock ? 'var(--status-danger)' : 'var(--status-success)'}; font-weight: 600;">
            ${isOutOfStock ? '🔴 86\'d' : `🟢 ${avail.maxServings} left`}
          </span>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.pos-item-card:not(.pos-item-disabled)').forEach(card => {
    card.addEventListener('click', () => {
      handleItemClick(card.dataset.id);
    });
  });
}

function handleItemClick(menuItemId) {
  const menuItem = db.getMenuItemById(menuItemId);
  if (!menuItem) return;

  const recipe = db.getRecipeById(menuItem.recipeId);

  // If item has modifiers, open quick modifier selection or add directly
  if (menuItem.modifiers && menuItem.modifiers.length > 0) {
    promptModifiersModal(menuItem, recipe);
  } else {
    addToCart(menuItem, recipe, []);
  }
}

function promptModifiersModal(menuItem, recipe) {
  let selectedMods = [];

  const modalHtml = `
    <div class="modal-overlay open" id="pos-mod-modal">
      <div class="modal-container" style="max-width: 480px;">
        <div class="modal-header">
          <h3 style="font-size: 1.15rem;">Customizations: ${menuItem.name}</h3>
          <button class="btn btn-secondary btn-icon-only" onclick="document.getElementById('pos-mod-modal').remove()">✕</button>
        </div>
        <div class="modal-body">
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1rem;">
            Select optional add-ons or ingredient modifiers:
          </div>

          <div style="display: flex; flex-direction: column; gap: 0.5rem;" id="pos-mod-list">
            ${menuItem.modifiers.map(mod => `
              <label style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface); padding: 0.6rem 0.8rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); cursor: pointer;">
                <span style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem;">
                  <input type="checkbox" class="mod-checkbox" data-id="${mod.id}" data-name="${mod.name}" data-price="${mod.price}" style="accent-color: var(--accent-primary-light);">
                  <span>${mod.name}</span>
                </span>
                <span class="mono-font" style="font-weight: 700; color: var(--accent-primary-light);">+${formatCurrency(mod.price)}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="document.getElementById('pos-mod-modal').remove()">Skip Modifiers</button>
          <button class="btn btn-primary" id="btn-confirm-pos-mods">Add to Cart</button>
        </div>
      </div>
    </div>
  `;

  const dummy = document.createElement('div');
  dummy.innerHTML = modalHtml;
  document.body.appendChild(dummy.firstElementChild);

  const confirmBtn = document.getElementById('btn-confirm-pos-mods');
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      document.querySelectorAll('#pos-mod-list .mod-checkbox:checked').forEach(cb => {
        const modId = cb.dataset.id;
        const fullMod = menuItem.modifiers.find(m => m.id === modId);
        if (fullMod) selectedMods.push(fullMod);
      });
      document.getElementById('pos-mod-modal').remove();
      addToCart(menuItem, recipe, selectedMods);
    };
  }
}

function addToCart(menuItem, recipe, selectedModifiers = []) {
  const modKey = selectedModifiers.map(m => m.id).sort().join('-');
  const existing = cart.find(c => c.menuItemId === menuItem.id && c.modKey === modKey);

  const modifierTotal = selectedModifiers.reduce((sum, m) => sum + (m.price || 0), 0);
  const unitPrice = (menuItem.price || 0) + modifierTotal;

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      menuItemId: menuItem.id,
      name: menuItem.name,
      basePrice: menuItem.price,
      unitPrice,
      taxCategory: menuItem.taxCategory || 'standard',
      qty: 1,
      menuItem,
      recipe,
      selectedModifiers,
      modKey
    });
  }

  playSound('beep');
  renderCart();
}

function renderCart() {
  const container = document.getElementById('pos-cart-items');
  const subtotalEl = document.getElementById('pos-cart-subtotal');
  const taxEl = document.getElementById('pos-cart-tax');
  const totalEl = document.getElementById('pos-cart-total');
  const checkoutBtn = document.getElementById('btn-pos-checkout');

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
        <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🛒</div>
        <div>Cart is empty</div>
        <div style="font-size: 0.75rem; margin-top: 0.25rem;">Select items from the menu grid to ring up sales</div>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = formatCurrency(0);
    if (taxEl) taxEl.textContent = formatCurrency(0);
    if (totalEl) totalEl.textContent = formatCurrency(0);
    if (checkoutBtn) checkoutBtn.disabled = true;
    return;
  }

  let subtotal = 0;
  let totalTax = 0;

  container.innerHTML = cart.map((item, index) => {
    const lineTotal = item.qty * item.unitPrice;
    subtotal += lineTotal;

    // Tax calculation
    const taxRate = item.taxCategory === 'liquor' ? 0.10 : item.taxCategory === 'zero' ? 0 : 0.08875;
    totalTax += lineTotal * taxRate;

    return `
      <div class="cart-item-row" style="padding: 0.6rem 0; border-bottom: 1px solid var(--border-subtle);">
        <div style="flex: 1;">
          <div style="font-weight: 600; font-size: 0.85rem;">${item.name}</div>
          ${item.selectedModifiers && item.selectedModifiers.length > 0 ? `
            <div style="font-size: 0.7rem; color: var(--accent-secondary);">
              + ${(item.selectedModifiers.map(m => m.name)).join(', ')}
            </div>
          ` : ''}
          <div style="font-size: 0.75rem; color: var(--accent-primary-light);" class="mono-font">${formatCurrency(item.unitPrice)} each</div>
        </div>
        
        <div style="display: flex; align-items: center; gap: 0.4rem;">
          <button class="btn btn-secondary btn-sm btn-qty-dec" data-idx="${index}" style="padding: 0.2rem 0.5rem;">-</button>
          <span class="mono-font" style="font-weight: 700; min-width: 20px; text-align: center;">${item.qty}</span>
          <button class="btn btn-secondary btn-sm btn-qty-inc" data-idx="${index}" style="padding: 0.2rem 0.5rem;">+</button>
        </div>

        <div class="mono-font" style="font-weight: 700; width: 65px; text-align: right; font-size: 0.9rem;">
          ${formatCurrency(lineTotal)}
        </div>
      </div>
    `;
  }).join('');

  const grandTotal = subtotal + totalTax;

  if (subtotalEl) subtotalEl.textContent = formatCurrency(subtotal);
  if (taxEl) taxEl.textContent = formatCurrency(totalTax);
  if (totalEl) totalEl.textContent = formatCurrency(grandTotal);
  if (checkoutBtn) checkoutBtn.disabled = false;

  // Cart Qty Modifiers
  container.querySelectorAll('.btn-qty-dec').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      if (cart[idx].qty > 1) {
        cart[idx].qty -= 1;
      } else {
        cart.splice(idx, 1);
      }
      renderCart();
    });
  });

  container.querySelectorAll('.btn-qty-inc').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      cart[idx].qty += 1;
      renderCart();
    });
  });
}

function processCheckout() {
  if (cart.length === 0) return;

  const depletions = [];
  let subtotal = 0;
  let totalTax = 0;

  // Loop through all cart items and deplete ingredients from inventory
  cart.forEach(cartItem => {
    const orderQty = cartItem.qty;
    subtotal += orderQty * cartItem.unitPrice;
    const taxRate = cartItem.taxCategory === 'liquor' ? 0.10 : cartItem.taxCategory === 'zero' ? 0 : 0.08875;
    totalTax += (orderQty * cartItem.unitPrice) * taxRate;

    const recipe = cartItem.recipe;

    // 1. Deplete recipe ingredients
    if (recipe && recipe.ingredients) {
      recipe.ingredients.forEach(ing => {
        if (ing.itemId) {
          const item = db.getItemById(ing.itemId);
          if (item) {
            const recipeTotalUnits = ing.qty * orderQty;
            const packageUnitsToDeduct = convertUom(recipeTotalUnits, ing.uom, item.packageUom);
            
            const prevStock = item.currentStock || 0;
            item.currentStock = Math.max(0, Math.round((prevStock - packageUnitsToDeduct) * 100) / 100);

            if (item.category === CATEGORIES.LIQUOR && item.openBottleTenths !== undefined) {
              const fullBottles = Math.floor(item.currentStock);
              const remainderTenths = item.currentStock - fullBottles;
              item.openBottleTenths = parseFloat(remainderTenths.toFixed(1));
            }

            db.saveItem(item);

            depletions.push({
              itemName: item.name,
              category: item.category,
              qtyDeducted: packageUnitsToDeduct,
              uom: item.packageUom,
              remainingStock: item.currentStock
            });
          }
        } else if (ing.subRecipeId) {
          const sub = db.getSubRecipeById(ing.subRecipeId);
          if (sub && sub.ingredients) {
            sub.ingredients.forEach(subIng => {
              if (subIng.itemId) {
                const item = db.getItemById(subIng.itemId);
                if (item) {
                  const subYield = sub.yieldQty || 1;
                  const portionOfSub = (ing.qty * orderQty) / subYield;
                  const rawUnits = subIng.qty * portionOfSub;
                  const pkgDeduct = convertUom(rawUnits, subIng.uom, item.packageUom);

                  item.currentStock = Math.max(0, Math.round(((item.currentStock || 0) - pkgDeduct) * 100) / 100);
                  db.saveItem(item);

                  depletions.push({
                    itemName: `${item.name} (via ${sub.name})`,
                    category: item.category,
                    qtyDeducted: pkgDeduct,
                    uom: item.packageUom,
                    remainingStock: item.currentStock
                  });
                }
              }
            });
          }
        }
      });
    }

    // 2. Deplete any modifier ingredients
    if (cartItem.selectedModifiers) {
      cartItem.selectedModifiers.forEach(mod => {
        if (mod.itemId) {
          const item = db.getItemById(mod.itemId);
          if (item) {
            const rawUnits = (mod.qty || 1) * orderQty;
            const pkgDeduct = convertUom(rawUnits, mod.uom || item.recipeUom, item.packageUom);
            item.currentStock = Math.max(0, Math.round(((item.currentStock || 0) - pkgDeduct) * 100) / 100);
            db.saveItem(item);

            depletions.push({
              itemName: `${item.name} (Modifier: ${mod.name})`,
              category: item.category,
              qtyDeducted: pkgDeduct,
              uom: item.packageUom,
              remainingStock: item.currentStock
            });
          }
        }
      });
    }
  });

  const txId = `SALE_${Date.now().toString(36).toUpperCase()}`;
  db.recordTransaction({
    id: txId,
    type: 'POS_SALE_DEPLETION',
    itemsSold: cart.map(c => ({ name: c.name, qty: c.qty, price: c.unitPrice })),
    subtotal: subtotal,
    tax: totalTax,
    total: subtotal + totalTax,
    depletions: depletions
  });

  playSound('success');

  // Open Receipt & Depletion Breakdown Modal
  showDepletionReceiptModal(txId, cart, depletions, subtotal, totalTax);

  // Clear Cart & refresh menu grid
  cart = [];
  renderCart();
  renderPosMenuGrid();
  showToast('Order processed & live BOM inventory depleted!', 'success');
}

function showDepletionReceiptModal(txId, cartSnapshot, depletions, subtotal, totalTax) {
  const modal = document.getElementById('pos-receipt-modal');
  if (!modal) return;

  const content = document.getElementById('pos-receipt-content');
  if (!content) return;

  const grandTotal = subtotal + totalTax;

  content.innerHTML = `
    <div style="text-align: center; border-bottom: 1px dashed var(--border-strong); padding-bottom: 1rem; margin-bottom: 1rem;">
      <div style="font-size: 1.25rem; font-weight: 800; letter-spacing: -0.02em;">⚡ VK CONTROLS POS Receipt</div>
      <div class="mono-font" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.2rem;">Receipt #${txId} • ${new Date().toLocaleTimeString()}</div>
    </div>

    <!-- Items Sold -->
    <div style="font-weight: 700; font-size: 0.85rem; text-transform: uppercase; color: var(--accent-primary-light); margin-bottom: 0.5rem;">
      Items Sold
    </div>
    <div style="display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem;">
      ${cartSnapshot.map(item => `
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
          <div>
            <span>${item.qty} &times; ${item.name}</span>
            ${item.selectedModifiers && item.selectedModifiers.length > 0 ? `
              <div style="font-size: 0.7rem; color: var(--accent-secondary);">
                + ${(item.selectedModifiers.map(m => m.name)).join(', ')}
              </div>
            ` : ''}
          </div>
          <span class="mono-font">${formatCurrency(item.qty * item.unitPrice)}</span>
        </div>
      `).join('')}
    </div>

    <div style="border-top: 1px solid var(--border-subtle); padding-top: 0.5rem; margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 0.25rem;">
      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted);">
        <span>Subtotal</span>
        <span class="mono-font">${formatCurrency(subtotal)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: var(--text-muted);">
        <span>Sales &amp; Liquor Tax</span>
        <span class="mono-font">${formatCurrency(totalTax)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: 800; color: var(--accent-primary-light); margin-top: 0.25rem;">
        <span>Total Paid</span>
        <span class="mono-font">${formatCurrency(grandTotal)}</span>
      </div>
    </div>

    <!-- Inventory Depletion Engine Ledger -->
    <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: var(--radius-md); padding: 1rem;">
      <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; font-weight: 700; color: #f87171; margin-bottom: 0.5rem;">
        <span>⚡ Automatic Inventory Depletion Log (${depletions.length} lines)</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 0.4rem; max-height: 160px; overflow-y: auto;">
        ${depletions.map(dep => `
          <div style="display: flex; justify-content: space-between; font-size: 0.75rem;">
            <span>${dep.itemName}</span>
            <span class="mono-font" style="color: #fca5a5; font-weight: 600;">
              -${formatNumber(dep.qtyDeducted, 3)} ${dep.uom} &rarr; Rem: ${formatNumber(dep.remainingStock, 2)}
            </span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  openModal('pos-receipt-modal');
}

function setupEventListeners() {
  const checkoutBtn = document.getElementById('btn-pos-checkout');
  if (checkoutBtn) checkoutBtn.addEventListener('click', processCheckout);

  const clearBtn = document.getElementById('btn-pos-clear-cart');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    cart = [];
    renderCart();
  });

  db.subscribe(() => {
    renderPosMenuGrid();
  });
}
