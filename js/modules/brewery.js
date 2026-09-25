/**
 * CraftMatrix Pro Brewery & Fermentation Production Engine
 */

import { db, CATEGORIES } from '../store/db.js';
import { formatNumber, showToast, openModal, closeModal, generateId } from '../utils/helpers.js';

export function initBreweryModule() {
  renderTanksGrid();
  renderBatchesTimeline();
  setupEventListeners();
}

export function renderTanksGrid() {
  const container = document.getElementById('brewery-tanks-container');
  if (!container) return;

  const batches = db.getBrewBatches();

  const tanks = [
    {
      id: 'tank_fv_01',
      name: 'Fermenter #1 (FV-01)',
      capacityBbl: 15.0,
      activeBatch: batches.find(b => b.tankId === 'tank_fv_01' && b.status !== 'packaged')
    },
    {
      id: 'tank_fv_02',
      name: 'Fermenter #2 (FV-02)',
      capacityBbl: 10.0,
      activeBatch: batches.find(b => b.tankId === 'tank_fv_02' && b.status !== 'packaged')
    },
    {
      id: 'tank_bt_01',
      name: 'Brite Tank #1 (BT-01)',
      capacityBbl: 15.0,
      activeBatch: batches.find(b => b.tankId === 'tank_bt_01' && b.status !== 'packaged')
    },
    {
      id: 'tank_bt_02',
      name: 'Brite Tank #2 (BT-02)',
      capacityBbl: 10.0,
      activeBatch: null // Empty tank
    }
  ];

  container.innerHTML = tanks.map(tank => {
    const batch = tank.activeBatch;
    const isOccupied = !!batch;
    const fillPercent = isOccupied ? Math.min(100, Math.round(((batch.availableVolumeBbl || batch.targetVolumeBbl) / tank.capacityBbl) * 100)) : 0;

    let statusBadge = '<span class="badge badge-success">READY / CLEAN</span>';
    let liquidColor = 'linear-gradient(180deg, rgba(148, 163, 184, 0.4) 0%, rgba(71, 85, 105, 0.6) 100%)';

    if (isOccupied) {
      if (batch.status === 'fermenting') {
        statusBadge = '<span class="badge badge-warning">FERMENTING</span>';
        liquidColor = 'linear-gradient(180deg, #d97706 0%, #b45309 100%)';
      } else if (batch.status === 'conditioning') {
        statusBadge = '<span class="badge badge-info">CONDITIONING</span>';
        liquidColor = 'linear-gradient(180deg, #0284c7 0%, #0369a1 100%)';
      } else if (batch.status === 'brite_tank') {
        statusBadge = '<span class="badge badge-success">BRITE / PACKAGING</span>';
        liquidColor = 'linear-gradient(180deg, #eab308 0%, #ca8a04 100%)';
      }
    }

    return `
      <div class="tank-card">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-weight: 700; font-size: 1rem; color: var(--text-primary);">${tank.name}</div>
          ${statusBadge}
        </div>

        <!-- Tank Vessel Cylinder Visual -->
        <div class="tank-vessel-visual">
          <div class="tank-liquid" style="height: ${fillPercent}%; background: ${liquidColor};"></div>
          <div class="tank-info-overlay">
            <div style="font-size: 1.4rem; font-weight: 800; color: #fff;">${fillPercent}%</div>
            <div style="font-size: 0.75rem; color: #f1f5f9; font-weight: 600;">
              ${isOccupied ? `${batch.availableVolumeBbl || batch.targetVolumeBbl} / ${tank.capacityBbl} BBL` : `0 / ${tank.capacityBbl} BBL (Empty)`}
            </div>
          </div>
        </div>

        ${isOccupied ? `
          <div style="background: var(--bg-surface); padding: 0.75rem; border-radius: var(--radius-md); font-size: 0.8rem; display: flex; flex-direction: column; gap: 0.35rem;">
            <div style="font-weight: 700; color: var(--accent-primary-light);">${batch.beerName}</div>
            <div style="color: var(--text-secondary);">${batch.style} • Batch <span class="mono-font">${batch.batchNumber}</span></div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.25rem; border-top: 1px solid var(--border-subtle); padding-top: 0.35rem;">
              <div>Grav: <strong class="mono-font">${batch.currentGravity?.toFixed(3) || 'N/A'}</strong></div>
              <div>Temp: <strong class="mono-font">${batch.currentTempF || 68}°F</strong></div>
              <div>Est ABV: <strong class="mono-font" style="color: var(--status-success);">${batch.estimatedAbv || 5.0}%</strong></div>
              <div>pH: <strong class="mono-font">${batch.phLevel || 4.2}</strong></div>
            </div>
          </div>

          <div style="display: flex; gap: 0.5rem; margin-top: auto;">
            <button class="btn btn-secondary btn-sm btn-tank-log" data-batch="${batch.id}" style="flex: 1;">📝 Log Gravity</button>
            ${batch.status === 'brite_tank' ? `
              <button class="btn btn-primary btn-sm btn-tank-pack" data-batch="${batch.id}" style="flex: 1;">📦 Package</button>
            ` : `
              <button class="btn btn-secondary btn-sm btn-tank-advance" data-batch="${batch.id}" style="flex: 1;">⏩ Advance</button>
            `}
          </div>
        ` : `
          <div style="background: var(--bg-surface); padding: 1.5rem 0.75rem; border-radius: var(--radius-md); text-align: center; color: var(--text-muted); font-size: 0.8rem;">
            Vessel is sanitized and available for brew transfer.
          </div>
          <button class="btn btn-secondary btn-sm btn-assign-tank" data-tank="${tank.id}" style="margin-top: auto;">+ Assign New Batch</button>
        `}
      </div>
    `;
  }).join('');

  // Attach event handlers
  container.querySelectorAll('.btn-tank-log').forEach(btn => {
    btn.addEventListener('click', () => openGravityLogModal(btn.dataset.batch));
  });

  container.querySelectorAll('.btn-tank-pack').forEach(btn => {
    btn.addEventListener('click', () => openPackagingModal(btn.dataset.batch));
  });

  container.querySelectorAll('.btn-tank-advance').forEach(btn => {
    btn.addEventListener('click', () => handleAdvanceBatchStage(btn.dataset.batch));
  });

  container.querySelectorAll('.btn-assign-tank').forEach(btn => {
    btn.addEventListener('click', () => openNewBatchModal(btn.dataset.tank));
  });
}

export function renderBatchesTimeline() {
  const container = document.getElementById('brewery-batches-list');
  if (!container) return;

  const batches = db.getBrewBatches();

  container.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Batch # / Beer</th>
          <th>Style</th>
          <th>Vessel</th>
          <th>Volume</th>
          <th>OG / FG (Est. ABV)</th>
          <th>Stage Status</th>
          <th>Brew Date</th>
          <th style="text-align: right;">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${batches.map(batch => `
          <tr>
            <td>
              <div style="font-weight: 700; color: var(--text-primary);">${batch.beerName}</div>
              <div class="mono-font" style="font-size: 0.75rem; color: var(--accent-primary-light);">${batch.batchNumber}</div>
            </td>
            <td><span class="badge badge-brewery">${batch.style}</span></td>
            <td>${batch.tankName || 'Unassigned'}</td>
            <td class="mono-font">${batch.targetVolumeBbl} BBL</td>
            <td>
              <span class="mono-font">${batch.originalGravity} &rarr; ${batch.currentGravity}</span>
              <div style="font-size: 0.75rem; color: var(--status-success); font-weight: 600;">${batch.estimatedAbv}% ABV</div>
            </td>
            <td>
              <span class="badge badge-${batch.status === 'brite_tank' ? 'success' : 'warning'}">
                ${batch.status.toUpperCase()}
              </span>
            </td>
            <td style="color: var(--text-secondary); font-size: 0.85rem;">${batch.brewDate}</td>
            <td style="text-align: right;">
              <button class="btn btn-secondary btn-sm btn-batch-quicklog" data-id="${batch.id}">Log Data</button>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  container.querySelectorAll('.btn-batch-quicklog').forEach(btn => {
    btn.addEventListener('click', () => openGravityLogModal(btn.dataset.id));
  });
}

export function openGravityLogModal(batchId) {
  const batch = db.getBrewBatchById(batchId);
  if (!batch) return;

  const modal = document.getElementById('brew-log-modal');
  if (!modal) return;

  const content = document.getElementById('brew-log-content');
  if (!content) return;

  content.innerHTML = `
    <div style="margin-bottom: 1.25rem;">
      <div style="font-size: 1.15rem; font-weight: 700;">${batch.beerName} (${batch.batchNumber})</div>
      <div style="font-size: 0.8rem; color: var(--text-muted);">Current Tank: ${batch.tankName} • OG: ${batch.originalGravity}</div>
    </div>

    <div class="form-grid-3">
      <div class="form-group">
        <label class="form-label">Current Gravity (SG) *</label>
        <input type="number" step="0.001" class="form-input" id="log-gravity" value="${batch.currentGravity || 1.020}">
      </div>
      <div class="form-group">
        <label class="form-label">Vessel Temp (°F) *</label>
        <input type="number" step="0.5" class="form-input" id="log-temp" value="${batch.currentTempF || 68}">
      </div>
      <div class="form-group">
        <label class="form-label">pH Level</label>
        <input type="number" step="0.05" class="form-input" id="log-ph" value="${batch.phLevel || 4.3}">
      </div>
    </div>

    <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: var(--radius-md); padding: 1rem; margin-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; font-weight: 600;">Live Estimated ABV</div>
        <div id="live-abv-display" class="mono-font" style="font-size: 1.4rem; font-weight: 800; color: var(--status-success);">${batch.estimatedAbv}% ABV</div>
      </div>
      <div style="font-size: 0.75rem; color: var(--text-muted); text-align: right;">
        Formula: (OG - FG) &times; 131.25
      </div>
    </div>
  `;

  const gravInput = document.getElementById('log-gravity');
  const abvDisplay = document.getElementById('live-abv-display');
  gravInput.addEventListener('input', () => {
    const currentG = parseFloat(gravInput.value) || 1.010;
    const calcAbv = Math.max(0, ((batch.originalGravity - currentG) * 131.25)).toFixed(2);
    abvDisplay.textContent = `${calcAbv}% ABV`;
  });

  openModal('brew-log-modal');

  const saveBtn = document.getElementById('btn-save-brew-log');
  if (saveBtn) {
    saveBtn.onclick = () => {
      const curG = parseFloat(document.getElementById('log-gravity').value) || batch.currentGravity;
      const curT = parseFloat(document.getElementById('log-temp').value) || batch.currentTempF;
      const curPh = parseFloat(document.getElementById('log-ph').value) || batch.phLevel;
      const abv = parseFloat(((batch.originalGravity - curG) * 131.25).toFixed(2));

      batch.currentGravity = curG;
      batch.currentTempF = curT;
      batch.phLevel = curPh;
      batch.estimatedAbv = abv;

      db.saveBrewBatch(batch);
      closeModal('brew-log-modal');
      renderTanksGrid();
      renderBatchesTimeline();
      showToast(`Fermentation metrics logged for ${batch.beerName}`, 'success');
    };
  }
}

export function openPackagingModal(batchId) {
  const batch = db.getBrewBatchById(batchId);
  if (!batch) return;

  const modal = document.getElementById('brew-package-modal');
  if (!modal) return;

  const content = document.getElementById('brew-package-content');
  if (!content) return;

  const availableBbl = batch.availableVolumeBbl || batch.targetVolumeBbl;

  content.innerHTML = `
    <div style="margin-bottom: 1.25rem;">
      <div style="font-size: 1.15rem; font-weight: 700;">Package Batch: ${batch.beerName}</div>
      <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.2rem;">
        Available in Brite Tank: <strong class="mono-font" style="color: var(--accent-primary-light);">${availableBbl} BBL</strong> (~${(availableBbl * 31).toFixed(0)} Gallons)
      </div>
    </div>

    <div style="display: flex; flex-direction: column; gap: 1rem;">
      <div style="background: var(--bg-surface); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <div style="font-weight: 600; margin-bottom: 0.5rem;">Package into 1/2 BBL Kegs (15.5 Gal each)</div>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <input type="number" min="0" max="30" class="form-input" id="pack-half-kegs" value="10" style="width: 100px;">
          <span style="font-size: 0.85rem; color: var(--text-secondary);">&times; 1/2 BBL = <strong id="half-kegs-bbl">5.0</strong> BBL</span>
        </div>
      </div>

      <div style="background: var(--bg-surface); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <div style="font-weight: 600; margin-bottom: 0.5rem;">Package into 1/6 BBL Kegs / Sixtels (5.16 Gal each)</div>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <input type="number" min="0" max="90" class="form-input" id="pack-sixtel-kegs" value="12" style="width: 100px;">
          <span style="font-size: 0.85rem; color: var(--text-secondary);">&times; 1/6 BBL = <strong id="sixtel-kegs-bbl">2.0</strong> BBL</span>
        </div>
      </div>

      <div style="background: var(--bg-surface); padding: 1rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
        <div style="font-weight: 600; margin-bottom: 0.5rem;">Package into 16oz Pint Cans (4-Pack Cases)</div>
        <div style="display: flex; gap: 0.75rem; align-items: center;">
          <input type="number" min="0" max="500" class="form-input" id="pack-can-cases" value="50" style="width: 100px;">
          <span style="font-size: 0.85rem; color: var(--text-secondary);">Cases (24 cans/case) = <strong id="can-cases-bbl">3.87</strong> BBL</span>
        </div>
      </div>
    </div>
  `;

  openModal('brew-package-modal');

  const confirmBtn = document.getElementById('btn-confirm-packaging');
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      const halfKegs = parseInt(document.getElementById('pack-half-kegs').value) || 0;
      const sixtels = parseInt(document.getElementById('pack-sixtel-kegs').value) || 0;
      const canCases = parseInt(document.getElementById('pack-can-cases').value) || 0;

      const totalDeductedBbl = (halfKegs * 0.5) + (sixtels * (1/6)) + (canCases * 0.0774);

      batch.availableVolumeBbl = Math.max(0, availableBbl - totalDeductedBbl);
      if (batch.availableVolumeBbl <= 0.5) {
        batch.status = 'packaged';
      }
      db.saveBrewBatch(batch);

      // Create or update finished packaged goods inventory items
      const kegItem = {
        id: generateId('item_keg'),
        sku: `KEG-${batch.batchNumber}-1/2`,
        name: `${batch.beerName} (1/2 BBL Keg)`,
        category: CATEGORIES.BREWERY,
        subCategory: 'Packaged Kegs',
        primaryLocationId: 'loc_walkin',
        packageUom: 'keg_half_bbl',
        packageCost: 65.00,
        currentStock: halfKegs,
        parLevel: 5,
        abvPercent: batch.estimatedAbv
      };
      db.saveItem(kegItem);

      db.recordTransaction({
        itemId: kegItem.id,
        itemName: kegItem.name,
        type: 'BREWERY_PACKAGING',
        deltaQty: halfKegs,
        notes: `Packaged ${halfKegs} half-kegs and ${canCases} can cases from batch ${batch.batchNumber}`
      });

      closeModal('brew-package-modal');
      renderTanksGrid();
      renderBatchesTimeline();
      showToast(`Successfully packaged batch ${batch.batchNumber}! New finished kegs added to stock.`, 'success');
    };
  }
}

function handleAdvanceBatchStage(batchId) {
  const batch = db.getBrewBatchById(batchId);
  if (!batch) return;

  const stageOrder = ['planned', 'fermenting', 'conditioning', 'brite_tank', 'packaged'];
  const curIdx = stageOrder.indexOf(batch.status);

  if (curIdx < stageOrder.length - 1) {
    batch.status = stageOrder[curIdx + 1];
    if (batch.status === 'brite_tank') {
      batch.tankId = 'tank_bt_01';
      batch.tankName = 'Brite Tank #1 (15 BBL)';
    }
    db.saveBrewBatch(batch);
    renderTanksGrid();
    renderBatchesTimeline();
    showToast(`Batch ${batch.batchNumber} advanced to ${batch.status.toUpperCase()}`, 'info');
  }
}

export function openNewBatchModal(tankId = null) {
  const modal = document.getElementById('new-batch-modal');
  if (!modal) return;

  openModal('new-batch-modal');

  const startBtn = document.getElementById('btn-start-brew');
  if (startBtn) {
    startBtn.onclick = () => {
      const name = document.getElementById('new-beer-name').value.trim();
      const style = document.getElementById('new-beer-style').value.trim();
      const og = parseFloat(document.getElementById('new-beer-og').value) || 1.065;
      const bbl = parseFloat(document.getElementById('new-beer-vol').value) || 15.0;

      if (!name || !style) {
        showToast('Please enter beer name and style', 'error');
        return;
      }

      const newBatch = {
        id: generateId('batch'),
        batchNumber: `B2026-${Math.floor(10 + Math.random() * 90)}`,
        beerName: name,
        style: style,
        targetVolumeBbl: bbl,
        status: 'fermenting',
        tankId: tankId || 'tank_fv_01',
        tankName: tankId === 'tank_fv_02' ? 'Fermenter #2 (10 BBL)' : 'Fermenter #1 (15 BBL)',
        brewDate: new Date().toISOString().split('T')[0],
        originalGravity: og,
        currentGravity: og,
        targetFinalGravity: 1.012,
        currentTempF: 68.0,
        phLevel: 4.4,
        estimatedAbv: 0.0
      };

      // Deduct grain and hops from raw inventory
      const maltItem = db.getItems(CATEGORIES.BREWERY).find(i => i.subCategory === 'Malts & Grains');
      if (maltItem && maltItem.currentStock >= 10) {
        maltItem.currentStock -= 10;
        db.saveItem(maltItem);
      }

      db.saveBrewBatch(newBatch);
      closeModal('new-batch-modal');
      renderTanksGrid();
      renderBatchesTimeline();
      renderFermentationCurves();
      showToast(`Brew batch ${newBatch.batchNumber} initiated! Raw materials deducted from inventory.`, 'success');
    };
  }
}

/**
 * Interactive SVG Fermentation Kinetics & Gravity Decay Curve Visualizer
 */
export function renderFermentationCurves() {
  const container = document.getElementById('fermentation-curves-container');
  if (!container) return;

  const batches = db.getBrewBatches().filter(b => b.status !== 'packaged');

  if (batches.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
        No active fermentation vessels. Start a brew batch to view live attenuation kinetics.
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(360px, 1fr)); gap: 1.25rem;">
      ${batches.map(batch => {
        const og = batch.originalGravity || 1.060;
        const curG = batch.currentGravity || 1.015;
        const fg = batch.targetFinalGravity || 1.012;
        
        // Generate authentic 14-day fermentation curve points
        const points = [];
        const width = 320;
        const height = 120;
        const totalDays = 14;

        for (let day = 0; day <= totalDays; day++) {
          // Exponential decay curve: G(t) = FG + (OG - FG) * e^(-k*t)
          const decay = Math.exp(-0.35 * day);
          const gravityAtDay = fg + (og - fg) * decay;
          const x = (day / totalDays) * width;
          const y = height - ((gravityAtDay - 1.000) / (og - 1.000)) * (height - 20) - 10;
          points.push({ x, y, gravity: gravityAtDay.toFixed(3), day });
        }

        const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        const areaData = `${pathData} L ${width} ${height} L 0 ${height} Z`;

        return `
          <div class="card" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem;">
              <div>
                <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">${batch.beerName}</div>
                <div style="font-size: 0.75rem; color: var(--accent-primary-light); font-weight: 600;">
                  Batch ${batch.batchNumber} • ${batch.tankName}
                </div>
              </div>
              <span class="badge badge-${batch.status === 'brite_tank' ? 'success' : 'warning'}">${batch.status.toUpperCase()}</span>
            </div>

            <!-- SVG Graph -->
            <div style="position: relative; width: 100%; height: 130px; background: rgba(0,0,0,0.25); border-radius: var(--radius-sm); padding: 5px; overflow: hidden;">
              <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%; overflow: visible;">
                <defs>
                  <linearGradient id="grad-ferm-${batch.id}" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.45"/>
                    <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.0"/>
                  </linearGradient>
                </defs>
                <!-- Grid Lines -->
                <line x1="0" y1="30" x2="${width}" y2="30" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4"/>
                <line x1="0" y1="70" x2="${width}" y2="70" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4"/>
                
                <!-- Area & Line -->
                <path d="${areaData}" fill="url(#grad-ferm-${batch.id})" />
                <path d="${pathData}" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round"/>
                
                <!-- Current Progress Dot -->
                <circle cx="${points[6].x}" cy="${points[6].y}" r="4.5" fill="#10b981" stroke="#fff" stroke-width="1.5" />
              </svg>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; font-size: 0.75rem; color: var(--text-secondary);">
              <div>OG: <strong class="mono-font" style="color: var(--text-primary);">${og}</strong></div>
              <div>Current SG: <strong class="mono-font" style="color: var(--status-success);">${curG}</strong></div>
              <div>Target FG: <strong class="mono-font" style="color: var(--accent-primary-light);">${fg}</strong></div>
              <div>Est ABV: <strong class="mono-font" style="color: var(--text-primary);">${batch.estimatedAbv}%</strong></div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/**
 * Brewing Chemistry & Calculator Suite Setup
 */
export function setupBrewingCalculators() {
  const modal = document.getElementById('brewing-calc-modal');
  const triggerBtn = document.getElementById('btn-open-brewing-calc');

  if (triggerBtn) {
    triggerBtn.addEventListener('click', () => {
      openModal('brewing-calc-modal');
      calculateLiveIbu();
      calculateLiveSrm();
      calculateLivePlatoSg();
      calculateLiveKegPsi();
    });
  }

  // Live IBU calculator inputs
  ['calc-ibu-hop-oz', 'calc-ibu-aa', 'calc-ibu-mins', 'calc-ibu-sg', 'calc-ibu-gal'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calculateLiveIbu);
  });

  // Live SRM inputs
  document.getElementById('calc-srm-input')?.addEventListener('input', calculateLiveSrm);

  // Live Plato / SG inputs
  document.getElementById('calc-sg-input')?.addEventListener('input', () => {
    const sg = parseFloat(document.getElementById('calc-sg-input').value) || 1.000;
    const plato = (-1 * 616.868) + (1111.14 * sg) - (630.272 * Math.pow(sg, 2)) + (135.997 * Math.pow(sg, 3));
    const platoEl = document.getElementById('calc-plato-output');
    if (platoEl) platoEl.textContent = `${Math.max(0, plato).toFixed(1)} °P`;
  });

  // Live Keg PSI inputs
  ['calc-psi-temp', 'calc-psi-vols'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', calculateLiveKegPsi);
  });
}

function calculateLiveIbu() {
  const oz = parseFloat(document.getElementById('calc-ibu-hop-oz')?.value) || 2.0;
  const aa = parseFloat(document.getElementById('calc-ibu-aa')?.value) || 13.0;
  const mins = parseFloat(document.getElementById('calc-ibu-mins')?.value) || 60;
  const sg = parseFloat(document.getElementById('calc-ibu-sg')?.value) || 1.060;
  const gal = parseFloat(document.getElementById('calc-ibu-gal')?.value) || 31.0;

  const bigness = 1.65 * Math.pow(0.000125, (sg - 1.0));
  const timeFactor = (1 - Math.exp(-0.04 * mins)) / 4.15;
  const utilization = bigness * timeFactor;
  const ibu = (oz * (aa / 100) * utilization * 7489) / gal;

  const outEl = document.getElementById('calc-ibu-output');
  if (outEl) outEl.textContent = `${Math.max(0, ibu).toFixed(1)} IBU`;
}

function calculateLiveSrm() {
  const srm = parseFloat(document.getElementById('calc-srm-input')?.value) || 6;
  const hex = srmToHex(srm);
  const name = getSrmColorName(srm);

  const swatch = document.getElementById('calc-srm-swatch');
  const label = document.getElementById('calc-srm-name');

  if (swatch) {
    swatch.style.backgroundColor = hex;
    swatch.style.boxShadow = `0 0 15px ${hex}88`;
  }
  if (label) {
    label.innerHTML = `<strong>${name}</strong> <span class="mono-font" style="color: var(--text-muted); font-size: 0.8rem;">(${hex.toUpperCase()})</span>`;
  }
}

function calculateLivePlatoSg() {
  const sgInput = document.getElementById('calc-sg-input');
  if (sgInput) {
    sgInput.dispatchEvent(new Event('input'));
  }
}

function calculateLiveKegPsi() {
  const t = parseFloat(document.getElementById('calc-psi-temp')?.value) || 38;
  const v = parseFloat(document.getElementById('calc-psi-vols')?.value) || 2.5;

  const psi = -16.6999 + (0.010105 * t) + (0.00116512 * Math.pow(t, 2)) + 
              (0.173354 * t * v) + (4.24267 * v) - (0.0684226 * Math.pow(v, 2));

  const outEl = document.getElementById('calc-psi-output');
  if (outEl) outEl.textContent = `${Math.max(0, psi).toFixed(1)} PSI`;
}

function setupEventListeners() {
  const newBatchBtn = document.getElementById('btn-new-brew-batch');
  if (newBatchBtn) {
    newBatchBtn.addEventListener('click', () => openNewBatchModal());
  }

  setupBrewingCalculators();

  db.subscribe(() => {
    renderTanksGrid();
    renderBatchesTimeline();
    renderFermentationCurves();
  });
}

