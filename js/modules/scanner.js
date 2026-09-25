/**
 * CraftMatrix Pro Barcode / QR Scanner & Label Generator
 * Printable high-density asset labels and interactive optical barcode scanner simulator.
 */

import { db } from '../store/db.js';
import { formatCurrency, showToast, openModal, closeModal, playSound } from '../utils/helpers.js';

let scannedItem = null;

export function initScannerModule() {
  setupScannerUI();
  setupLabelPrinterUI();

  // Listen for custom open events
  window.addEventListener('scanner:open', () => {
    resetScannerState();
  });

  window.addEventListener('label-printer:open', () => {
    renderLabelSheet();
  });
}

function setupScannerUI() {
  const triggerBtn = document.getElementById('header-scan-btn');
  if (triggerBtn) {
    triggerBtn.addEventListener('click', () => {
      openModal('scanner-modal');
      resetScannerState();
    });
  }

  const manualInput = document.getElementById('scanner-manual-input');
  const manualBtn = document.getElementById('btn-scanner-manual-submit');

  if (manualBtn && manualInput) {
    manualBtn.addEventListener('click', () => {
      processBarcodeValue(manualInput.value.trim());
    });

    manualInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        processBarcodeValue(manualInput.value.trim());
      }
    });
  }

  const quickScanSelect = document.getElementById('scanner-sample-select');
  if (quickScanSelect) {
    quickScanSelect.addEventListener('change', () => {
      if (quickScanSelect.value) {
        processBarcodeValue(quickScanSelect.value);
      }
    });
  }
}

function resetScannerState() {
  scannedItem = null;
  const resultContainer = document.getElementById('scanner-result-box');
  const manualInput = document.getElementById('scanner-manual-input');
  const sampleSelect = document.getElementById('scanner-sample-select');

  if (resultContainer) {
    resultContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 1rem;">
        Point barcode towards target reticle or choose a SKU from the quick selector.
      </div>
    `;
  }

  if (manualInput) manualInput.value = '';
  
  if (sampleSelect) {
    const items = db.getItems();
    sampleSelect.innerHTML = `
      <option value="">-- Choose Sample SKU to Simulate Scan --</option>
      ${items.map(i => `<option value="${i.sku}">${i.sku} - ${i.name}</option>`).join('')}
    `;
  }
}

function processBarcodeValue(skuOrId) {
  if (!skuOrId) return;

  const items = db.getItems();
  const item = items.find(i => i.sku.toLowerCase() === skuOrId.toLowerCase() || i.id.toLowerCase() === skuOrId.toLowerCase());

  playSound('scan');

  const resultContainer = document.getElementById('scanner-result-box');
  const laserBeam = document.querySelector('.scanner-laser-beam');

  if (laserBeam) {
    laserBeam.classList.add('scanner-laser-success');
    setTimeout(() => laserBeam.classList.remove('scanner-laser-success'), 800);
  }

  if (!item) {
    if (resultContainer) {
      resultContainer.innerHTML = `
        <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid var(--status-danger); border-radius: var(--radius-md); padding: 1rem; text-align: center;">
          <div style="font-weight: 700; color: var(--status-danger);">⚠️ Barcode Not Found</div>
          <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">No catalog SKU matches: <code>${skuOrId}</code></div>
        </div>
      `;
    }
    return;
  }

  scannedItem = item;

  if (resultContainer) {
    resultContainer.innerHTML = `
      <div class="card" style="background: var(--bg-surface-elevated); border: 1px solid var(--accent-primary-light); padding: 1rem; border-radius: var(--radius-md);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div>
            <div style="font-size: 0.75rem; font-weight: 700; color: var(--accent-primary-light);">${item.sku}</div>
            <h4 style="margin: 0.2rem 0; font-size: 1.05rem;">${item.name}</h4>
            <div style="font-size: 0.8rem; color: var(--text-muted);">
              Category: <strong>${item.category.toUpperCase()}</strong> • Zone: <strong>${item.storageZone || 'Primary'}</strong>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-primary);">${item.currentStock} <span style="font-size: 0.8rem; font-weight: 400; color: var(--text-muted);">${item.packageUom}</span></div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">Par: ${item.parLevel} ${item.packageUom}</div>
          </div>
        </div>

        <!-- Quick Actions Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 1rem; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem;">
          <button class="btn btn-secondary btn-sm" id="btn-scan-add-stock">
            ➕ Receive (+1 ${item.packageUom})
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-scan-deduct-stock">
            ➖ Waste / Use (-1 ${item.packageUom})
          </button>
          <button class="btn btn-secondary btn-sm" id="btn-scan-view-inventory">
            📦 Stock Ledger
          </button>
          <button class="btn btn-primary btn-sm" id="btn-scan-pos-ring">
            ⚡ Add to POS Cart
          </button>
        </div>
      </div>
    `;

    // Attach Scan Action Listeners
    document.getElementById('btn-scan-add-stock')?.addEventListener('click', () => {
      item.currentStock = Math.round(((item.currentStock || 0) + 1) * 10) / 10;
      db.saveItem(item);
      db.recordTransaction({
        type: 'BARCODE_SCAN_RECEIVE',
        notes: `Quick Scan Received +1 ${item.packageUom} of ${item.name} (${item.sku})`,
        itemId: item.id
      });
      playSound('success');
      showToast(`Added +1 ${item.packageUom} to ${item.name}!`, 'success');
      processBarcodeValue(item.sku);
    });

    document.getElementById('btn-scan-deduct-stock')?.addEventListener('click', () => {
      if ((item.currentStock || 0) <= 0) {
        showToast('Item is already at 0 stock!', 'error');
        return;
      }
      item.currentStock = Math.round(((item.currentStock || 0) - 1) * 10) / 10;
      db.saveItem(item);
      db.recordTransaction({
        type: 'BARCODE_SCAN_DEPLETE',
        notes: `Quick Scan Depleted -1 ${item.packageUom} of ${item.name} (${item.sku})`,
        itemId: item.id
      });
      playSound('beep');
      showToast(`Deducted -1 ${item.packageUom} from ${item.name}!`, 'info');
      processBarcodeValue(item.sku);
    });

    document.getElementById('btn-scan-view-inventory')?.addEventListener('click', () => {
      closeModal('scanner-modal');
      const navInv = document.getElementById('nav-inventory');
      if (navInv) navInv.click();
      const searchBox = document.getElementById('inventory-search-input');
      if (searchBox) {
        searchBox.value = item.sku;
        searchBox.dispatchEvent(new Event('input'));
      }
    });

    document.getElementById('btn-scan-pos-ring')?.addEventListener('click', () => {
      closeModal('scanner-modal');
      const navPos = document.getElementById('nav-pos');
      if (navPos) navPos.click();
      showToast(`Item ${item.name} ready for POS billing!`, 'success');
    });
  }
}

function setupLabelPrinterUI() {
  const printSheetBtn = document.getElementById('btn-print-labels-action');
  if (printSheetBtn) {
    printSheetBtn.addEventListener('click', () => {
      window.print();
    });
  }

  const catFilter = document.getElementById('label-category-filter');
  if (catFilter) {
    catFilter.addEventListener('change', () => {
      renderLabelSheet(catFilter.value);
    });
  }
}

export function renderLabelSheet(filterCategory = 'all') {
  const container = document.getElementById('printable-labels-grid');
  if (!container) return;

  let items = db.getItems();
  if (filterCategory !== 'all') {
    items = items.filter(i => i.category === filterCategory);
  }

  container.innerHTML = items.map(item => {
    return `
      <div class="barcode-label-card">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px dashed #cbd5e1; padding-bottom: 0.35rem; margin-bottom: 0.4rem;">
          <div style="font-weight: 800; font-size: 0.8rem; color: #0f172a; text-transform: uppercase;">VK CONTROLS</div>
          <span style="font-size: 0.65rem; background: #e2e8f0; color: #334155; padding: 0.1rem 0.4rem; border-radius: 4px; font-weight: 700;">
            ${item.category.toUpperCase()}
          </span>
        </div>

        <div style="font-size: 0.85rem; font-weight: 700; color: #0f172a; line-height: 1.2; height: 2.4em; overflow: hidden;">
          ${item.name}
        </div>

        <!-- Visual Barcode Lines Generation -->
        <div class="barcode-graphic-container">
          <div class="barcode-lines">
            ${generateBarcodeStripePattern(item.sku)}
          </div>
          <div class="mono-font" style="font-size: 0.75rem; font-weight: 700; color: #0f172a; letter-spacing: 2px; margin-top: 0.2rem;">
            *${item.sku}*
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: #475569; margin-top: 0.35rem; border-top: 1px solid #f1f5f9; padding-top: 0.25rem;">
          <span>Zone: <strong>${item.storageZone?.split(' ')[0] || 'Main'}</strong></span>
          <span>Par: <strong>${item.parLevel} ${item.packageUom}</strong></span>
        </div>
      </div>
    `;
  }).join('');
}

function generateBarcodeStripePattern(sku) {
  let stripes = '';
  // Generate authentic looking Code 128 / Code 39 bar width patterns
  for (let i = 0; i < 28; i++) {
    const charCode = sku.charCodeAt(i % sku.length) || 65;
    const width = (charCode + i) % 3 === 0 ? '3px' : (charCode + i) % 2 === 0 ? '2px' : '1px';
    const isSpace = i % 4 === 0;
    stripes += `<span style="display: inline-block; width: ${width}; height: 28px; background: ${isSpace ? 'transparent' : '#0f172a'}; margin-right: 1px;"></span>`;
  }
  return stripes;
}
