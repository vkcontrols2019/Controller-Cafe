/**
 * CraftMatrix Pro Analytics, COGS, Variance & Compliance Module
 */

import { db, CATEGORIES } from '../store/db.js';
import { formatCurrency, formatNumber, formatDateTime, showToast } from '../utils/helpers.js';

export function initAnalyticsModule() {
  renderFinancialKpis();
  renderCategoryBreakdown();
  renderVarianceReport();
  renderComplianceLogs();
  setupEventListeners();
}

export function renderFinancialKpis() {
  const items = db.getItems();
  const transactions = db.getTransactions();

  // Total inventory valuation
  const totalValuation = items.reduce((sum, i) => sum + ((i.currentStock || 0) * (i.packageCost || 0)), 0);

  // Sales revenue
  const salesTx = transactions.filter(t => t.type === 'POS_SALE_DEPLETION');
  const totalRevenue = salesTx.reduce((sum, t) => sum + (t.subtotal || 0), 0);

  const valEl = document.getElementById('analytics-total-val');
  const revEl = document.getElementById('analytics-total-rev');
  const txCountEl = document.getElementById('analytics-total-tx');

  if (valEl) valEl.textContent = formatCurrency(totalValuation);
  if (revEl) revEl.textContent = formatCurrency(totalRevenue);
  if (txCountEl) txCountEl.textContent = transactions.length.toString();
}

export function renderCategoryBreakdown() {
  const container = document.getElementById('analytics-category-breakdown');
  if (!container) return;

  const items = db.getItems();
  const catTotals = {
    [CATEGORIES.FOOD]: { name: 'Food & Perishables', icon: '🍗', val: 0, items: 0 },
    [CATEGORIES.LIQUOR]: { name: 'Liquor, Spirits & Wine', icon: '🥃', val: 0, items: 0 },
    [CATEGORIES.NAB]: { name: 'NAB (Non-Alcoholic)', icon: '🥤', val: 0, items: 0 },
    [CATEGORIES.TOBACCO]: { name: 'Tobacco & Cigars', icon: '🚬', val: 0, items: 0 },
    [CATEGORIES.BREWERY]: { name: 'Brewery Materials & Batches', icon: '🍺', val: 0, items: 0 }
  };

  let totalVal = 0;
  items.forEach(i => {
    const val = (i.currentStock || 0) * (i.packageCost || 0);
    totalVal += val;
    if (catTotals[i.category]) {
      catTotals[i.category].val += val;
      catTotals[i.category].items += 1;
    }
  });

  container.innerHTML = Object.entries(catTotals).map(([catKey, data]) => {
    const pct = totalVal > 0 ? (data.val / totalVal) * 100 : 0;
    return `
      <div style="background: var(--bg-surface); padding: 1rem 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle); display: flex; flex-direction: column; gap: 0.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 0.5rem; font-weight: 600;">
            <span>${data.icon}</span>
            <span>${data.name}</span>
          </div>
          <span class="mono-font" style="font-weight: 700; color: var(--accent-primary-light);">${formatCurrency(data.val)}</span>
        </div>

        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted);">
          <span>${data.items} Catalog SKUs</span>
          <span>${pct.toFixed(1)}% of Total Value</span>
        </div>

        <div class="stock-bar-track">
          <div class="stock-bar-fill" style="width: ${pct}%; background: var(--cat-${catKey}, var(--accent-primary-light));"></div>
        </div>
      </div>
    `;
  }).join('');
}

export function renderVarianceReport() {
  const container = document.getElementById('analytics-variance-table');
  if (!container) return;

  const items = db.getItems();

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Inventory SKU</th>
          <th>Category</th>
          <th>Theoretical Usage (POS)</th>
          <th>Recorded Actual Count</th>
          <th>Variance Delta</th>
          <th>Financial Impact ($)</th>
          <th>Audit Status</th>
        </tr>
      </thead>
      <tbody>
        ${items.slice(0, 8).map((item, idx) => {
          // Simulated theoretical vs actual variance calculation
          const theoUsage = (idx * 1.5 + 2.0);
          const actualUsage = theoUsage + (idx % 2 === 0 ? 0.3 : -0.1);
          const variance = actualUsage - theoUsage;
          const impact = variance * (item.packageCost || 0);

          let statusBadge = '<span class="badge badge-success">IN TOLERANCE</span>';
          if (variance > 0.4) {
            statusBadge = '<span class="badge badge-danger">OVER-POUR / SHRINK</span>';
          } else if (variance < -0.2) {
            statusBadge = '<span class="badge badge-info">UNDER-PORTION</span>';
          }

          return `
            <tr>
              <td>
                <div style="font-weight: 600;">${item.name}</div>
                <div class="mono-font" style="font-size: 0.75rem; color: var(--text-muted);">${item.sku}</div>
              </td>
              <td><span class="badge badge-${item.category}">${item.category.toUpperCase()}</span></td>
              <td class="mono-font">${theoUsage.toFixed(1)} ${item.packageUom}</td>
              <td class="mono-font">${actualUsage.toFixed(1)} ${item.packageUom}</td>
              <td class="mono-font" style="font-weight: 700; color: ${variance > 0 ? 'var(--status-danger)' : 'var(--status-success)'};">
                ${variance > 0 ? '+' : ''}${variance.toFixed(2)} ${item.packageUom}
              </td>
              <td class="mono-font" style="font-weight: 700; color: ${impact > 0 ? 'var(--status-danger)' : 'var(--status-success)'};">
                ${formatCurrency(impact)}
              </td>
              <td>${statusBadge}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

export function renderComplianceLogs() {
  const container = document.getElementById('analytics-compliance-logs');
  if (!container) return;

  const transactions = db.getTransactions();

  if (transactions.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        No regulatory transactions logged yet.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>Transaction ID</th>
          <th>Action Type</th>
          <th>Details / Ledger Notes</th>
          <th>Delta</th>
        </tr>
      </thead>
      <tbody>
        ${transactions.slice(0, 15).map(tx => `
          <tr>
            <td style="color: var(--text-muted); font-size: 0.8rem;">${formatDateTime(tx.timestamp)}</td>
            <td class="mono-font" style="font-weight: 600; font-size: 0.8rem;">${tx.id}</td>
            <td><span class="badge badge-info">${tx.type}</span></td>
            <td style="font-size: 0.85rem; color: var(--text-secondary);">${tx.notes || (tx.itemsSold ? `Sold ${tx.itemsSold.length} items` : 'Stock updated')}</td>
            <td class="mono-font" style="font-weight: 700;">${tx.deltaQty ? `${tx.deltaQty > 0 ? '+' : ''}${formatNumber(tx.deltaQty, 2)}` : '-'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

export function exportDatabaseJson() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db.data, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `craftmatrix_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  showToast('Database exported as JSON backup!', 'success');
}

export function resetDatabase() {
  if (confirm('Are you sure you want to reset all inventory, recipes, and brew batches to default factory demonstration data?')) {
    db.resetToDefaults();
    showToast('Database reset to defaults!', 'info');
    location.reload();
  }
}

/**
 * Predictive Run-Rate & Velocity Engine
 */
export function renderPredictiveRunRates() {
  const container = document.getElementById('analytics-run-rates-table');
  if (!container) return;

  const runRates = db.calculateRunRates();
  const criticalItems = runRates.filter(r => r.stockoutRisk === 'CRITICAL');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 1rem; background: var(--bg-surface-elevated); border-bottom: 1px solid var(--border-subtle);">
      <div style="font-size: 0.85rem; color: var(--text-secondary);">
        Predicted Stockout Velocity based on POS Burn Rate • <strong>${criticalItems.length} Critical Items</strong>
      </div>
      <button class="btn btn-primary btn-sm" id="btn-emergency-auto-po" style="font-size: 0.75rem;">
        ⚡ Auto-Generate Emergency PO (${criticalItems.length} Items)
      </button>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>Item / SKU</th>
          <th>Category</th>
          <th>On-Hand Stock</th>
          <th>Daily Burn Rate</th>
          <th>Days of Supply</th>
          <th>Stockout Risk Status</th>
          <th>Suggested Reorder</th>
        </tr>
      </thead>
      <tbody>
        ${runRates.map(r => {
          let riskBadge = '<span class="badge badge-success">HEALTHY</span>';
          if (r.stockoutRisk === 'CRITICAL') {
            riskBadge = '<span class="badge badge-danger blink-danger">CRITICAL (≤3d)</span>';
          } else if (r.stockoutRisk === 'WARNING') {
            riskBadge = '<span class="badge badge-warning">WARNING (≤7d)</span>';
          }

          return `
            <tr>
              <td>
                <div style="font-weight: 600; color: var(--text-primary);">${r.item.name}</div>
                <div class="mono-font" style="font-size: 0.75rem; color: var(--accent-primary-light);">${r.item.sku}</div>
              </td>
              <td><span class="badge badge-${r.item.category}">${r.item.category.toUpperCase()}</span></td>
              <td class="mono-font">${r.item.currentStock} ${r.item.packageUom}</td>
              <td class="mono-font">${r.dailyBurnRate} ${r.item.packageUom}/day</td>
              <td class="mono-font" style="font-weight: 700; color: ${r.stockoutRisk === 'CRITICAL' ? 'var(--status-danger)' : r.stockoutRisk === 'WARNING' ? 'var(--status-warning)' : 'var(--status-success)'};">
                ${r.daysRemaining > 90 ? '90+ days' : `${r.daysRemaining} days`}
              </td>
              <td>${riskBadge}</td>
              <td class="mono-font" style="font-weight: 700; color: var(--accent-primary-light);">
                ${r.recommendedOrderQty > 0 ? `+${r.recommendedOrderQty} ${r.item.packageUom}` : 'Par Satisfied'}
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  // Attach Emergency Auto-PO button
  document.getElementById('btn-emergency-auto-po')?.addEventListener('click', () => {
    const navPO = document.getElementById('nav-purchasing');
    if (navPO) navPO.click();
    setTimeout(() => {
      document.getElementById('btn-auto-po')?.click();
    }, 150);
    showToast('Auto-generated replenishment purchase order from predictive stockout deficits!', 'success');
  });
}

/**
 * Interactive SVG Sales & Margin Trend Visualizer
 */
export function renderSalesTrendsChart() {
  const container = document.getElementById('analytics-sales-trend-chart');
  if (!container) return;

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const sales = [1450, 1820, 2200, 2890, 4850, 6200, 4100];
  const cogs = [320, 410, 490, 640, 1080, 1380, 920];

  const maxVal = 7000;
  const width = 600;
  const height = 180;

  const salesPoints = sales.map((val, idx) => {
    const x = (idx / (days.length - 1)) * (width - 60) + 40;
    const y = height - (val / maxVal) * (height - 40) - 20;
    return { x, y, val };
  });

  const cogsPoints = cogs.map((val, idx) => {
    const x = (idx / (days.length - 1)) * (width - 60) + 40;
    const y = height - (val / maxVal) * (height - 40) - 20;
    return { x, y, val };
  });

  const salesPath = salesPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const salesArea = `${salesPath} L ${salesPoints[salesPoints.length - 1].x} ${height - 20} L ${salesPoints[0].x} ${height - 20} Z`;

  const cogsPath = cogsPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
      <div style="display: flex; gap: 1.5rem; font-size: 0.8rem;">
        <span style="display: flex; align-items: center; gap: 0.4rem;">
          <span style="display: inline-block; width: 12px; height: 12px; background: var(--accent-primary-light); border-radius: 3px;"></span>
          Gross Revenue (Simulated Weekly: $23,510)
        </span>
        <span style="display: flex; align-items: center; gap: 0.4rem;">
          <span style="display: inline-block; width: 12px; height: 12px; background: var(--status-danger); border-radius: 3px;"></span>
          COGS Food &amp; Beverage Cost ($5,240 / 22.3%)
        </span>
      </div>
      <span class="badge badge-success" style="font-weight: 700;">77.7% Gross Margin</span>
    </div>

    <div style="position: relative; width: 100%; height: 200px; background: rgba(0,0,0,0.25); border-radius: var(--radius-md); padding: 10px;">
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%;">
        <defs>
          <linearGradient id="grad-sales-rev" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.45"/>
            <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.0"/>
          </linearGradient>
        </defs>

        <!-- Grid -->
        <line x1="40" y1="40" x2="${width - 20}" y2="40" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4"/>
        <line x1="40" y1="90" x2="${width - 20}" y2="90" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4"/>
        <line x1="40" y1="140" x2="${width - 20}" y2="140" stroke="rgba(255,255,255,0.06)" stroke-dasharray="4"/>
        <line x1="40" y1="${height - 20}" x2="${width - 20}" y2="${height - 20}" stroke="rgba(255,255,255,0.15)"/>

        <!-- Revenue Area & Line -->
        <path d="${salesArea}" fill="url(#grad-sales-rev)" />
        <path d="${salesPath}" fill="none" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
        
        <!-- COGS Line -->
        <path d="${cogsPath}" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="3" stroke-linecap="round"/>

        <!-- Day Labels -->
        ${salesPoints.map((p, i) => `
          <circle cx="${p.x}" cy="${p.y}" r="4" fill="#f59e0b" stroke="#fff" stroke-width="1.5" />
          <text x="${p.x}" y="${height - 5}" font-size="10" fill="#94a3b8" text-anchor="middle">${days[i]}</text>
        `).join('')}
      </svg>
    </div>
  `;
}

/**
 * Federal TTB Form 5130.9 Generator Modal
 */
export function setupTtbModal() {
  const openBtn = document.getElementById('btn-open-ttb');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      renderTtbReport();
      openModal('ttb-report-modal');
    });
  }

  const printBtn = document.getElementById('btn-print-ttb');
  if (printBtn) {
    printBtn.addEventListener('click', () => {
      window.print();
    });
  }
}

export function renderTtbReport() {
  const content = document.getElementById('ttb-report-content');
  if (!content) return;

  const report = db.generateTTBReport();

  content.innerHTML = `
    <div style="background: #fff; color: #0f172a; padding: 1.5rem; border-radius: var(--radius-md); font-family: 'Times New Roman', serif;">
      
      <!-- TTB Official Header -->
      <div style="border-bottom: 2px solid #000; padding-bottom: 0.75rem; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: #475569;">DEPARTMENT OF THE TREASURY - TTB FORM 5130.9</div>
          <h2 style="font-size: 1.35rem; color: #000; margin-top: 0.2rem;">BREWER'S REPORT OF OPERATIONS (BROP)</h2>
        </div>
        <div style="text-align: right; font-size: 0.8rem; font-family: 'Inter', sans-serif;">
          <div>Notice No: <strong>${report.brewerNoticeNo}</strong></div>
          <div>Period: <strong>${report.reportingPeriod}</strong></div>
        </div>
      </div>

      <!-- TTB Part I Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; margin-bottom: 1.5rem;">
        <thead>
          <tr style="background: #f1f5f9; border-bottom: 2px solid #0f172a;">
            <th style="text-align: left; padding: 6px; border: 1px solid #cbd5e1;">Line No.</th>
            <th style="text-align: left; padding: 6px; border: 1px solid #cbd5e1;">Operational Category / Disposition</th>
            <th style="text-align: right; padding: 6px; border: 1px solid #cbd5e1;">Barrels (BBL / 31 Gal)</th>
          </tr>
        </thead>
        <tbody>
          ${report.lines.map(line => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 6px; border: 1px solid #cbd5e1; font-weight: 700; font-family: monospace;">${line.lineNo}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1;">${line.desc}</td>
              <td style="padding: 6px; border: 1px solid #cbd5e1; text-align: right; font-weight: 700; font-family: monospace;">
                ${formatNumber(line.bbl, 2)} BBL
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Tax Summary Box -->
      <div style="background: #f8fafc; border: 2px solid #0f172a; padding: 1rem; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
        <div>
          <div style="font-weight: 700; font-size: 0.95rem; color: #0f172a;">Part II: Small Brewer Reduced Federal Excise Tax Liability</div>
          <div style="font-size: 0.8rem; color: #475569;">Tax Rate: $3.50 per BBL for first 60,000 BBL produced</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.75rem; color: #475569;">TOTAL EXCISE TAX DUE</div>
          <div style="font-size: 1.4rem; font-weight: 900; color: #0f172a; font-family: monospace;">
            ${formatCurrency(report.estimatedTaxDue)}
          </div>
        </div>
      </div>

    </div>
  `;
}

export function initAnalyticsModule() {
  renderFinancialKpis();
  renderCategoryBreakdown();
  renderVarianceReport();
  renderComplianceLogs();
  renderPredictiveRunRates();
  renderSalesTrendsChart();
  setupTtbModal();
  setupEventListeners();
}

function setupEventListeners() {
  const exportBtn = document.getElementById('btn-export-json');
  if (exportBtn) exportBtn.addEventListener('click', exportDatabaseJson);

  const resetBtn = document.getElementById('btn-reset-db');
  if (resetBtn) resetBtn.addEventListener('click', resetDatabase);

  db.subscribe(() => {
    renderFinancialKpis();
    renderCategoryBreakdown();
    renderVarianceReport();
    renderComplianceLogs();
    renderPredictiveRunRates();
    renderSalesTrendsChart();
  });
}

