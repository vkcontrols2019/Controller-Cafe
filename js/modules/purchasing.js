/**
 * CraftMatrix Pro Purchasing, Vendor Management & Receiving Module
 */

import { db, VENDORS, CATEGORIES } from '../store/db.js';
import { formatCurrency, formatNumber, formatDate, showToast, openModal, closeModal, generateId } from '../utils/helpers.js';

export function initPurchasingModule() {
  renderPoList();
  setupEventListeners();
}

export function renderPoList() {
  const container = document.getElementById('po-list-table-body');
  if (!container) return;

  const pos = db.getPurchaseOrders();

  if (pos.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">📋</div>
          <div>No purchase orders created yet.</div>
          <div style="font-size: 0.8rem; margin-top: 0.25rem;">Use "Auto-Generate from Par Deficits" or "Create New PO" to start.</div>
        </td>
      </tr>
    `;
    return;
  }

  container.innerHTML = pos.map(po => {
    const vendor = VENDORS.find(v => v.id === po.vendorId)?.name || 'Custom Supplier';
    const totalCost = (po.lineItems || []).reduce((acc, item) => acc + (item.qty * item.unitCost), 0);

    let statusBadge = '<span class="badge badge-warning">SENT TO VENDOR</span>';
    if (po.status === 'RECEIVED') {
      statusBadge = '<span class="badge badge-success">RECEIVED &amp; STOCKED</span>';
    } else if (po.status === 'DRAFT') {
      statusBadge = '<span class="badge badge-info">DRAFT</span>';
    }

    return `
      <tr>
        <td>
          <div style="font-weight: 700;" class="mono-font">${po.poNumber}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${formatDate(po.createdAt)}</div>
        </td>
        <td>
          <div style="font-weight: 600;">${vendor}</div>
        </td>
        <td>
          <span style="font-size: 0.85rem;">${po.lineItems?.length || 0} Items Ordered</span>
        </td>
        <td class="mono-font" style="font-weight: 700; color: var(--accent-primary-light);">
          ${formatCurrency(totalCost)}
        </td>
        <td>${statusBadge}</td>
        <td>
          <span style="font-size: 0.85rem; color: var(--text-secondary);">${po.expectedDeliveryDate || 'Standard Delivery'}</span>
        </td>
        <td style="text-align: right;">
          ${po.status !== 'RECEIVED' ? `
            <button class="btn btn-primary btn-sm btn-receive-po" data-id="${po.id}">
              📥 Receive &amp; Stock
            </button>
          ` : `
            <span style="color: var(--status-success); font-size: 0.8rem; font-weight: 600;">✓ Complete</span>
          `}
        </td>
      </tr>
    `;
  }).join('');

  container.querySelectorAll('.btn-receive-po').forEach(btn => {
    btn.addEventListener('click', () => handleReceivePO(btn.dataset.id));
  });
}

export function autoGeneratePoFromDeficits() {
  const items = db.getItems();
  const deficitItems = items.filter(i => (i.currentStock || 0) < (i.parLevel || 0));

  if (deficitItems.length === 0) {
    showToast('All inventory items are currently above par levels! No PO needed.', 'info');
    return;
  }

  // Group by vendor
  const vendorGroups = {};
  deficitItems.forEach(item => {
    const vId = item.vendorId || 'ven_sysco';
    if (!vendorGroups[vId]) vendorGroups[vId] = [];
    
    const needed = (item.parLevel || 10) - (item.currentStock || 0) + (item.reorderQty || 10);
    vendorGroups[vId].push({
      itemId: item.id,
      itemName: item.name,
      qty: Math.ceil(needed),
      uom: item.packageUom,
      unitCost: item.packageCost
    });
  });

  let createdCount = 0;
  const currentPos = db.getPurchaseOrders();

  Object.entries(vendorGroups).forEach(([vendorId, lineItems]) => {
    const newPo = {
      id: generateId('po'),
      poNumber: `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      vendorId: vendorId,
      status: 'SENT_TO_VENDOR',
      createdAt: new Date().toISOString(),
      expectedDeliveryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      lineItems: lineItems
    };

    currentPos.unshift(newPo);
    createdCount++;
  });

  db.data.purchaseOrders = currentPos;
  db.save();
  renderPoList();
  showToast(`Auto-generated ${createdCount} Purchase Orders based on par deficits!`, 'success');
}

export function handleReceivePO(poId) {
  const po = db.getPurchaseOrders().find(p => p.id === poId);
  if (!po || po.status === 'RECEIVED') return;

  // Receive line items and add to stock
  (po.lineItems || []).forEach(line => {
    const item = db.getItemById(line.itemId);
    if (item) {
      item.currentStock = (item.currentStock || 0) + line.qty;
      db.saveItem(item);

      db.recordTransaction({
        itemId: item.id,
        itemName: item.name,
        type: 'PO_RECEIVE_DELIVERY',
        deltaQty: line.qty,
        newStockQty: item.currentStock,
        notes: `Received from ${po.poNumber}`
      });
    }
  });

  po.status = 'RECEIVED';
  po.receivedAt = new Date().toISOString();
  db.save();

  renderPoList();
  showToast(`Purchase Order ${po.poNumber} received! Stock levels updated.`, 'success');
}

export function openNewPoModal() {
  const modal = document.getElementById('new-po-modal');
  if (!modal) return;

  const content = document.getElementById('new-po-content');
  if (!content) return;

  const items = db.getItems();

  content.innerHTML = `
    <div class="form-grid-2">
      <div class="form-group">
        <label class="form-label">Vendor / Supplier *</label>
        <select class="form-select" id="new-po-vendor">
          ${VENDORS.map(v => `<option value="${v.id}">${v.name} (${v.category.toUpperCase()})</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Expected Delivery Date</label>
        <input type="date" class="form-input" id="new-po-date" value="${new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}">
      </div>
    </div>

    <div style="font-weight: 700; font-size: 0.85rem; text-transform: uppercase; color: var(--accent-primary-light); margin: 1rem 0 0.5rem;">
      Quick Add Item to PO
    </div>

    <div class="form-grid-3">
      <div class="form-group">
        <label class="form-label">Item</label>
        <select class="form-select" id="po-item-pick">
          ${items.map(it => `<option value="${it.id}">${it.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Order Qty</label>
        <input type="number" step="1" class="form-input" id="po-item-qty" value="10">
      </div>
      <div class="form-group">
        <label class="form-label">Unit Cost ($)</label>
        <input type="number" step="0.1" class="form-input" id="po-item-cost" value="25.00">
      </div>
    </div>
  `;

  openModal('new-po-modal');

  const createBtn = document.getElementById('btn-create-po-confirm');
  if (createBtn) {
    createBtn.onclick = () => {
      const vendorId = document.getElementById('new-po-vendor').value;
      const deliveryDate = document.getElementById('new-po-date').value;
      const itemId = document.getElementById('po-item-pick').value;
      const qty = parseFloat(document.getElementById('po-item-qty').value) || 1;
      const cost = parseFloat(document.getElementById('po-item-cost').value) || 0;

      const item = db.getItemById(itemId);
      const newPo = {
        id: generateId('po'),
        poNumber: `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        vendorId: vendorId,
        status: 'SENT_TO_VENDOR',
        createdAt: new Date().toISOString(),
        expectedDeliveryDate: deliveryDate,
        lineItems: [
          {
            itemId: itemId,
            itemName: item ? item.name : 'Custom Item',
            qty: qty,
            uom: item ? item.packageUom : 'each',
            unitCost: cost
          }
        ]
      };

      const pos = db.getPurchaseOrders();
      pos.unshift(newPo);
      db.data.purchaseOrders = pos;
      db.save();

      closeModal('new-po-modal');
      renderPoList();
      showToast(`Purchase order ${newPo.poNumber} created and dispatched!`, 'success');
    };
  }
}

function setupEventListeners() {
  const autoPoBtn = document.getElementById('btn-auto-po');
  if (autoPoBtn) autoPoBtn.addEventListener('click', autoGeneratePoFromDeficits);

  const newPoBtn = document.getElementById('btn-new-po');
  if (newPoBtn) newPoBtn.addEventListener('click', openNewPoModal);

  db.subscribe(() => {
    renderPoList();
  });
}
