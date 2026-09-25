/**
 * CraftMatrix Pro Inventory Audits, Cycle Counts & Location Transfers
 */

import { db, CATEGORIES, LOCATIONS } from '../store/db.js';
import { formatCurrency, formatNumber, showToast, openModal, closeModal } from '../utils/helpers.js';

let auditLocation = 'loc_main_bar';
let auditCounts = {}; // { [itemId]: { count, tenths } }

export function initAuditsModule() {
  renderLocationPills();
  renderAuditSheet();
  setupEventListeners();
}

function renderLocationPills() {
  const container = document.getElementById('audit-location-pills');
  if (!container) return;

  container.innerHTML = LOCATIONS.map(loc => `
    <button class="filter-tab ${auditLocation === loc.id ? 'active' : ''}" data-loc="${loc.id}">
      <span>📍 ${loc.name}</span>
    </button>
  `).join('');

  container.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      auditLocation = btn.dataset.loc;
      renderLocationPills();
      renderAuditSheet();
    });
  });
}

export function renderAuditSheet() {
  const container = document.getElementById('audit-items-table-body');
  if (!container) return;

  let items = db.getItems().filter(i => (i.primaryLocationId || 'loc_main_bar') === auditLocation);

  if (items.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-muted);">
          No items currently registered in this storage location.
        </td>
      </tr>
    `;
    return;
  }

  // Initialize audit counts state if not set
  items.forEach(item => {
    if (!auditCounts[item.id]) {
      auditCounts[item.id] = {
        count: item.currentStock || 0,
        tenths: item.openBottleTenths !== undefined ? item.openBottleTenths : 0.5
      };
    }
  });

  container.innerHTML = items.map(item => {
    const isLiquor = item.category === CATEGORIES.LIQUOR;
    const currentRecorded = item.currentStock || 0;
    const auditVal = auditCounts[item.id].count;
    const variance = auditVal - currentRecorded;
    const dollarVariance = variance * (item.packageCost || 0);

    let varianceColor = 'var(--text-muted)';
    if (variance > 0) varianceColor = 'var(--status-success)';
    else if (variance < 0) varianceColor = 'var(--status-danger)';

    return `
      <tr>
        <td>
          <div style="font-weight: 600;">${item.name}</div>
          <div class="mono-font" style="font-size: 0.75rem; color: var(--text-muted);">${item.sku}</div>
        </td>
        <td>
          <span class="badge badge-${item.category}">${item.category.toUpperCase()}</span>
        </td>
        <td class="mono-font" style="font-weight: 600;">
          ${formatNumber(currentRecorded, 2)} ${item.packageUom}
        </td>
        <td style="min-width: 140px;">
          <input type="number" step="0.1" class="form-input audit-count-input" data-id="${item.id}" value="${auditVal}" style="padding: 0.4rem 0.6rem; font-family: 'JetBrains Mono'; font-weight: 700;">
        </td>
        <td>
          ${isLiquor ? `
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <input type="range" min="0" max="1" step="0.1" value="${auditCounts[item.id].tenths}" class="tenths-slider audit-tenths-slider" data-id="${item.id}" style="width: 80px;">
              <span class="mono-font audit-tenths-text" data-id="${item.id}" style="font-size: 0.8rem; font-weight: 700; color: var(--accent-primary-light);">
                ${(auditCounts[item.id].tenths * 10).toFixed(0)}/10
              </span>
            </div>
          ` : '<span style="color: var(--text-muted); font-size: 0.8rem;">N/A (Sealed)</span>'}
        </td>
        <td class="mono-font" style="font-weight: 700; color: ${varianceColor};">
          ${variance >= 0 ? '+' : ''}${formatNumber(variance, 2)} (${formatCurrency(dollarVariance)})
        </td>
      </tr>
    `;
  }).join('');

  // Attach input listeners
  container.querySelectorAll('.audit-count-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const id = e.target.dataset.id;
      auditCounts[id].count = parseFloat(e.target.value) || 0;
      renderAuditSheet();
    });
  });

  container.querySelectorAll('.audit-tenths-slider').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const id = e.target.dataset.id;
      const val = parseFloat(e.target.value);
      auditCounts[id].tenths = val;
      const textEl = container.querySelector(`.audit-tenths-text[data-id="${id}"]`);
      if (textEl) textEl.textContent = `${(val * 10).toFixed(0)}/10`;
    });
  });
}

function commitAuditCounts() {
  let items = db.getItems().filter(i => (i.primaryLocationId || 'loc_main_bar') === auditLocation);
  let adjustedCount = 0;

  items.forEach(item => {
    const auditData = auditCounts[item.id];
    if (auditData) {
      const newStock = auditData.count;
      const delta = newStock - item.currentStock;

      if (Math.abs(delta) > 0.001) {
        adjustedCount++;
        item.currentStock = newStock;
        if (item.category === CATEGORIES.LIQUOR) {
          item.openBottleTenths = auditData.tenths;
        }
        db.saveItem(item);

        db.recordTransaction({
          itemId: item.id,
          itemName: item.name,
          type: 'CYCLE_COUNT_AUDIT',
          deltaQty: delta,
          newStockQty: newStock,
          notes: `Audit conducted at ${LOCATIONS.find(l => l.id === auditLocation)?.name}`
        });
      }
    }
  });

  renderAuditSheet();
  showToast(`Cycle count committed! ${adjustedCount} items updated with variance ledger entries.`, 'success');
}

export function openTransferModal() {
  const modal = document.getElementById('stock-transfer-modal');
  if (!modal) return;

  const content = document.getElementById('stock-transfer-content');
  if (!content) return;

  const items = db.getItems();

  content.innerHTML = `
    <div class="form-group">
      <label class="form-label">Select Item to Transfer</label>
      <select class="form-select" id="xfer-item-select">
        ${items.map(it => `
          <option value="${it.id}">${it.name} (Cur: ${formatNumber(it.currentStock, 1)} ${it.packageUom})</option>
        `).join('')}
      </select>
    </div>

    <div class="form-grid-2">
      <div class="form-group">
        <label class="form-label">Source Location</label>
        <select class="form-select" id="xfer-source">
          ${LOCATIONS.map(l => `<option value="${l.id}">${l.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Destination Location</label>
        <select class="form-select" id="xfer-dest">
          ${LOCATIONS.map((l, idx) => `<option value="${l.id}" ${idx === 1 ? 'selected' : ''}>${l.name}</option>`).join('')}
        </select>
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Transfer Quantity</label>
      <input type="number" step="0.5" class="form-input" id="xfer-qty" value="1" placeholder="Quantity">
    </div>

    <div class="form-group">
      <label class="form-label">Transfer Reason / Slip #</label>
      <input type="text" class="form-input" id="xfer-notes" placeholder="e.g. Bar restock from Cellar before evening shift">
    </div>
  `;

  openModal('stock-transfer-modal');

  const confirmBtn = document.getElementById('btn-confirm-transfer');
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      const itemId = document.getElementById('xfer-item-select').value;
      const srcId = document.getElementById('xfer-source').value;
      const destId = document.getElementById('xfer-dest').value;
      const qty = parseFloat(document.getElementById('xfer-qty').value) || 0;
      const notes = document.getElementById('xfer-notes').value.trim();

      if (srcId === destId) {
        showToast('Source and destination cannot be identical', 'error');
        return;
      }

      const item = db.getItemById(itemId);
      if (!item) return;

      const srcName = LOCATIONS.find(l => l.id === srcId)?.name;
      const destName = LOCATIONS.find(l => l.id === destId)?.name;

      db.recordTransaction({
        itemId: item.id,
        itemName: item.name,
        type: 'INTERNAL_LOCATION_TRANSFER',
        deltaQty: qty,
        fromLocation: srcName,
        toLocation: destName,
        notes: notes || `Transferred ${qty} ${item.packageUom} from ${srcName} to ${destName}`
      });

      closeModal('stock-transfer-modal');
      showToast(`Transferred ${qty} ${item.packageUom} of ${item.name} to ${destName}!`, 'success');
    };
  }
}

function setupEventListeners() {
  const commitBtn = document.getElementById('btn-commit-audit');
  if (commitBtn) commitBtn.addEventListener('click', commitAuditCounts);

  const transferBtn = document.getElementById('btn-open-transfer');
  if (transferBtn) transferBtn.addEventListener('click', openTransferModal);

  db.subscribe(() => {
    renderAuditSheet();
  });
}
