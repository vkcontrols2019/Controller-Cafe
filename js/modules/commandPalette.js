/**
 * CraftMatrix Pro Spotlight Omni-Search & Command Bar (Ctrl+K / Cmd+K)
 * Lightning-fast keyboard-first navigation and global operational launcher.
 */

import { db } from '../store/db.js';
import { formatCurrency, openModal, closeModal, playSound } from '../utils/helpers.js';

let searchResults = [];
let activeIndex = 0;

export function initCommandPaletteModule() {
  setupKeyboardShortcuts();
  setupCommandPaletteUI();
}

function setupKeyboardShortcuts() {
  // Global Ctrl+K / Cmd+K listener
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      toggleCommandPalette();
    }
  });

  // Header Search Button
  const headerSearchBtn = document.getElementById('header-omni-search-btn');
  if (headerSearchBtn) {
    headerSearchBtn.addEventListener('click', () => {
      openCommandPalette();
    });
  }
}

export function openCommandPalette() {
  const modal = document.getElementById('omni-search-modal');
  const input = document.getElementById('omni-search-input');
  if (modal) {
    modal.classList.add('open');
    if (input) {
      input.value = '';
      input.focus();
      runOmniSearch('');
    }
  }
}

export function toggleCommandPalette() {
  const modal = document.getElementById('omni-search-modal');
  if (modal && modal.classList.contains('open')) {
    closeModal('omni-search-modal');
  } else {
    openCommandPalette();
  }
}

function setupCommandPaletteUI() {
  const input = document.getElementById('omni-search-input');

  if (input) {
    input.addEventListener('input', (e) => {
      runOmniSearch(e.target.value);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (searchResults.length > 0) {
          activeIndex = (activeIndex + 1) % searchResults.length;
          highlightActiveResult();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (searchResults.length > 0) {
          activeIndex = (activeIndex - 1 + searchResults.length) % searchResults.length;
          highlightActiveResult();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (searchResults[activeIndex]) {
          executeCommand(searchResults[activeIndex]);
        }
      }
    });
  }
}

function runOmniSearch(query) {
  const q = (query || '').toLowerCase().trim();
  const resultsContainer = document.getElementById('omni-search-results');
  if (!resultsContainer) return;

  const items = db.getItems();
  const subRecipes = db.getSubRecipes();
  const recipes = db.getRecipes();
  const menuItems = db.getMenuItems();
  const batches = db.getBrewBatches();
  const tapLines = db.getTapLines();

  let results = [];

  // Default Quick Commands when empty
  if (!q) {
    results = [
      { type: 'action', title: 'Ring Up POS Sale', subtitle: 'Launch POS & auto-deplete BOM inventory', icon: '⚡', action: () => switchTab('pos') },
      { type: 'action', title: 'Open Item Master Catalog', subtitle: 'View raw materials, UOMs, and par levels', icon: '📦', action: () => switchTab('inventory') },
      { type: 'action', title: 'Sub-Recipe Master Studio', subtitle: 'Manage kitchen/bar prep items, sauces & batches', icon: '🥣', action: () => switchTab('subrecipes') },
      { type: 'action', title: 'Recipe Card Studio', subtitle: 'Portion costing, plating specs & banquet scaling', icon: '📖', action: () => switchTab('recipes') },
      { type: 'action', title: 'Menu Master & BCG Matrix', subtitle: 'Sales items, modifiers & 86\'d stock manager', icon: '🍽️', action: () => switchTab('menumaster') },
      { type: 'action', title: 'Taproom Live Draft Wall', subtitle: 'View 8 active draft lines & live keg meters', icon: '🍺', action: () => switchTab('taproom') },
      { type: 'action', title: 'Brewing Chemistry & IBU Calculator', subtitle: 'Tinseth IBU, SRM color, Plato & Keg PSI tools', icon: '🧪', action: () => openBrewCalculators() },
      { type: 'action', title: 'Barcode & QR Scanner', subtitle: 'Scan bin labels & instant cycle audit lookup', icon: '📷', action: () => openBarcodeScanner() }
    ];
  } else {
    // 1. Search Actions
    const actionMatches = [
      { title: 'Item Master Catalog', kw: 'item master stock catalog raw materials inventory sku uom', icon: '📦', action: () => switchTab('inventory') },
      { title: 'Sub-Recipe Master Studio', kw: 'sub recipe prep batch sauce syrup semi finished', icon: '🥣', action: () => switchTab('subrecipes') },
      { title: 'Recipe Card Studio', kw: 'recipe card culinary specs dish cocktail bom costing', icon: '📖', action: () => switchTab('recipes') },
      { title: 'Menu Master & Engineering', kw: 'menu master bcg pos sales modifier pricing 86', icon: '🍽️', action: () => switchTab('menumaster') },
      { title: 'POS Sales Simulator', kw: 'pos sale register cashier ring up order', icon: '⚡', action: () => switchTab('pos') },
      { title: 'Taproom & Draft Wall', kw: 'taproom taps draft keg pour line', icon: '🍺', action: () => switchTab('taproom') },
      { title: 'Brewing Math & IBU Calculator', kw: 'ibu srm plato abv formula calculator gravity mash', icon: '🧪', action: () => openBrewCalculators() },
      { title: 'Barcode & QR Scanner', kw: 'barcode qr scan camera scanner', icon: '📷', action: () => openBarcodeScanner() },
      { title: 'Print Bin & Keg Labels', kw: 'label print qr sticker tag', icon: '🏷️', action: () => openLabelPrinter() }
    ].filter(a => a.title.toLowerCase().includes(q) || a.kw.includes(q));

    actionMatches.forEach(a => results.push({ type: 'action', title: a.title, subtitle: 'System Quick Command', icon: a.icon, action: a.action }));

    // 2. Search Item Master
    items.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)).slice(0, 4).forEach(i => {
      results.push({
        type: 'item',
        title: i.name,
        subtitle: `Item Master: ${i.sku} • Stock: ${i.currentStock} ${i.packageUom} • ${formatCurrency(i.packageCost)}`,
        icon: '📦',
        badge: 'ITEM MASTER',
        action: () => {
          switchTab('inventory');
          const searchBox = document.getElementById('inventory-search-input');
          if (searchBox) {
            searchBox.value = i.sku;
            searchBox.dispatchEvent(new Event('input'));
          }
        }
      });
    });

    // 3. Search Sub-Recipes
    subRecipes.filter(s => s.name.toLowerCase().includes(q) || (s.sku && s.sku.toLowerCase().includes(q))).slice(0, 3).forEach(s => {
      results.push({
        type: 'subrecipe',
        title: `[Prep] ${s.name}`,
        subtitle: `Yield: ${s.yieldQty} ${s.yieldUom} • Prep Time: ${s.prepTimeMins || 15}m`,
        icon: '🥣',
        badge: 'SUB-RECIPE',
        action: () => switchTab('subrecipes')
      });
    });

    // 4. Search Recipe Cards
    recipes.filter(r => r.name.toLowerCase().includes(q) || (r.sku && r.sku.toLowerCase().includes(q))).slice(0, 3).forEach(r => {
      results.push({
        type: 'recipe',
        title: r.name,
        subtitle: `Recipe Spec: ${r.category.toUpperCase()} • Price: ${formatCurrency(r.menuPrice || 0)}`,
        icon: '📖',
        badge: 'RECIPE CARD',
        action: () => switchTab('recipes')
      });
    });

    // 5. Search Menu Items
    menuItems.filter(m => m.name.toLowerCase().includes(q) || (m.code && m.code.toLowerCase().includes(q))).slice(0, 3).forEach(m => {
      results.push({
        type: 'menu',
        title: m.name,
        subtitle: `Menu Item: ${formatCurrency(m.price)} • ${m.department || 'Dining'}`,
        icon: '🍽️',
        badge: 'MENU ITEM',
        action: () => switchTab('menumaster')
      });
    });

    // 6. Search Brewery Batches
    batches.filter(b => b.beerName.toLowerCase().includes(q) || b.batchNumber.toLowerCase().includes(q)).slice(0, 2).forEach(b => {
      results.push({
        type: 'brewery',
        title: `${b.beerName} (${b.batchNumber})`,
        subtitle: `Status: ${b.status.toUpperCase()} • ${b.estimatedAbv}% ABV`,
        icon: '🌾',
        badge: 'BATCH',
        action: () => switchTab('brewery')
      });
    });

    // 7. Search Tap Lines
    tapLines.filter(t => t.beerName.toLowerCase().includes(q) || t.style.toLowerCase().includes(q)).slice(0, 2).forEach(t => {
      results.push({
        type: 'tap',
        title: `Tap #${t.lineNum}: ${t.beerName}`,
        subtitle: `${t.pintsRemaining} Pints Remaining (${t.abvPercent}% ABV)`,
        icon: '🍺',
        badge: 'TAPROOM',
        action: () => switchTab('taproom')
      });
    });
  }

  searchResults = results;
  activeIndex = 0;
  renderResultsList();
}

function renderResultsList() {
  const container = document.getElementById('omni-search-results');
  if (!container) return;

  if (searchResults.length === 0) {
    container.innerHTML = `
      <div style="padding: 2.5rem 1rem; text-align: center; color: var(--text-muted);">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
        <div>No matching items, sub-recipes, recipe cards, or menu items found.</div>
      </div>
    `;
    return;
  }

  container.innerHTML = searchResults.map((res, idx) => `
    <div class="omni-result-item ${idx === activeIndex ? 'active' : ''}" data-idx="${idx}">
      <div class="omni-result-icon">${res.icon}</div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
          ${res.title}
        </div>
        <div style="font-size: 0.75rem; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
          ${res.subtitle}
        </div>
      </div>
      ${res.badge ? `<span class="badge badge-info" style="font-size: 0.65rem;">${res.badge}</span>` : ''}
    </div>
  `).join('');

  container.querySelectorAll('.omni-result-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = parseInt(item.dataset.idx);
      if (searchResults[idx]) {
        executeCommand(searchResults[idx]);
      }
    });

    item.addEventListener('mouseenter', () => {
      activeIndex = parseInt(item.dataset.idx);
      highlightActiveResult();
    });
  });
}

function highlightActiveResult() {
  const container = document.getElementById('omni-search-results');
  if (!container) return;

  const items = container.querySelectorAll('.omni-result-item');
  items.forEach((it, idx) => {
    if (idx === activeIndex) {
      it.classList.add('active');
      it.scrollIntoView({ block: 'nearest' });
    } else {
      it.classList.remove('active');
    }
  });
}

function executeCommand(result) {
  closeModal('omni-search-modal');
  playSound('beep');
  if (result.action) {
    result.action();
  }
}

function switchTab(tabName) {
  const navBtn = document.getElementById(`nav-${tabName}`);
  if (navBtn) {
    navBtn.click();
  }
}

function openBrewCalculators() {
  openModal('brewing-calc-modal');
}

function openBarcodeScanner() {
  openModal('scanner-modal');
  window.dispatchEvent(new CustomEvent('scanner:open'));
}

function openLabelPrinter() {
  openModal('label-print-modal');
  window.dispatchEvent(new CustomEvent('label-printer:open'));
}
