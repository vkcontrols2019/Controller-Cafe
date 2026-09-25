/**
 * CraftMatrix Pro Taproom & Draft Line Operations Module
 * Live 8-Tap draft tower with real-time keg depletion, pour audio, and draft line hygiene tracking.
 */

import { db } from '../store/db.js';
import { formatCurrency, formatNumber, showToast, openModal, closeModal, playSound } from '../utils/helpers.js';
import { srmToHex, getSrmColorName } from '../utils/brewingMath.js';

let selectedTapForModal = null;

export function initTaproomModule() {
  renderTaproomWall();
  renderDraftHygieneSummary();
  setupEventListeners();

  // Subscribe to DB updates
  db.subscribe(() => {
    renderTaproomWall();
    renderDraftHygieneSummary();
  });
}

export function renderTaproomWall() {
  const container = document.getElementById('taproom-wall-container');
  if (!container) return;

  const tapLines = db.getTapLines();

  container.innerHTML = tapLines.map(tap => {
    const fillPercent = Math.min(100, Math.max(0, Math.round((tap.pintsRemaining / tap.totalPintsCapacity) * 100)));
    const colorHex = srmToHex(tap.srm || 6);
    
    // Check line cleaning status (14-day standard)
    const cleanDate = new Date(tap.lastCleanedDate || Date.now());
    const daysSinceClean = Math.floor((Date.now() - cleanDate.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = daysSinceClean > 14;
    const isDueSoon = daysSinceClean >= 10 && !isOverdue;

    let cleanBadge = `<span class="badge badge-success" title="Cleaned ${daysSinceClean} days ago">🧼 Clean (${daysSinceClean}d)</span>`;
    if (isOverdue) {
      cleanBadge = `<span class="badge badge-danger blink-danger" title="Overdue! Cleaned ${daysSinceClean} days ago">⚠️ Flush Due (${daysSinceClean}d)</span>`;
    } else if (isDueSoon) {
      cleanBadge = `<span class="badge badge-warning" title="Clean due in ${14 - daysSinceClean} days">⚠️ Due Soon (${daysSinceClean}d)</span>`;
    }

    // Keg low warning
    const isLow = fillPercent < 20;

    return `
      <div class="tap-card ${isLow ? 'tap-card-low' : ''}" id="tap-card-${tap.id}">
        
        <!-- Tap Header with Handle -->
        <div class="tap-header">
          <div class="tap-number-badge">
            <span>TAP</span>
            <strong>#${tap.lineNum}</strong>
          </div>
          <div style="display: flex; gap: 0.4rem; align-items: center;">
            ${cleanBadge}
            <button class="btn btn-secondary btn-icon-only btn-sm btn-tap-edit" data-tap="${tap.id}" title="Tap fresh keg / Edit line">⚙️</button>
          </div>
        </div>

        <!-- Tap Handle Visual & Beer Details -->
        <div class="tap-beer-info">
          <div class="tap-color-pill" style="background: ${colorHex}; box-shadow: 0 0 10px ${colorHex}88;" title="SRM ${tap.srm}: ${getSrmColorName(tap.srm)}"></div>
          <div>
            <h4 class="tap-beer-title">${tap.beerName}</h4>
            <div class="tap-beer-meta">
              <span>${tap.style}</span> • 
              <strong>${tap.abvPercent}% ABV</strong>
            </div>
          </div>
        </div>

        <!-- Keg Level Cylinder & Gauge -->
        <div class="tap-gauge-container">
          <div class="tap-gauge-track">
            <div class="tap-gauge-fill" style="height: ${fillPercent}%; background: linear-gradient(180deg, ${colorHex}ee 0%, ${colorHex}aa 100%);">
              <div class="tap-gauge-foam"></div>
            </div>
            <div class="tap-gauge-overlay-text">
              <strong>${fillPercent}%</strong>
              <span style="font-size: 0.7rem;">${tap.pintsRemaining} / ${tap.totalPintsCapacity} Pints</span>
            </div>
          </div>

          <!-- Specs Panel -->
          <div class="tap-specs">
            <div class="tap-spec-row">
              <span class="tap-spec-label">Keg Type:</span>
              <span class="tap-spec-val">${tap.kegType === 'keg_sixtel' ? '1/6 BBL (Sixtel)' : '1/2 BBL (Full)'}</span>
            </div>
            <div class="tap-spec-row">
              <span class="tap-spec-label">Vol Left:</span>
              <span class="tap-spec-val mono-font">${tap.currentGal} Gal</span>
            </div>
            <div class="tap-spec-row">
              <span class="tap-spec-label">Gas / Reg:</span>
              <span class="tap-spec-val mono-font">${tap.currentPsi} PSI (${tap.gasBlend.split(' ')[0]})</span>
            </div>
            <div class="tap-spec-row">
              <span class="tap-spec-label">Temp:</span>
              <span class="tap-spec-val mono-font">${tap.currentTempF}°F</span>
            </div>
          </div>
        </div>

        <!-- Instant Pour Depletion Controls -->
        <div class="tap-pour-controls">
          <button class="btn btn-primary btn-sm btn-pour" data-tap="${tap.id}" data-type="pint_16oz" title="Pour 16oz standard pint">
            🍺 Pint (${formatCurrency(tap.pricePint)})
          </button>
          <button class="btn btn-secondary btn-sm btn-pour" data-tap="${tap.id}" data-type="flight_4oz" title="Pour 4oz taster flight">
            🍷 Flight (${formatCurrency(tap.priceFlight)})
          </button>
          <button class="btn btn-secondary btn-sm btn-pour" data-tap="${tap.id}" data-type="growler_64oz" title="Fill 64oz growler">
            🍶 Growler (${formatCurrency(tap.priceGrowler)})
          </button>
        </div>

        <!-- Line Maintenance Action -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 0.5rem; margin-top: 0.5rem; font-size: 0.75rem;">
          <span style="color: var(--text-muted);">Last Flushed: ${tap.lastCleanedDate}</span>
          <button class="btn-clean-line text-link-btn" data-tap="${tap.id}" style="color: var(--accent-secondary); background: none; border: none; cursor: pointer; font-weight: 600;">
            🧼 Log Flush
          </button>
        </div>

      </div>
    `;
  }).join('');

  attachTapEventListeners();
}

function attachTapEventListeners() {
  const container = document.getElementById('taproom-wall-container');
  if (!container) return;

  // Pour buttons
  container.querySelectorAll('.btn-pour').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tapId = btn.dataset.tap;
      const pourType = btn.dataset.type;

      playSound('pour');

      const result = db.pourFromTap(tapId, pourType);
      if (!result) return;

      if (!result.success) {
        showToast(result.message, 'error');
        return;
      }

      // Visual feedback pulse on card
      const card = document.getElementById(`tap-card-${tapId}`);
      if (card) {
        card.classList.add('pour-active-pulse');
        setTimeout(() => card.classList.remove('pour-active-pulse'), 600);
      }

      showToast(`Poured ${result.label} of ${result.line.beerName} (${formatCurrency(result.price)})`, 'success', 2500);
    });
  });

  // Tap config / Keg swap button
  container.querySelectorAll('.btn-tap-edit').forEach(btn => {
    btn.addEventListener('click', () => {
      openTapAssignModal(btn.dataset.tap);
    });
  });

  // Clean Line button
  container.querySelectorAll('.btn-clean-line').forEach(btn => {
    btn.addEventListener('click', () => {
      const tapId = btn.dataset.tap;
      const line = db.cleanTapLine(tapId);
      if (line) {
        playSound('success');
        showToast(`Line #${line.lineNum} (${line.beerName}) chemical flush logged!`, 'success');
      }
    });
  });
}

export function renderDraftHygieneSummary() {
  const container = document.getElementById('draft-hygiene-summary');
  if (!container) return;

  const tapLines = db.getTapLines();
  let totalPintsRemaining = 0;
  let totalPintsCapacity = 0;
  let overdueCleanings = 0;

  tapLines.forEach(t => {
    totalPintsRemaining += (t.pintsRemaining || 0);
    totalPintsCapacity += (t.totalPintsCapacity || 124);
    const cleanDate = new Date(t.lastCleanedDate || Date.now());
    const daysSince = Math.floor((Date.now() - cleanDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince > 14) overdueCleanings++;
  });

  const percentOnTap = totalPintsCapacity > 0 ? Math.round((totalPintsRemaining / totalPintsCapacity) * 100) : 0;

  container.innerHTML = `
    <div class="kpi-card" style="--card-accent: var(--accent-primary-light);">
      <div class="kpi-header">
        <span class="kpi-title">Active Draft Lines</span>
        <div class="kpi-icon">🍺</div>
      </div>
      <div class="kpi-value mono-font">${tapLines.length} / 8</div>
      <div class="kpi-subtext">All Lines Online &amp; Pressurized</div>
    </div>

    <div class="kpi-card" style="--card-accent: var(--status-success);">
      <div class="kpi-header">
        <span class="kpi-title">Total Pints on Tap</span>
        <div class="kpi-icon">📊</div>
      </div>
      <div class="kpi-value mono-font">${totalPintsRemaining} <span style="font-size: 1rem; color: var(--text-muted);">(${percentOnTap}% full)</span></div>
      <div class="kpi-subtext">Across 8 Draft Faucets</div>
    </div>

    <div class="kpi-card" style="--card-accent: ${overdueCleanings > 0 ? 'var(--status-danger)' : 'var(--status-success)'};">
      <div class="kpi-header">
        <span class="kpi-title">Line Hygiene Compliance</span>
        <div class="kpi-icon">🧼</div>
      </div>
      <div class="kpi-value mono-font" style="color: ${overdueCleanings > 0 ? 'var(--status-danger)' : 'var(--status-success)'};">
        ${overdueCleanings > 0 ? `${overdueCleanings} OVERDUE` : '100% COMPLIANT'}
      </div>
      <div class="kpi-subtext">14-Day Caustic Line Flush Rule</div>
    </div>
  `;
}

function openTapAssignModal(tapId) {
  selectedTapForModal = tapId;
  const line = db.getTapLineById(tapId);
  if (!line) return;

  const content = document.getElementById('tap-assign-content');
  if (!content) return;

  const batches = db.getBrewBatches();

  content.innerHTML = `
    <div style="margin-bottom: 1rem; padding: 0.75rem; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
      <strong>Configuring Tap Line #${line.lineNum}</strong>
    </div>

    <div class="form-group">
      <label class="form-label">Select Finished Brew Batch (Or Custom Beverage)</label>
      <select class="form-input" id="tap-assign-batch-select">
        <option value="">-- Manual Custom Beverage / Keg --</option>
        ${batches.map(b => `
          <option value="${b.id}" ${line.batchId === b.id ? 'selected' : ''}>
            ${b.beerName} (${b.style}) - Status: ${b.status.toUpperCase()}
          </option>
        `).join('')}
      </select>
    </div>

    <div class="form-grid-2">
      <div class="form-group">
        <label class="form-label">Beer / Beverage Name *</label>
        <input type="text" class="form-input" id="tap-form-name" value="${line.beerName}">
      </div>
      <div class="form-group">
        <label class="form-label">Style / Description *</label>
        <input type="text" class="form-input" id="tap-form-style" value="${line.style}">
      </div>
    </div>

    <div class="form-grid-3">
      <div class="form-group">
        <label class="form-label">Keg Vessel Size *</label>
        <select class="form-input" id="tap-form-kegtype">
          <option value="keg_half_bbl" ${line.kegType === 'keg_half_bbl' ? 'selected' : ''}>1/2 BBL (15.5 Gal / 124 Pts)</option>
          <option value="keg_sixtel" ${line.kegType === 'keg_sixtel' ? 'selected' : ''}>1/6 BBL (5.16 Gal / 41 Pts)</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">ABV %</label>
        <input type="number" step="0.1" class="form-input" id="tap-form-abv" value="${line.abvPercent}">
      </div>
      <div class="form-group">
        <label class="form-label">Color (SRM 1-40)</label>
        <input type="number" min="1" max="40" class="form-input" id="tap-form-srm" value="${line.srm || 6}">
      </div>
    </div>

    <div class="form-grid-3">
      <div class="form-group">
        <label class="form-label">Price / Pint ($)</label>
        <input type="number" step="0.25" class="form-input" id="tap-form-price-pint" value="${line.pricePint || 7.50}">
      </div>
      <div class="form-group">
        <label class="form-label">Price / Flight ($)</label>
        <input type="number" step="0.25" class="form-input" id="tap-form-price-flight" value="${line.priceFlight || 3.00}">
      </div>
      <div class="form-group">
        <label class="form-label">Price / Growler ($)</label>
        <input type="number" step="0.50" class="form-input" id="tap-form-price-growler" value="${line.priceGrowler || 19.00}">
      </div>
    </div>

    <div class="form-group">
      <label class="form-label">Regulator PSI Pressure</label>
      <input type="number" step="0.5" class="form-input" id="tap-form-psi" value="${line.currentPsi || 12.0}">
    </div>
  `;

  // Auto populate if batch selected
  const batchSelect = document.getElementById('tap-assign-batch-select');
  if (batchSelect) {
    batchSelect.addEventListener('change', () => {
      const selected = batches.find(b => b.id === batchSelect.value);
      if (selected) {
        document.getElementById('tap-form-name').value = selected.beerName;
        document.getElementById('tap-form-style').value = selected.style;
        document.getElementById('tap-form-abv').value = selected.estimatedAbv || 5.5;
      }
    });
  }

  openModal('tap-assign-modal');
}

function setupEventListeners() {
  const saveBtn = document.getElementById('btn-save-tap-assign');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      if (!selectedTapForModal) return;

      const beerName = document.getElementById('tap-form-name').value.trim();
      const style = document.getElementById('tap-form-style').value.trim();
      const kegType = document.getElementById('tap-form-kegtype').value;
      const abvPercent = parseFloat(document.getElementById('tap-form-abv').value) || 0;
      const srm = parseInt(document.getElementById('tap-form-srm').value) || 6;
      const pricePint = parseFloat(document.getElementById('tap-form-price-pint').value) || 7.50;
      const priceFlight = parseFloat(document.getElementById('tap-form-price-flight').value) || 3.00;
      const priceGrowler = parseFloat(document.getElementById('tap-form-price-growler').value) || 19.00;
      const currentPsi = parseFloat(document.getElementById('tap-form-psi').value) || 12.0;
      const batchId = document.getElementById('tap-assign-batch-select').value || null;

      if (!beerName) {
        showToast('Please enter a beverage name', 'error');
        return;
      }

      db.tapKegOnLine(selectedTapForModal, {
        beerName,
        style,
        kegType,
        abvPercent,
        srm,
        pricePint,
        priceFlight,
        priceGrowler,
        currentPsi,
        batchId
      });

      playSound('success');
      showToast(`Tapped fresh keg of ${beerName} on Tap #${selectedTapForModal.replace('tap_0', '')}!`, 'success');
      closeModal('tap-assign-modal');
    });
  }
}
