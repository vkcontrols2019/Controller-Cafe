/**
 * CraftMatrix Pro Master Application Controller
 */

import { db, CATEGORIES } from './store/db.js';
import { formatCurrency, showToast, closeModal } from './utils/helpers.js';
import { initInventoryModule } from './modules/inventory.js';
import { initSubRecipesModule } from './modules/subrecipes.js';
import { initRecipesModule } from './modules/recipes.js';
import { initMenuMasterModule } from './modules/menumaster.js';
import { initBreweryModule } from './modules/brewery.js';
import { initPosModule } from './modules/pos.js';
import { initAuditsModule } from './modules/audits.js';
import { initPurchasingModule } from './modules/purchasing.js';
import { initAnalyticsModule } from './modules/analytics.js';
import { initTaproomModule } from './modules/taproom.js';
import { initCommandPaletteModule } from './modules/commandPalette.js';
import { initScannerModule } from './modules/scanner.js';
import { initAuthModule, canAccessTab } from './modules/auth.js';

let activeTab = 'dashboard';

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  setupNavigation();
  setupGlobalModals();
  updateHeaderAndDashboardKpis();

  // Initialize all core & master sub-modules
  initInventoryModule();
  initSubRecipesModule();
  initRecipesModule();
  initMenuMasterModule();
  initBreweryModule();
  initTaproomModule();
  initPosModule();
  initAuditsModule();
  initPurchasingModule();
  initAnalyticsModule();
  initCommandPaletteModule();
  initScannerModule();

  // Initialize Authentication & Role-Based Access Control
  initAuthModule();

  // Subscribe to DB changes to update top KPI bar
  db.subscribe(() => {
    updateHeaderAndDashboardKpis();
  });

  console.log('VK CONTROLS with Item Master, Sub-Recipes, Recipe Cards, Menu Master & RBAC Auth initialized.');
}

function setupNavigation() {
  const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
  const panels = document.querySelectorAll('.tab-panel');
  const headerTitle = document.getElementById('header-view-title');
  const headerSubtitle = document.getElementById('header-view-subtitle');

  const titles = {
    'dashboard': { title: 'Executive Overview', sub: 'Hospitality & Brewhouse Operations Dashboard' },
    'inventory': { title: 'Item Master Catalog', sub: 'Raw Materials, Ingredients, UOMs, Locations & Par Levels' },
    'subrecipes': { title: 'Sub-Recipe Master Studio', sub: 'Prep Items, Sauces, Syrups, Batch Yields & Cost Rollups' },
    'recipes': { title: 'Recipe Card Studio', sub: 'Culinary Specs, Portion Costing (COGS), Allergens & Banquet Scaling' },
    'menumaster': { title: 'Menu Master & Engineering', sub: 'POS Sales Menu, Modifiers, 86\'d Availability & BCG Profitability Matrix' },
    'brewery': { title: 'Brewhouse & Fermentation', sub: 'Tank Monitoring, Gravity Logs & Packaging Runs' },
    'taproom': { title: 'Taproom & Live Draft Wall', sub: '8 Active Draft Lines, Real-Time Keg Depletion & Line Hygiene Compliance' },
    'pos': { title: 'POS Sales & Real-Time Depletion', sub: 'Interactive Sales Simulator with Automatic Multi-Level BOM Depletion' },
    'audits': { title: 'Cycle Counts & Stock Transfers', sub: 'Physical Audits, Bottle Tenths & Location Transfers' },
    'purchasing': { title: 'Purchasing & Vendor Receiving', sub: 'Purchase Orders, Par Deficits & 3-Way Invoices' },
    'analytics': { title: 'COGS & Compliance Reports', sub: 'Variance Analysis, TTB Excise & Financial Reports' }
  };

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = item.dataset.tab;
      if (!targetTab) return;

      if (!canAccessTab(targetTab)) {
        return;
      }

      activeTab = targetTab;

      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      panels.forEach(p => {
        p.classList.remove('active');
        if (p.id === `tab-${targetTab}`) {
          p.classList.add('active');
        }
      });

      if (headerTitle && titles[targetTab]) {
        headerTitle.textContent = titles[targetTab].title;
        headerSubtitle.textContent = titles[targetTab].sub;
      }
    });
  });
}

function setupGlobalModals() {
  // Modal backdrop click to close
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('open');
      }
    });
  });

  // Modal close buttons (✕)
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal-overlay');
      if (modal) modal.classList.remove('open');
    });
  });

  // Escape key to close open modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
    }
  });
}

function updateHeaderAndDashboardKpis() {
  const items = db.getItems();
  const subRecipes = db.getSubRecipes();
  const recipes = db.getRecipes();
  const menuItems = db.getMenuItems();
  const batches = db.getBrewBatches();

  // Stock value
  const totalValuation = items.reduce((sum, i) => sum + ((i.currentStock || 0) * (i.packageCost || 0)), 0);
  
  // Low stock items
  const lowStockItems = items.filter(i => (i.currentStock || 0) <= (i.parLevel || 0));

  // Active batches
  const activeBatches = batches.filter(b => b.status !== 'packaged');

  // Update header and dashboard counters
  const headerVal = document.getElementById('header-stock-val');
  if (headerVal) headerVal.textContent = formatCurrency(totalValuation);

  const dashVal = document.getElementById('dash-stock-value');
  if (dashVal) dashVal.textContent = formatCurrency(totalValuation);

  const dashSkus = document.getElementById('dash-total-skus');
  if (dashSkus) dashSkus.textContent = items.length.toString();

  const dashLow = document.getElementById('dash-low-stock');
  if (dashLow) dashLow.textContent = lowStockItems.length.toString();

  const dashBatches = document.getElementById('dash-active-batches');
  if (dashBatches) dashBatches.textContent = activeBatches.length.toString();

  // Sidebar badge for low stock
  const badgeInventory = document.getElementById('nav-badge-inventory');
  if (badgeInventory) {
    badgeInventory.textContent = lowStockItems.length.toString();
    badgeInventory.style.display = lowStockItems.length > 0 ? 'inline-block' : 'none';
  }

  const badgeSubRecipes = document.getElementById('nav-badge-subrecipes');
  if (badgeSubRecipes) badgeSubRecipes.textContent = subRecipes.length.toString();

  const badgeRecipes = document.getElementById('nav-badge-recipes');
  if (badgeRecipes) badgeRecipes.textContent = recipes.length.toString();

  const badgeMenu = document.getElementById('nav-badge-menumaster');
  if (badgeMenu) badgeMenu.textContent = menuItems.length.toString();
}
