/**
 * ==============================================================================
 * COFFEE & RETAILS INVENTORY TRACKER - CORE APPLICATION LOGIC
 * ==============================================================================
 * Complete management system for Specialty Coffee Roasteries & Retail Operations.
 * Handles:
 *  - Green Coffee Inventory (Opening + Purchase - Issue to Roastery = Closing, Physical, Variance)
 *  - Roastery Unit (Green In, Roast Output, SKU-specific Roasting Loss %, Transfer to Packing)
 *  - Packing Department (Opening + Roastery In - Issues = Closing, Physical, Variance)
 *  - Department/Channel Issues Routing (Outlets, Web, B2B, Wastage, Grinder Loss, Lab, Future Depts)
 *  - Department Issues Summary & Analytics Breakdown
 *  - Retail Merchandise & Packaging Material Inventory
 *  - Dynamic Department & Location Registry ("Add Department for Future")
 *  - Item Master (SKU Catalog, Roasting Loss Target %, UOM, Reorder alerts)
 *  - Full CSV Import / Export & JSON Backup / Restore
 * ==============================================================================
 */

(function () {
  'use strict';

  // Storage Keys
  const STORAGE_KEY = 'coffee_retails_inventory_db_in_v3';

  // Default Seed Data (Indian Specialty Coffee & Rupee Base)
  const DEFAULT_SEED_DATA = {
    // 1. LOCATIONS & DEPARTMENTS (User requested dynamic future departments & adding cafe outlets!)
    departments: [
      { id: 'dept_outlet_indiranagar', name: 'Indiranagar Roastery Cafe (Bengaluru)', type: 'Outlet', code: 'BLR-IND', city: 'Bengaluru, Karnataka', format: 'Flagship Roastery & Cafe', manager: 'Vikram Rao (+91 98450 11223)', address: '#12, 100ft Rd, HAL 2nd Stage, Indiranagar', isSystem: true },
      { id: 'dept_outlet_bandra', name: 'Bandra West Outlet (Mumbai)', type: 'Outlet', code: 'BOM-BAN', city: 'Mumbai, Maharashtra', format: 'Espresso Bar & Cafe', manager: 'Ananya Deshmukh (+91 98200 44556)', address: 'Pali Hill, Bandra West', isSystem: true },
      { id: 'dept_outlet_connaught', name: 'Connaught Place Kiosk (New Delhi)', type: 'Outlet', code: 'DEL-CP', city: 'New Delhi', format: 'Express Coffee Kiosk', manager: 'Rohan Gupta (+91 98111 77889)', address: 'Inner Circle, Block C, Connaught Place', isSystem: true },
      { id: 'dept_website', name: 'Pan-India Website Sales (D2C)', type: 'Web Sales', code: 'SALES-WEB', isSystem: true },
      { id: 'dept_b2b', name: 'B2B Wholesale Accounts (Hotels & Cafes)', type: 'B2B Sales', code: 'SALES-B2B', isSystem: true },
      { id: 'dept_wastage', name: 'Wastage & Spillage', type: 'Wastage', code: 'LOSS-WASTE', isSystem: true },
      { id: 'dept_grinder', name: 'Grinder Loss & Dial-in Purge', type: 'Grinder Loss', code: 'LOSS-GRIND', isSystem: true },
      { id: 'dept_lab', name: 'Cupping Lab & Sensory QA', type: 'Lab Testing', code: 'QC-LAB', isSystem: true },
      { id: 'dept_events', name: 'Bangalore Coffee Fest & Pop-ups', type: 'Events', code: 'DEPT-POPUP', isSystem: false }
    ],

    // 2. ITEM MASTER (Indian Coffee Estates & Packaging in INR)
    items: [
      // Green Coffee (Raw Beans - UOM kg)
      { id: 'item_gc_att', sku: 'GC-CHIK-ATT', name: 'Attikan Estate Arabica (Chikmagalur)', category: 'Green Coffee', uom: 'kg', targetLossPct: 14.5, costPrice: 480.00, sellPrice: 0, reorderLevel: 100, origin: 'Biligirirangana / Chikmagalur, Karnataka' },
      { id: 'item_gc_coorg', sku: 'GC-COORG-SLN', name: 'SLN-79.5 Washed Arabica (Coorg)', category: 'Green Coffee', uom: 'kg', targetLossPct: 15.0, costPrice: 420.00, sellPrice: 0, reorderLevel: 120, origin: 'Coorg, Karnataka' },
      { id: 'item_gc_araku', sku: 'GC-ARAK-MIC', name: 'Araku Valley Gems Microlot', category: 'Green Coffee', uom: 'kg', targetLossPct: 14.0, costPrice: 580.00, sellPrice: 0, reorderLevel: 80, origin: 'Araku Valley, Andhra Pradesh' },
      { id: 'item_gc_babab', sku: 'GC-BABAB-NAT', name: 'Baba Budangiri Naturals (Single Estate)', category: 'Green Coffee', uom: 'kg', targetLossPct: 16.0, costPrice: 510.00, sellPrice: 0, reorderLevel: 150, origin: 'Baba Budangiri, Karnataka' },

      // Roasted Coffee (Bulk Roasted - UOM kg)
      { id: 'item_rc_att', sku: 'RC-ATT-LIGHT', name: 'Attikan Estate Filter Roast (Light)', category: 'Roasted Coffee', uom: 'kg', targetLossPct: 14.5, costPrice: 620.00, sellPrice: 1250.00, reorderLevel: 40, greenSku: 'GC-CHIK-ATT' },
      { id: 'item_rc_monsoon', sku: 'RC-MONSOON-MED', name: 'Malabar Monsoon Espresso Blend (Medium)', category: 'Roasted Coffee', uom: 'kg', targetLossPct: 15.5, costPrice: 550.00, sellPrice: 1100.00, reorderLevel: 60, greenSku: 'GC-COORG-SLN' },
      { id: 'item_rc_coorg', sku: 'RC-COORG-DARK', name: 'Coorg Estate Dark Roast (Filter/Moka)', category: 'Roasted Coffee', uom: 'kg', targetLossPct: 17.5, costPrice: 490.00, sellPrice: 950.00, reorderLevel: 50, greenSku: 'GC-BABAB-NAT' },

      // Packaged Coffee SKUs (Packing Department Finished Goods)
      { id: 'item_pk_att_250', sku: 'PKG-ATT-250G', name: 'Attikan Estate 250g Retail Pouch', category: 'Packaged Coffee', uom: 'units', targetLossPct: 0, costPrice: 185.00, sellPrice: 450.00, reorderLevel: 50, coffeeQtyPerUnitKg: 0.25 },
      { id: 'item_pk_mons_1kg', sku: 'PKG-MONS-1KG', name: 'Malabar Espresso 1kg Wholesale Bag', category: 'Packaged Coffee', uom: 'units', targetLossPct: 0, costPrice: 620.00, sellPrice: 1350.00, reorderLevel: 30, coffeeQtyPerUnitKg: 1.0 },
      { id: 'item_pk_drip_10pk', sku: 'PKG-DRIP-10PK', name: 'Specialty Easy-Pour Drip Bags (10pk)', category: 'Packaged Coffee', uom: 'units', targetLossPct: 0, costPrice: 160.00, sellPrice: 420.00, reorderLevel: 40, coffeeQtyPerUnitKg: 0.12 },

      // Packaging Material (Retail & Packing module)
      { id: 'item_mat_bag250', sku: 'MAT-BAG-250M', name: 'Standup 250g Degassing Valve Pouch', category: 'Packaging Material', uom: 'units', targetLossPct: 0, costPrice: 18.00, sellPrice: 0, reorderLevel: 500 },
      { id: 'item_mat_bag1kg', sku: 'MAT-BAG-1KGM', name: 'Kraft Brown 1kg Coffee Valve Bag', category: 'Packaging Material', uom: 'units', targetLossPct: 0, costPrice: 32.00, sellPrice: 0, reorderLevel: 300 },
      { id: 'item_mat_shipbox', sku: 'MAT-BOX-SHIP', name: 'Pan-India E-Commerce Shipping Box', category: 'Packaging Material', uom: 'units', targetLossPct: 0, costPrice: 24.00, sellPrice: 0, reorderLevel: 250 },

      // Retail Merchandise
      { id: 'item_ret_v60', sku: 'RET-HAR-V60', name: 'Hario V60 Ceramic Dripper 02 White', category: 'Retail Merchandise', uom: 'units', targetLossPct: 0, costPrice: 1250.00, sellPrice: 1850.00, reorderLevel: 15 },
      { id: 'item_ret_filter', sku: 'RET-HAR-FILT', name: 'Hario V60 Paper Filters (100 pack)', category: 'Retail Merchandise', uom: 'units', targetLossPct: 0, costPrice: 260.00, sellPrice: 420.00, reorderLevel: 40 },
      { id: 'item_ret_coldbrew', sku: 'RET-RTD-CB300', name: 'Artisan Cold Brew 330ml Glass Bottle', category: 'Retail Merchandise', uom: 'units', targetLossPct: 0, costPrice: 65.00, sellPrice: 160.00, reorderLevel: 60 }
    ],

    // 3. GREEN COFFEE INVENTORY
    // Formula: Opening + Purchases - Issue to Roastery = Closing Balance, Physical Balance, Variance
    greenCoffee: [
      {
        sku: 'GC-CHIK-ATT',
        opening: 450.0,
        purchases: 600.0,
        issuedToRoastery: 320.0,
        physical: 730.0, // Closing = 450 + 600 - 320 = 730 (Variance = 0)
        lotNumber: 'LOT-ATT-2026-K01',
        supplier: 'Attikan Estate Growers, Chikmagalur',
        lastUpdated: '2026-09-24'
      },
      {
        sku: 'GC-COORG-SLN',
        opening: 300.0,
        purchases: 800.0,
        issuedToRoastery: 450.0,
        physical: 648.0, // Closing = 300 + 800 - 450 = 650 (Variance = -2.0 kg shortage)
        lotNumber: 'LOT-CRG-2026-S79',
        supplier: 'Coorg Planters Specialty Union',
        lastUpdated: '2026-09-25'
      },
      {
        sku: 'GC-BABAB-NAT',
        opening: 500.0,
        purchases: 1000.0,
        issuedToRoastery: 600.0,
        physical: 900.0, // Closing = 900 (Variance = 0)
        lotNumber: 'LOT-BBD-2026-N12',
        supplier: 'Budan Highlands Plantation',
        lastUpdated: '2026-09-22'
      },
      {
        sku: 'GC-ARAK-MIC',
        opening: 200.0,
        purchases: 300.0,
        issuedToRoastery: 120.0,
        physical: 380.0, // Closing = 380 (Variance = 0)
        lotNumber: 'LOT-ARK-2026-G04',
        supplier: 'Araku Valley Tribal Cooperative',
        lastUpdated: '2026-09-20'
      }
    ],

    // 4. ROASTERY UNIT LOG & BATCHES
    // Green In -> Roasting -> Roasted Output -> Roasting Loss % (Deviation vs Standard) -> Transfer to Packing
    roasteryBatches: [
      {
        batchId: 'RB-2026-101',
        date: '2026-09-24 09:30',
        greenSku: 'GC-CHIK-ATT',
        roastedSku: 'RC-ATT-LIGHT',
        roasterId: 'Giesen W15A #1',
        roastProfile: 'Filter Light (Agtron 72)',
        greenInKg: 30.0,
        roastedOutKg: 25.65,
        roastLossKg: 4.35,
        roastLossPct: 14.5,
        targetLossPct: 14.5,
        lossStatus: 'Optimal',
        status: 'Transferred to Packing',
        notes: 'Charge: 195C, First Crack: 8m45s, Drop: 10m35s @ 206C'
      },
      {
        batchId: 'RB-2026-102',
        date: '2026-09-24 11:15',
        greenSku: 'GC-COORG-SLN',
        roastedSku: 'RC-MONSOON-MED',
        roasterId: 'Giesen W15A #1',
        roastProfile: 'Medium Espresso (Agtron 58)',
        greenInKg: 60.0,
        roastedOutKg: 50.7,
        roastLossKg: 9.3,
        roastLossPct: 15.5,
        targetLossPct: 15.0,
        lossStatus: 'Acceptable',
        status: 'Transferred to Packing',
        notes: 'Charge: 205C, First Crack: 9m10s, Drop: 11m40s @ 214C'
      },
      {
        batchId: 'RB-2026-103',
        date: '2026-09-25 08:45',
        greenSku: 'GC-BABAB-NAT',
        roastedSku: 'RC-COORG-DARK',
        roasterId: 'Probat UG22 #2',
        roastProfile: 'Dark Roast (Agtron 45)',
        greenInKg: 75.0,
        roastedOutKg: 61.88,
        roastLossKg: 13.12,
        roastLossPct: 17.5,
        targetLossPct: 17.0,
        lossStatus: 'Acceptable',
        status: 'Transferred to Packing',
        notes: 'Rich crema profile for traditional South Indian and espresso brews'
      }
    ],

    // 5. PACKING DEPARTMENT INVENTORY
    // Formula: Opening + Receiving (from Roastery) - Transfers/Issues to Depts = Closing, Physical, Variance
    packingInventory: [
      {
        sku: 'RC-ATT-LIGHT',
        name: 'Attikan Estate Filter Roast (Bulk Beans)',
        uom: 'kg',
        opening: 40.0,
        receiving: 25.65, // from Roastery batch RB-2026-101
        issues: {
          dept_outlet_indiranagar: 10.0,
          dept_outlet_bandra: 8.0,
          dept_outlet_connaught: 4.0,
          dept_website: 15.0,
          dept_b2b: 12.0,
          dept_wastage: 0.5,
          dept_grinder: 1.2,
          dept_lab: 1.0,
          dept_events: 2.0
        },
        physical: 13.95 // Total issues = 53.7 kg. Closing = 40 + 25.65 - 53.7 = 11.95. Physical = 13.95 => +2.0 kg variance
      },
      {
        sku: 'RC-MONSOON-MED',
        name: 'Malabar Monsoon Espresso (Bulk Beans)',
        uom: 'kg',
        opening: 55.0,
        receiving: 50.7,
        issues: {
          dept_outlet_indiranagar: 22.0,
          dept_outlet_bandra: 20.0,
          dept_outlet_connaught: 8.0,
          dept_website: 16.0,
          dept_b2b: 24.0,
          dept_wastage: 0.8,
          dept_grinder: 2.5,
          dept_lab: 0.5,
          dept_events: 3.0
        },
        physical: 8.9 // Total issues = 96.8 kg. Closing = 55 + 50.7 - 96.8 = 8.9 => Variance = 0
      },
      {
        sku: 'PKG-ATT-250G',
        name: 'Attikan Estate 250g Retail Pouch',
        uom: 'units',
        opening: 120,
        receiving: 80,
        issues: {
          dept_outlet_indiranagar: 40,
          dept_outlet_bandra: 35,
          dept_outlet_connaught: 15,
          dept_website: 55,
          dept_b2b: 20,
          dept_wastage: 2,
          dept_grinder: 0,
          dept_lab: 3,
          dept_events: 10
        },
        physical: 20 // Total issues = 180 units. Closing = 120 + 80 - 180 = 20 => Variance = 0
      },
      {
        sku: 'PKG-MONS-1KG',
        name: 'Malabar Espresso 1kg Wholesale Bag',
        uom: 'units',
        opening: 45,
        receiving: 40,
        issues: {
          dept_outlet_indiranagar: 15,
          dept_outlet_bandra: 12,
          dept_outlet_connaught: 4,
          dept_website: 10,
          dept_b2b: 38,
          dept_wastage: 1,
          dept_grinder: 0,
          dept_lab: 1,
          dept_events: 0
        },
        physical: 4 // Total issues = 81. Closing = 45 + 40 - 81 = 4 => Variance = 0
      }
    ],

    // 6. RETAIL & PACKAGING MATERIALS INVENTORY
    // Formula: Opening + Receiving (Purchases) - Issues = Closing, Physical, Variance
    retailInventory: [
      {
        sku: 'MAT-BAG-250M',
        name: 'Standup 250g Degassing Valve Pouch',
        category: 'Packaging Material',
        uom: 'units',
        opening: 1200,
        receiving: 2000,
        issues: {
          dept_outlet_indiranagar: 150,
          dept_outlet_bandra: 100,
          dept_website: 450,
          dept_b2b: 300,
          dept_wastage: 25
        },
        physical: 2175 // Total issues = 1025. Closing = 1200 + 2000 - 1025 = 2175 => Variance = 0
      },
      {
        sku: 'MAT-BOX-SHIP',
        name: 'Pan-India E-Commerce Shipping Box',
        category: 'Packaging Material',
        uom: 'units',
        opening: 400,
        receiving: 800,
        issues: {
          dept_website: 520,
          dept_b2b: 60,
          dept_wastage: 10
        },
        physical: 610 // Total issues = 590. Closing = 400 + 800 - 590 = 610 => Variance = 0
      },
      {
        sku: 'RET-HAR-V60',
        name: 'Hario V60 Ceramic Dripper 02 White',
        category: 'Retail Merchandise',
        uom: 'units',
        opening: 35,
        receiving: 50,
        issues: {
          dept_outlet_indiranagar: 14,
          dept_outlet_bandra: 12,
          dept_outlet_connaught: 6,
          dept_website: 25,
          dept_b2b: 8,
          dept_wastage: 1
        },
        physical: 19 // Total issues = 66. Closing = 35 + 50 - 66 = 19 => Variance = 0
      },
      {
        sku: 'RET-RTD-CB300',
        name: 'Artisan Cold Brew 330ml Glass Bottle',
        category: 'Retail Merchandise',
        uom: 'units',
        opening: 100,
        receiving: 180,
        issues: {
          dept_outlet_indiranagar: 80,
          dept_outlet_bandra: 60,
          dept_outlet_connaught: 45,
          dept_website: 35,
          dept_b2b: 20,
          dept_wastage: 4
        },
        physical: 36 // Total issues = 244. Closing = 100 + 180 - 244 = 36 => Variance = 0
      }
    ],

    // 7. COMPREHENSIVE TRANSACTION AUDIT LOG
    transactions: [
      { id: 'TXN-1001', date: '2026-09-24 08:30', module: 'Green Coffee', type: 'Purchase Receiving', sku: 'GC-CHIK-ATT', qty: 600, uom: 'kg', ref: 'PO-2026-BLR-01', notes: 'Attikan Estate Lot ATT-2026-K01 received' },
      { id: 'TXN-1002', date: '2026-09-24 09:15', module: 'Green Coffee', type: 'Issue to Roastery', sku: 'GC-CHIK-ATT', qty: 30, uom: 'kg', ref: 'RB-2026-101', notes: 'Staged for Filter Light Roast batch' },
      { id: 'TXN-1003', date: '2026-09-24 10:00', module: 'Roastery', type: 'Roast Output Completed', sku: 'RC-ATT-LIGHT', qty: 25.65, uom: 'kg', ref: 'RB-2026-101', notes: '14.5% loss, transferred to packing' },
      { id: 'TXN-1004', date: '2026-09-24 11:30', module: 'Packing', type: 'Department Issue', sku: 'RC-ATT-LIGHT', qty: 15, uom: 'kg', ref: 'WEB-ORD-8821', destination: 'Pan-India Website Sales (D2C)' },
      { id: 'TXN-1005', date: '2026-09-24 14:00', module: 'Packing', type: 'Department Issue', sku: 'RC-ATT-LIGHT', qty: 10, uom: 'kg', ref: 'OUT-DISP-102', destination: 'Indiranagar Roastery Cafe (Bengaluru)' },
      { id: 'TXN-1006', date: '2026-09-25 08:30', module: 'Roastery', type: 'Roast Output Completed', sku: 'RC-COORG-DARK', qty: 61.88, uom: 'kg', ref: 'RB-2026-103', notes: '17.5% loss, dispatched to packing' }
    ]
  };

  // State Management
  let DB = loadDatabase();

  function loadDatabase() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure all required collections exist
        if (parsed.items && parsed.greenCoffee && parsed.roasteryBatches && parsed.packingInventory) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not parse stored data, resetting to defaults', e);
    }
    saveDatabase(DEFAULT_SEED_DATA);
    return JSON.parse(JSON.stringify(DEFAULT_SEED_DATA));
  }

  function saveDatabase(dataToSave) {
    if (dataToSave) DB = dataToSave;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DB));
    } catch (e) {
      console.error('Failed to persist to localStorage', e);
    }
  }

  // ==============================================================================
  // TOAST NOTIFICATIONS
  // ==============================================================================
  function showToast(message, type = 'success') {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;

    toast.className = `show ${type}`;
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `<span style="font-weight:700;">${icon}</span> <span>${message}</span>`;

    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
      toast.className = '';
    }, 3800);
  }

  // ==============================================================================
  // NUMBER & CURRENCY FORMATTERS (Indian Rupee & Formatting)
  // ==============================================================================
  function formatNumber(num, decimals = 1) {
    if (isNaN(num) || num === null || num === undefined) return '0.0';
    return Number(num).toLocaleString('en-IN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function formatCurrency(num) {
    if (isNaN(num) || num === null || num === undefined) return '₹0.00';
    return '₹' + Number(num).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Helper to find item details
  function getItem(sku) {
    return DB.items.find(i => i.sku === sku) || { name: sku, uom: 'units', costPrice: 0, targetLossPct: 15 };
  }

  function getDepartment(deptId) {
    return DB.departments.find(d => d.id === deptId) || { name: deptId, type: 'General' };
  }

  // ==============================================================================
  // DASHBOARD CALCULATIONS & RENDERING
  // ==============================================================================
  function renderDashboard() {
    // 1. Calculate KPI Metrics
    let totalGreenKg = 0;
    let totalGreenVal = 0;
    let greenVarianceCount = 0;

    DB.greenCoffee.forEach(gc => {
      const closing = gc.opening + gc.purchases - gc.issuedToRoastery;
      totalGreenKg += closing;
      const item = getItem(gc.sku);
      totalGreenVal += closing * (item.costPrice || 8.0);
      if (Math.abs(gc.physical - closing) > 0.01) greenVarianceCount++;
    });

    // Roastery KPIs
    let totalGreenRoasted = 0;
    let totalRoastedOutput = 0;
    DB.roasteryBatches.forEach(b => {
      totalGreenRoasted += Number(b.greenInKg || 0);
      totalRoastedOutput += Number(b.roastedOutKg || 0);
    });
    const avgRoastLossPct = totalGreenRoasted > 0
      ? (((totalGreenRoasted - totalRoastedOutput) / totalGreenRoasted) * 100)
      : 0;

    // Packing Department KPIs
    let totalPackingBulkKg = 0;
    let totalPackingUnits = 0;
    let totalDeptIssuesKg = 0;
    let packingVarianceCount = 0;

    DB.packingInventory.forEach(pi => {
      let issuesTotal = 0;
      if (pi.issues) {
        Object.values(pi.issues).forEach(v => { issuesTotal += Number(v || 0); });
      }
      const closing = pi.opening + pi.receiving - issuesTotal;
      if (pi.uom === 'kg') {
        totalPackingBulkKg += closing;
        totalDeptIssuesKg += issuesTotal;
      } else {
        totalPackingUnits += closing;
      }
      if (Math.abs(pi.physical - closing) > 0.01) packingVarianceCount++;
    });

    // Retail & Packaging KPIs
    let totalRetailVal = 0;
    let retailVarianceCount = 0;
    DB.retailInventory.forEach(ri => {
      let issuesTotal = 0;
      if (ri.issues) {
        Object.values(ri.issues).forEach(v => { issuesTotal += Number(v || 0); });
      }
      const closing = ri.opening + ri.receiving - issuesTotal;
      const item = getItem(ri.sku);
      totalRetailVal += closing * (item.costPrice || 2.0);
      if (Math.abs(ri.physical - closing) > 0.01) retailVarianceCount++;
    });

    // Update KPI Elements
    document.getElementById('dash-green-kg').textContent = formatNumber(totalGreenKg, 1) + ' kg';
    document.getElementById('dash-green-val').textContent = formatCurrency(totalGreenVal);
    document.getElementById('dash-roast-out').textContent = formatNumber(totalRoastedOutput, 1) + ' kg';
    document.getElementById('dash-roast-loss').textContent = formatNumber(avgRoastLossPct, 1) + '%';
    document.getElementById('dash-pack-stock').textContent = `${formatNumber(totalPackingBulkKg, 1)} kg / ${totalPackingUnits} u`;
    document.getElementById('dash-retail-val').textContent = formatCurrency(totalRetailVal);

    const totalVariances = greenVarianceCount + packingVarianceCount + retailVarianceCount;
    const varEl = document.getElementById('dash-variance-alerts');
    varEl.textContent = totalVariances;
    varEl.className = totalVariances > 0 ? 'kpi-value text-danger' : 'kpi-value text-success';

    // Update Visual Flow Pipeline Live Badges
    document.getElementById('flow-green-qty').textContent = formatNumber(totalGreenKg, 1) + ' kg';
    document.getElementById('flow-roast-out-qty').textContent = formatNumber(totalRoastedOutput, 1) + ' kg';
    document.getElementById('flow-roast-loss-label').textContent = `${formatNumber(avgRoastLossPct, 1)}% Loss`;
    document.getElementById('flow-pack-qty').textContent = formatNumber(totalPackingBulkKg, 1) + ' kg';

    // Render Department Issues Summary Breakdown
    renderDepartmentIssuesSummary();

    // Render Recent Roasts & Alerts
    renderDashboardRecentActivity();
  }

  // ==============================================================================
  // DEPARTMENT ISSUES SUMMARY & ANALYTICS
  // ==============================================================================
  function renderDepartmentIssuesSummary() {
    const breakdownGrid = document.getElementById('dept-breakdown-grid');
    const tableBody = document.getElementById('dept-summary-table-body');
    const distBar = document.getElementById('dept-distribution-bar');

    if (!breakdownGrid || !tableBody) return;

    // Calculate aggregated issues by department across Packing Department
    const deptTotals = {};
    DB.departments.forEach(d => {
      deptTotals[d.id] = { id: d.id, name: d.name, type: d.type, code: d.code, totalKg: 0, totalUnits: 0 };
    });

    let overallIssuedKg = 0;

    DB.packingInventory.forEach(pi => {
      if (!pi.issues) return;
      Object.entries(pi.issues).forEach(([deptId, qty]) => {
        if (!deptTotals[deptId]) {
          const deptObj = getDepartment(deptId);
          deptTotals[deptId] = { id: deptId, name: deptObj.name, type: deptObj.type, code: deptId, totalKg: 0, totalUnits: 0 };
        }
        if (pi.uom === 'kg') {
          deptTotals[deptId].totalKg += Number(qty || 0);
          overallIssuedKg += Number(qty || 0);
        } else {
          deptTotals[deptId].totalUnits += Number(qty || 0);
        }
      });
    });

    // Populate Cards
    breakdownGrid.innerHTML = Object.values(deptTotals).map(dt => {
      const pct = overallIssuedKg > 0 ? ((dt.totalKg / overallIssuedKg) * 100) : 0;
      let typeClass = 'chip-mini';
      return `
        <div class="dept-pill-card">
          <div class="dept-pill-head">
            <span class="dept-type-tag">${escapeHtml(dt.type)}</span>
            <span class="dept-code">${escapeHtml(dt.code)}</span>
          </div>
          <div class="dept-pill-name">${escapeHtml(dt.name)}</div>
          <div class="dept-pill-qty">${formatNumber(dt.totalKg, 1)} kg</div>
          <div class="dept-pill-pct">${dt.totalUnits > 0 ? `+ ${dt.totalUnits} units | ` : ''}${formatNumber(pct, 1)}% of total issues</div>
        </div>
      `;
    }).join('');

    // Distribution Multi-color Bar
    if (distBar && overallIssuedKg > 0) {
      distBar.innerHTML = Object.values(deptTotals).map(dt => {
        const pct = (dt.totalKg / overallIssuedKg) * 100;
        if (pct <= 0) return '';
        let colorClass = 'dist-other';
        if (dt.type === 'Outlet') colorClass = 'dist-outlets';
        else if (dt.type === 'Web Sales') colorClass = 'dist-website';
        else if (dt.type === 'B2B Sales') colorClass = 'dist-b2b';
        else if (dt.type === 'Wastage') colorClass = 'dist-wastage';
        else if (dt.type === 'Grinder Loss') colorClass = 'dist-grinder';
        else if (dt.type === 'Lab Testing') colorClass = 'dist-lab';

        return `<div class="dist-segment ${colorClass}" style="width: ${pct}%;" title="${dt.name}: ${formatNumber(pct, 1)}% (${formatNumber(dt.totalKg, 1)} kg)"></div>`;
      }).join('');
    }

    // Populate Summary Table
    tableBody.innerHTML = Object.values(deptTotals).map(dt => {
      const pct = overallIssuedKg > 0 ? ((dt.totalKg / overallIssuedKg) * 100) : 0;
      return `
        <tr>
          <td><strong style="color:var(--text-primary);">${escapeHtml(dt.name)}</strong></td>
          <td><span class="stage-badge blue">${escapeHtml(dt.type)}</span></td>
          <td><span class="col-sku">${escapeHtml(dt.code)}</span></td>
          <td class="col-number"><strong>${formatNumber(dt.totalKg, 1)} kg</strong></td>
          <td class="col-number">${dt.totalUnits} u</td>
          <td class="col-number"><span class="loss-pill good">${formatNumber(pct, 1)}%</span></td>
        </tr>
      `;
    }).join('');
  }

  function renderDashboardRecentActivity() {
    const listEl = document.getElementById('dash-recent-activity');
    if (!listEl) return;

    const recent = DB.transactions.slice(-6).reverse();
    if (recent.length === 0) {
      listEl.innerHTML = `<div style="padding:1rem;color:var(--text-muted);text-align:center;">No recent transactions logged yet.</div>`;
      return;
    }

    listEl.innerHTML = recent.map(tx => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;border-bottom:1px solid rgba(255,255,255,0.04);">
        <div style="display:flex;align-items:center;gap:0.75rem;">
          <span style="font-size:1.1rem;">${tx.module === 'Green Coffee' ? '🌿' : tx.module === 'Roastery' ? '🔥' : '📦'}</span>
          <div>
            <div style="font-weight:600;font-size:0.86rem;color:var(--text-primary);">${escapeHtml(tx.type)}: <span class="col-sku">${escapeHtml(tx.sku)}</span></div>
            <div style="font-size:0.74rem;color:var(--text-muted);">${escapeHtml(tx.date)} &bull; ${escapeHtml(tx.notes || tx.destination || tx.ref || '')}</div>
          </div>
        </div>
        <div style="font-family:var(--font-mono);font-weight:700;color:var(--amber-bright);font-size:0.9rem;">
          ${tx.qty} ${tx.uom || ''}
        </div>
      </div>
    `).join('');
  }

  // ==============================================================================
  // GREEN COFFEE MODULE
  // ==============================================================================
  function renderGreenCoffee() {
    const tableBody = document.getElementById('green-coffee-table-body');
    const searchInput = document.getElementById('green-search-input');
    const query = (searchInput ? searchInput.value : '').toLowerCase().trim();

    if (!tableBody) return;

    const filtered = DB.greenCoffee.filter(gc => {
      const item = getItem(gc.sku);
      return gc.sku.toLowerCase().includes(query) ||
             item.name.toLowerCase().includes(query) ||
             (gc.lotNumber && gc.lotNumber.toLowerCase().includes(query)) ||
             (gc.supplier && gc.supplier.toLowerCase().includes(query));
    });

    document.getElementById('green-coffee-count-badge').textContent = `${filtered.length} Lots`;

    tableBody.innerHTML = filtered.map(gc => {
      const item = getItem(gc.sku);
      // Equation: Closing = Opening + Purchases - Issued to Roastery
      const closing = gc.opening + gc.purchases - gc.issuedToRoastery;
      const physical = Number(gc.physical || 0);
      const variance = physical - closing;
      const assetVal = closing * (item.costPrice || 0);

      let varianceBadge = '';
      if (Math.abs(variance) < 0.01) {
        varianceBadge = `<span class="variance-badge variance-zero">0.0 kg (Matched)</span>`;
      } else if (variance < 0) {
        varianceBadge = `<span class="variance-badge variance-negative">${formatNumber(variance, 1)} kg (Shortage)</span>`;
      } else {
        varianceBadge = `<span class="variance-badge variance-positive">+${formatNumber(variance, 1)} kg (Surplus)</span>`;
      }

      return `
        <tr>
          <td>
            <div class="col-sku">${escapeHtml(gc.sku)}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(gc.lotNumber || 'Lot N/A')}</div>
          </td>
          <td>
            <strong style="color:var(--text-primary);">${escapeHtml(item.name)}</strong>
            <div style="font-size:0.74rem;color:var(--text-muted);">${escapeHtml(item.origin || '')} &bull; ${escapeHtml(gc.supplier || '')}</div>
          </td>
          <td class="col-number">${formatNumber(gc.opening, 1)}</td>
          <td class="col-number" style="color:var(--emerald-success);font-weight:600;">+${formatNumber(gc.purchases, 1)}</td>
          <td class="col-number" style="color:var(--amber-gold);font-weight:600;">-${formatNumber(gc.issuedToRoastery, 1)}</td>
          <td class="col-number"><strong style="color:var(--text-primary);font-size:0.95rem;">${formatNumber(closing, 1)} kg</strong></td>
          <td class="col-number">
            <input type="number" step="0.1" class="form-control" style="width:105px;display:inline-block;padding:0.25rem 0.5rem;font-family:var(--font-mono);text-align:right;"
              value="${physical}" onchange="window.CoffeeApp.updateGreenPhysical('${gc.sku}', this.value)" />
          </td>
          <td class="col-number">${varianceBadge}</td>
          <td class="col-number">${formatCurrency(assetVal)}</td>
          <td style="text-align:center;">
            <button class="btn-action-icon" title="Purchase More Green Coffee" onclick="window.CoffeeApp.openGreenPurchaseModal('${gc.sku}')">📥</button>
            <button class="btn-action-icon" title="Issue to Roastery" onclick="window.CoffeeApp.openIssueToRoasteryModal('${gc.sku}')">🔥</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ==============================================================================
  // ROASTERY UNIT MODULE
  // ==============================================================================
  function renderRoastery() {
    const tableBody = document.getElementById('roastery-table-body');
    const searchInput = document.getElementById('roastery-search-input');
    const query = (searchInput ? searchInput.value : '').toLowerCase().trim();

    if (!tableBody) return;

    const filtered = DB.roasteryBatches.filter(b => {
      return b.batchId.toLowerCase().includes(query) ||
             b.greenSku.toLowerCase().includes(query) ||
             b.roastedSku.toLowerCase().includes(query) ||
             (b.roasterId && b.roasterId.toLowerCase().includes(query));
    });

    document.getElementById('roastery-count-badge').textContent = `${filtered.length} Batches`;

    // Summary calculations
    let totalIn = 0;
    let totalOut = 0;
    filtered.forEach(b => {
      totalIn += Number(b.greenInKg || 0);
      totalOut += Number(b.roastedOutKg || 0);
    });
    const avgLoss = totalIn > 0 ? (((totalIn - totalOut) / totalIn) * 100) : 0;

    document.getElementById('roast-kpi-total-in').textContent = formatNumber(totalIn, 1) + ' kg';
    document.getElementById('roast-kpi-total-out').textContent = formatNumber(totalOut, 1) + ' kg';
    document.getElementById('roast-kpi-avg-loss').textContent = formatNumber(avgLoss, 1) + '%';

    tableBody.innerHTML = filtered.map(b => {
      const greenItem = getItem(b.greenSku);
      const roastedItem = getItem(b.roastedSku);
      const lossKg = Number(b.roastLossKg || (b.greenInKg - b.roastedOutKg));
      const lossPct = Number(b.roastLossPct || ((lossKg / b.greenInKg) * 100));
      const targetPct = Number(b.targetLossPct || roastedItem.targetLossPct || 15);
      const deviation = lossPct - targetPct;

      let lossBadge = '';
      if (Math.abs(deviation) <= 1.0) {
        lossBadge = `<span class="loss-pill good">${formatNumber(lossPct, 1)}% (Optimal)</span>`;
      } else if (deviation > 1.0) {
        lossBadge = `<span class="loss-pill danger">${formatNumber(lossPct, 1)}% (+${formatNumber(deviation, 1)}% High Loss)</span>`;
      } else {
        lossBadge = `<span class="loss-pill warn">${formatNumber(lossPct, 1)}% (${formatNumber(deviation, 1)}% Light)</span>`;
      }

      return `
        <tr>
          <td><span class="col-sku">${escapeHtml(b.batchId)}</span></td>
          <td><span style="font-size:0.8rem;color:var(--text-muted);">${escapeHtml(b.date)}</span></td>
          <td>
            <div class="col-sku">${escapeHtml(b.greenSku)}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(greenItem.name)}</div>
          </td>
          <td>
            <strong style="color:var(--text-primary);">${escapeHtml(roastedItem.name)}</strong>
            <div style="font-size:0.74rem;color:var(--text-muted);">${escapeHtml(b.roastProfile || '')} &bull; ${escapeHtml(b.roasterId || '')}</div>
          </td>
          <td class="col-number">${formatNumber(b.greenInKg, 1)} kg</td>
          <td class="col-number"><strong style="color:var(--amber-bright);">${formatNumber(b.roastedOutKg, 1)} kg</strong></td>
          <td class="col-number" style="color:var(--danger-crimson);">${formatNumber(lossKg, 1)} kg</td>
          <td class="col-number">${lossBadge}</td>
          <td><span class="stage-badge crema">${escapeHtml(b.status || 'Dispatched')}</span></td>
        </tr>
      `;
    }).join('');
  }

  // ==============================================================================
  // PACKING DEPARTMENT MODULE
  // ==============================================================================
  function renderPacking() {
    const tableBody = document.getElementById('packing-table-body');
    const searchInput = document.getElementById('packing-search-input');
    const query = (searchInput ? searchInput.value : '').toLowerCase().trim();

    if (!tableBody) return;

    const filtered = DB.packingInventory.filter(pi => {
      const item = getItem(pi.sku);
      return pi.sku.toLowerCase().includes(query) ||
             (pi.name && pi.name.toLowerCase().includes(query)) ||
             item.name.toLowerCase().includes(query);
    });

    document.getElementById('packing-count-badge').textContent = `${filtered.length} SKUs`;

    tableBody.innerHTML = filtered.map(pi => {
      const item = getItem(pi.sku);
      let totalIssues = 0;
      if (pi.issues) {
        Object.values(pi.issues).forEach(qty => { totalIssues += Number(qty || 0); });
      }

      // Equation: Closing = Opening + Receiving - Total Issues
      const closing = pi.opening + pi.receiving - totalIssues;
      const physical = Number(pi.physical || 0);
      const variance = physical - closing;

      let varianceBadge = '';
      if (Math.abs(variance) < 0.01) {
        varianceBadge = `<span class="variance-badge variance-zero">0.0 (Matched)</span>`;
      } else if (variance < 0) {
        varianceBadge = `<span class="variance-badge variance-negative">${formatNumber(variance, 1)} (Shortage)</span>`;
      } else {
        varianceBadge = `<span class="variance-badge variance-positive">+${formatNumber(variance, 1)} (Surplus)</span>`;
      }

      return `
        <tr>
          <td>
            <div class="col-sku">${escapeHtml(pi.sku)}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(pi.uom)}</div>
          </td>
          <td>
            <strong style="color:var(--text-primary);">${escapeHtml(pi.name || item.name)}</strong>
          </td>
          <td class="col-number">${formatNumber(pi.opening, 1)}</td>
          <td class="col-number" style="color:var(--emerald-success);font-weight:600;">+${formatNumber(pi.receiving, 1)}</td>
          <td class="col-number" style="color:var(--danger-crimson);font-weight:600;">-${formatNumber(totalIssues, 1)}</td>
          <td class="col-number"><strong style="color:var(--text-primary);font-size:0.95rem;">${formatNumber(closing, 1)}</strong></td>
          <td class="col-number">
            <input type="number" step="0.1" class="form-control" style="width:105px;display:inline-block;padding:0.25rem 0.5rem;font-family:var(--font-mono);text-align:right;"
              value="${physical}" onchange="window.CoffeeApp.updatePackingPhysical('${pi.sku}', this.value)" />
          </td>
          <td class="col-number">${varianceBadge}</td>
          <td style="text-align:center;">
            <button class="topbar-btn" style="padding:0.3rem 0.65rem;font-size:0.78rem;" onclick="window.CoffeeApp.openPackingIssueModal('${pi.sku}')">
              📤 Issue to Dept / Party
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ==============================================================================
  // RETAIL & PACKAGING MODULE
  // ==============================================================================
  function renderRetail() {
    const tableBody = document.getElementById('retail-table-body');
    const searchInput = document.getElementById('retail-search-input');
    const query = (searchInput ? searchInput.value : '').toLowerCase().trim();

    if (!tableBody) return;

    const filtered = DB.retailInventory.filter(ri => {
      const item = getItem(ri.sku);
      return ri.sku.toLowerCase().includes(query) ||
             (ri.name && ri.name.toLowerCase().includes(query)) ||
             item.name.toLowerCase().includes(query);
    });

    document.getElementById('retail-count-badge').textContent = `${filtered.length} Items`;

    tableBody.innerHTML = filtered.map(ri => {
      const item = getItem(ri.sku);
      let totalIssues = 0;
      if (ri.issues) {
        Object.values(ri.issues).forEach(qty => { totalIssues += Number(qty || 0); });
      }

      // Equation: Closing = Opening + Receiving - Issues
      const closing = ri.opening + ri.receiving - totalIssues;
      const physical = Number(ri.physical || 0);
      const variance = physical - closing;
      const assetVal = closing * (item.costPrice || 0);

      let varianceBadge = '';
      if (Math.abs(variance) < 0.01) {
        varianceBadge = `<span class="variance-badge variance-zero">0.0 (Matched)</span>`;
      } else if (variance < 0) {
        varianceBadge = `<span class="variance-badge variance-negative">${formatNumber(variance, 1)} (Shortage)</span>`;
      } else {
        varianceBadge = `<span class="variance-badge variance-positive">+${formatNumber(variance, 1)} (Surplus)</span>`;
      }

      return `
        <tr>
          <td>
            <div class="col-sku">${escapeHtml(ri.sku)}</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(ri.uom)}</div>
          </td>
          <td>
            <strong style="color:var(--text-primary);">${escapeHtml(ri.name || item.name)}</strong>
            <div style="font-size:0.74rem;color:var(--text-muted);">${escapeHtml(ri.category || item.category)}</div>
          </td>
          <td class="col-number">${formatNumber(ri.opening, 1)}</td>
          <td class="col-number" style="color:var(--emerald-success);font-weight:600;">+${formatNumber(ri.receiving, 1)}</td>
          <td class="col-number" style="color:var(--amber-gold);font-weight:600;">-${formatNumber(totalIssues, 1)}</td>
          <td class="col-number"><strong style="color:var(--text-primary);">${formatNumber(closing, 1)}</strong></td>
          <td class="col-number">
            <input type="number" step="0.1" class="form-control" style="width:105px;display:inline-block;padding:0.25rem 0.5rem;font-family:var(--font-mono);text-align:right;"
              value="${physical}" onchange="window.CoffeeApp.updateRetailPhysical('${ri.sku}', this.value)" />
          </td>
          <td class="col-number">${varianceBadge}</td>
          <td class="col-number">${formatCurrency(assetVal)}</td>
          <td style="text-align:center;">
            <button class="btn-action-icon" title="Receive Stock (Purchase)" onclick="window.CoffeeApp.openRetailPurchaseModal('${ri.sku}')">📥</button>
            <button class="btn-action-icon" title="Issue to Outlet / Web / Party" onclick="window.CoffeeApp.openRetailIssueModal('${ri.sku}')">📤</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ==============================================================================
  // ITEM MASTER MODULE
  // ==============================================================================
  function renderItemMaster() {
    const tableBody = document.getElementById('item-master-table-body');
    const searchInput = document.getElementById('item-master-search-input');
    const catSelect = document.getElementById('item-master-category-filter');

    const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const category = catSelect ? catSelect.value : 'ALL';

    if (!tableBody) return;

    const filtered = DB.items.filter(item => {
      const matchQuery = item.sku.toLowerCase().includes(query) || item.name.toLowerCase().includes(query);
      const matchCat = category === 'ALL' || item.category === category;
      return matchQuery && matchCat;
    });

    document.getElementById('item-master-count-badge').textContent = `${filtered.length} SKUs`;

    tableBody.innerHTML = filtered.map(item => {
      return `
        <tr>
          <td><span class="col-sku">${escapeHtml(item.sku)}</span></td>
          <td><strong style="color:var(--text-primary);">${escapeHtml(item.name)}</strong></td>
          <td><span class="stage-badge crema">${escapeHtml(item.category)}</span></td>
          <td>${escapeHtml(item.uom)}</td>
          <td class="col-number">${item.targetLossPct ? `${item.targetLossPct}%` : '-'}</td>
          <td class="col-number">${formatCurrency(item.costPrice)}</td>
          <td class="col-number">${item.sellPrice > 0 ? formatCurrency(item.sellPrice) : '-'}</td>
          <td class="col-number">${item.reorderLevel || 0}</td>
          <td style="text-align:center;">
            <button class="btn-action-icon" title="Edit Item" onclick="window.CoffeeApp.openEditItemModal('${item.id}')">✏️</button>
            <button class="btn-action-icon" title="Delete Item" onclick="window.CoffeeApp.deleteItem('${item.id}')">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ==============================================================================
  // LOCATIONS & CAFE OUTLETS MASTER ("Adding Cafe Outlets & Future Depts")
  // ==============================================================================
  function renderDepartments() {
    const outletsBody = document.getElementById('outlets-table-body');
    const deptsBody = document.getElementById('departments-table-body');
    if (!outletsBody && !deptsBody) return;

    // Calculate total coffee issued to each outlet from packing inventory
    const outletIssuesMap = {};
    DB.packingInventory.forEach(pi => {
      if (pi.issues) {
        Object.entries(pi.issues).forEach(([deptId, qty]) => {
          outletIssuesMap[deptId] = (outletIssuesMap[deptId] || 0) + Number(qty || 0);
        });
      }
    });

    const outlets = DB.departments.filter(d => d.type === 'Outlet');
    const otherDepts = DB.departments.filter(d => d.type !== 'Outlet');

    const countBadge = document.getElementById('outlets-count-badge');
    if (countBadge) countBadge.textContent = `${outlets.length} Cafes`;

    if (outletsBody) {
      outletsBody.innerHTML = outlets.map(o => {
        const totalCoffeeKg = outletIssuesMap[o.id] || 0;
        return `
          <tr>
            <td><span class="col-sku">${escapeHtml(o.code)}</span></td>
            <td>
              <strong style="color:var(--text-primary);font-size:0.95rem;">${escapeHtml(o.name)}</strong>
              <div style="font-size:0.75rem;color:var(--text-muted);">${escapeHtml(o.city || 'India')}${o.address ? ` &bull; ${escapeHtml(o.address)}` : ''}</div>
            </td>
            <td><span class="stage-badge crema">${escapeHtml(o.format || 'Cafe Outlet')}</span></td>
            <td><span style="font-size:0.8rem;color:var(--text-primary);">${escapeHtml(o.manager || 'Store Team')}</span></td>
            <td class="col-number"><strong style="color:var(--amber-bright);font-family:var(--font-mono);font-size:0.95rem;">${formatNumber(totalCoffeeKg, 1)} kg</strong></td>
            <td style="text-align:center;">
              <button class="topbar-btn primary" style="padding:0.28rem 0.65rem;font-size:0.76rem;display:inline-flex;gap:0.3rem;" onclick="window.CoffeeApp.openPackingIssueModal(null, '${o.id}')">
                <span>📦</span> <span>Dispatch Beans</span>
              </button>
              ${o.isSystem ? '' : `<button class="btn-action-icon" style="margin-left:0.35rem;" title="Remove Outlet" onclick="window.CoffeeApp.deleteDepartment('${o.id}')">🗑️</button>`}
            </td>
          </tr>
        `;
      }).join('');
    }

    if (deptsBody) {
      deptsBody.innerHTML = otherDepts.map(d => {
        const totalCoffeeKg = outletIssuesMap[d.id] || 0;
        return `
          <tr>
            <td><span class="col-sku">${escapeHtml(d.code)}</span></td>
            <td><strong style="color:var(--text-primary);">${escapeHtml(d.name)}</strong></td>
            <td><span class="stage-badge blue">${escapeHtml(d.type)}</span></td>
            <td class="col-number"><strong>${formatNumber(totalCoffeeKg, 1)} kg</strong></td>
            <td>${d.isSystem ? '<span class="chip-mini">System Core</span>' : '<span class="stage-badge green">Custom Future Dept</span>'}</td>
            <td style="text-align:center;">
              <button class="topbar-btn" style="padding:0.28rem 0.65rem;font-size:0.76rem;display:inline-flex;gap:0.3rem;" onclick="window.CoffeeApp.openPackingIssueModal(null, '${d.id}')">
                <span>📤</span> <span>Issue</span>
              </button>
              ${d.isSystem ? '' : `<button class="btn-action-icon" style="margin-left:0.35rem;" title="Remove" onclick="window.CoffeeApp.deleteDepartment('${d.id}')">🗑️</button>`}
            </td>
          </tr>
        `;
      }).join('');
    }
  }

  // ==============================================================================
  // AUDIT & TRANSACTIONS LOG
  // ==============================================================================
  function renderLedger() {
    const tableBody = document.getElementById('ledger-table-body');
    if (!tableBody) return;

    const list = [...DB.transactions].reverse();
    document.getElementById('ledger-count-badge').textContent = `${list.length} Logs`;

    tableBody.innerHTML = list.map(tx => {
      return `
        <tr>
          <td><span class="col-sku">${escapeHtml(tx.id)}</span></td>
          <td><span style="font-size:0.8rem;color:var(--text-muted);">${escapeHtml(tx.date)}</span></td>
          <td><span class="stage-badge crema">${escapeHtml(tx.module)}</span></td>
          <td><strong style="color:var(--text-primary);">${escapeHtml(tx.type)}</strong></td>
          <td><span class="col-sku">${escapeHtml(tx.sku)}</span></td>
          <td class="col-number"><strong>${tx.qty} ${tx.uom || ''}</strong></td>
          <td>${escapeHtml(tx.destination || tx.ref || '-')}</td>
          <td><span style="font-size:0.78rem;color:var(--text-muted);">${escapeHtml(tx.notes || '')}</span></td>
        </tr>
      `;
    }).join('');
  }

  // ==============================================================================
  // ACTIONS, TRANSACTIONS & MODALS LOGIC
  // ==============================================================================

  // Modal Helpers
  function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('open');
  }

  function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('open');
  }

  // Helper: Escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  // Populate dynamic select dropdowns
  function populateSelects() {
    // 1. Green Coffee SKU select
    const greenSelects = document.querySelectorAll('.select-green-sku');
    greenSelects.forEach(sel => {
      sel.innerHTML = DB.greenCoffee.map(gc => {
        const item = getItem(gc.sku);
        return `<option value="${gc.sku}">${gc.sku} - ${item.name}</option>`;
      }).join('');
    });

    // 2. Roasted SKU select
    const roastSelects = document.querySelectorAll('.select-roasted-sku');
    roastSelects.forEach(sel => {
      const roastedItems = DB.items.filter(i => i.category === 'Roasted Coffee' || i.category === 'Packaged Coffee');
      sel.innerHTML = roastedItems.map(ri => {
        return `<option value="${ri.sku}">${ri.sku} - ${ri.name}</option>`;
      }).join('');
    });

    // 3. Department select (includes all outlets, web, b2b, wastage, grinder, lab, future)
    const deptSelects = document.querySelectorAll('.select-department');
    deptSelects.forEach(sel => {
      sel.innerHTML = DB.departments.map(d => {
        return `<option value="${d.id}">[${d.type}] ${d.name} (${d.code})</option>`;
      }).join('');
    });

    // 4. Packing SKU select
    const packingSelects = document.querySelectorAll('.select-packing-sku');
    packingSelects.forEach(sel => {
      sel.innerHTML = DB.packingInventory.map(pi => {
        return `<option value="${pi.sku}">${pi.sku} - ${pi.name || pi.sku}</option>`;
      }).join('');
    });

    // 5. Retail SKU select
    const retailSelects = document.querySelectorAll('.select-retail-sku');
    retailSelects.forEach(sel => {
      sel.innerHTML = DB.retailInventory.map(ri => {
        return `<option value="${ri.sku}">${ri.sku} - ${ri.name || ri.sku}</option>`;
      }).join('');
    });
  }

  // ==============================================================================
  // TRANSACTION SUBMISSIONS
  // ==============================================================================

  // 1. Add Purchase of Green Coffee
  function submitGreenPurchase(e) {
    e.preventDefault();
    const sku = document.getElementById('gp-sku').value;
    const qty = parseFloat(document.getElementById('gp-qty').value);
    const lot = document.getElementById('gp-lot').value.trim();
    const supplier = document.getElementById('gp-supplier').value.trim();
    const cost = parseFloat(document.getElementById('gp-cost').value) || 0;

    if (!sku || isNaN(qty) || qty <= 0) {
      showToast('Please enter a valid green coffee SKU and purchase quantity.', 'error');
      return;
    }

    let record = DB.greenCoffee.find(gc => gc.sku === sku);
    if (!record) {
      record = { sku, opening: 0, purchases: 0, issuedToRoastery: 0, physical: 0 };
      DB.greenCoffee.push(record);
    }

    record.purchases += qty;
    record.physical += qty; // automatically reflects in physical count unless audited
    if (lot) record.lotNumber = lot;
    if (supplier) record.supplier = supplier;
    record.lastUpdated = new Date().toISOString().split('T')[0];

    // Log transaction
    DB.transactions.push({
      id: 'TXN-' + Math.floor(1000 + Math.random() * 9000),
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      module: 'Green Coffee',
      type: 'Purchase Receiving',
      sku,
      qty,
      uom: 'kg',
      ref: lot || 'PO-DIRECT',
      notes: `Supplier: ${supplier || 'Direct'} | Cost: ₹${cost}/kg`
    });

    saveDatabase();
    closeModal('modal-green-purchase');
    renderGreenCoffee();
    renderDashboard();
    renderLedger();
    showToast(`Purchased & received ${qty} kg of ${sku} successfully!`);
  }

  // 2. Issue Green Coffee to Roastery
  function submitIssueToRoastery(e) {
    e.preventDefault();
    const sku = document.getElementById('ir-sku').value;
    const qty = parseFloat(document.getElementById('ir-qty').value);
    const notes = document.getElementById('ir-notes').value.trim();

    if (!sku || isNaN(qty) || qty <= 0) {
      showToast('Please specify a valid quantity to issue.', 'error');
      return;
    }

    const record = DB.greenCoffee.find(gc => gc.sku === sku);
    const available = record ? (record.opening + record.purchases - record.issuedToRoastery) : 0;

    if (qty > available) {
      if (!confirm(`Warning: Issued quantity (${qty} kg) exceeds current available stock (${available} kg). Do you want to proceed anyway?`)) {
        return;
      }
    }

    record.issuedToRoastery += qty;
    record.physical = Math.max(0, record.physical - qty);

    DB.transactions.push({
      id: 'TXN-' + Math.floor(1000 + Math.random() * 9000),
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      module: 'Green Coffee',
      type: 'Issue to Roastery',
      sku,
      qty,
      uom: 'kg',
      ref: 'ROAST-PREP',
      notes: notes || 'Transferred to Roasting Unit staging area'
    });

    saveDatabase();
    closeModal('modal-issue-roastery');
    renderGreenCoffee();
    renderDashboard();
    renderLedger();
    showToast(`Issued ${qty} kg of ${sku} to Roastery Unit!`);
  }

  // 3. New Roast Batch Submission
  function submitRoastBatch(e) {
    e.preventDefault();
    const greenSku = document.getElementById('rb-green-sku').value;
    const roastedSku = document.getElementById('rb-roasted-sku').value;
    const greenInKg = parseFloat(document.getElementById('rb-green-in').value);
    const roastedOutKg = parseFloat(document.getElementById('rb-roasted-out').value);
    const roasterId = document.getElementById('rb-machine').value.trim();
    const profile = document.getElementById('rb-profile').value.trim();
    const notes = document.getElementById('rb-notes').value.trim();

    if (isNaN(greenInKg) || greenInKg <= 0 || isNaN(roastedOutKg) || roastedOutKg <= 0) {
      showToast('Please enter valid Green In and Roasted Output amounts.', 'error');
      return;
    }

    if (roastedOutKg >= greenInKg) {
      showToast('Roasted output must be less than Green In (Coffee beans lose mass during roasting).', 'error');
      return;
    }

    const roastLossKg = greenInKg - roastedOutKg;
    const roastLossPct = (roastLossKg / greenInKg) * 100;
    const roastedItem = getItem(roastedSku);
    const targetLossPct = roastedItem.targetLossPct || 15.0;

    const batchId = 'RB-' + new Date().getFullYear() + '-' + Math.floor(100 + Math.random() * 900);

    const newBatch = {
      batchId,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      greenSku,
      roastedSku,
      roasterId: roasterId || 'Main Roaster',
      roastProfile: profile || 'Standard Profile',
      greenInKg,
      roastedOutKg,
      roastLossKg,
      roastLossPct,
      targetLossPct,
      lossStatus: Math.abs(roastLossPct - targetLossPct) <= 1.2 ? 'Optimal' : (roastLossPct > targetLossPct ? 'High Loss' : 'Light Loss'),
      status: 'Transferred to Packing',
      notes
    };

    DB.roasteryBatches.unshift(newBatch);

    // Auto-update Green Coffee Issued (if not already issued)
    let gc = DB.greenCoffee.find(g => g.sku === greenSku);
    if (gc) {
      gc.issuedToRoastery += greenInKg;
      gc.physical = Math.max(0, gc.physical - greenInKg);
    }

    // Auto-transfer to Packing Department receiving
    let pi = DB.packingInventory.find(p => p.sku === roastedSku);
    if (!pi) {
      pi = {
        sku: roastedSku,
        name: roastedItem.name,
        uom: roastedItem.uom || 'kg',
        opening: 0,
        receiving: 0,
        issues: {},
        physical: 0
      };
      DB.packingInventory.push(pi);
    }
    pi.receiving += roastedOutKg;
    pi.physical += roastedOutKg;

    // Log Roastery Transaction
    DB.transactions.push({
      id: 'TXN-' + Math.floor(1000 + Math.random() * 9000),
      date: newBatch.date,
      module: 'Roastery',
      type: 'Roast Output Completed',
      sku: roastedSku,
      qty: roastedOutKg,
      uom: 'kg',
      ref: batchId,
      notes: `${formatNumber(roastLossPct, 1)}% Loss (${formatNumber(roastLossKg, 1)} kg lost) -> Sent to Packing`
    });

    saveDatabase();
    closeModal('modal-new-roast');
    renderRoastery();
    renderPacking();
    renderGreenCoffee();
    renderDashboard();
    renderLedger();
    showToast(`Batch ${batchId} saved! Output of ${roastedOutKg} kg sent to Packing Dept (Loss: ${formatNumber(roastLossPct, 1)}%).`);
  }

  // 4. Issue from Packing Department to Destinations
  // Destinations: Difference Outlets, Website Sales, B2B Sales, Wastage, Grinder Loss, Lab Testing, Custom Depts
  function submitPackingIssue(e) {
    e.preventDefault();
    const sku = document.getElementById('pi-sku').value;
    const deptId = document.getElementById('pi-dept').value;
    const qty = parseFloat(document.getElementById('pi-qty').value);
    const slipNo = document.getElementById('pi-slip').value.trim();
    const notes = document.getElementById('pi-notes').value.trim();

    if (!sku || !deptId || isNaN(qty) || qty <= 0) {
      showToast('Please fill all required fields correctly.', 'error');
      return;
    }

    const pi = DB.packingInventory.find(p => p.sku === sku);
    if (!pi) {
      showToast('Packing item not found.', 'error');
      return;
    }

    if (!pi.issues) pi.issues = {};
    pi.issues[deptId] = (pi.issues[deptId] || 0) + qty;
    pi.physical = Math.max(0, pi.physical - qty);

    const deptObj = getDepartment(deptId);

    DB.transactions.push({
      id: 'TXN-' + Math.floor(1000 + Math.random() * 9000),
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      module: 'Packing',
      type: `Department Issue (${deptObj.type})`,
      sku,
      qty,
      uom: pi.uom,
      destination: deptObj.name,
      ref: slipNo || 'DISP-TRANS',
      notes: notes || `Dispatched to ${deptObj.name}`
    });

    saveDatabase();
    closeModal('modal-packing-issue');
    renderPacking();
    renderDashboard();
    renderLedger();
    showToast(`Issued ${qty} ${pi.uom} of ${sku} to ${deptObj.name}!`);
  }

  // 5. Retail Purchase & Receiving
  function submitRetailPurchase(e) {
    e.preventDefault();
    const sku = document.getElementById('rp-sku').value;
    const qty = parseFloat(document.getElementById('rp-qty').value);
    const supplier = document.getElementById('rp-supplier').value.trim();

    if (!sku || isNaN(qty) || qty <= 0) {
      showToast('Please enter valid SKU and quantity.', 'error');
      return;
    }

    let ri = DB.retailInventory.find(r => r.sku === sku);
    if (!ri) {
      const item = getItem(sku);
      ri = { sku, name: item.name, category: item.category, uom: item.uom, opening: 0, receiving: 0, issues: {}, physical: 0 };
      DB.retailInventory.push(ri);
    }

    ri.receiving += qty;
    ri.physical += qty;

    DB.transactions.push({
      id: 'TXN-' + Math.floor(1000 + Math.random() * 9000),
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      module: 'Retail & Packaging',
      type: 'Purchase Receiving',
      sku,
      qty,
      uom: ri.uom,
      ref: 'PO-RET-' + Math.floor(100 + Math.random() * 900),
      notes: `Supplier: ${supplier || 'Direct Importer'}`
    });

    saveDatabase();
    closeModal('modal-retail-purchase');
    renderRetail();
    renderDashboard();
    renderLedger();
    showToast(`Received ${qty} ${ri.uom} of ${sku} into Retail Inventory.`);
  }

  // 6. Retail Issue / Dispatch
  function submitRetailIssue(e) {
    e.preventDefault();
    const sku = document.getElementById('ri-sku').value;
    const deptId = document.getElementById('ri-dept').value;
    const qty = parseFloat(document.getElementById('ri-qty').value);
    const notes = document.getElementById('ri-notes').value.trim();

    if (!sku || !deptId || isNaN(qty) || qty <= 0) {
      showToast('Please select valid fields and quantity.', 'error');
      return;
    }

    let ri = DB.retailInventory.find(r => r.sku === sku);
    if (!ri) {
      showToast('Retail SKU record not found.', 'error');
      return;
    }

    if (!ri.issues) ri.issues = {};
    ri.issues[deptId] = (ri.issues[deptId] || 0) + qty;
    ri.physical = Math.max(0, ri.physical - qty);

    const deptObj = getDepartment(deptId);

    DB.transactions.push({
      id: 'TXN-' + Math.floor(1000 + Math.random() * 9000),
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      module: 'Retail & Packaging',
      type: `Retail Issue (${deptObj.type})`,
      sku,
      qty,
      uom: ri.uom,
      destination: deptObj.name,
      ref: 'DISP-RETAIL',
      notes: notes || `Dispatched to ${deptObj.name}`
    });

    saveDatabase();
    closeModal('modal-retail-issue');
    renderRetail();
    renderDashboard();
    renderLedger();
    showToast(`Issued ${qty} ${ri.uom} of ${sku} to ${deptObj.name}!`);
  }

  // 7. Dynamic Future Department Creation (User specific requirement!)
  function submitNewDepartment(e) {
    e.preventDefault();
    const name = document.getElementById('dept-new-name').value.trim();
    const type = document.getElementById('dept-new-type').value.trim();
    const code = document.getElementById('dept-new-code').value.trim().toUpperCase();

    if (!name || !code) {
      showToast('Please provide Department Name and Code.', 'error');
      return;
    }

    const id = 'dept_' + code.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (DB.departments.some(d => d.id === id || d.code === code)) {
      showToast('A department with this code already exists.', 'error');
      return;
    }

    DB.departments.push({
      id,
      name,
      type: type || 'General',
      code,
      isSystem: false
    });

    saveDatabase();
    populateSelects();
    closeModal('modal-new-department');
    document.getElementById('form-new-dept').reset();
    renderDepartments();
    renderDepartmentIssuesSummary();
    showToast(`New Department "${name}" (${code}) added and active across all flows!`);
  }

  // 7B. Add Dedicated Cafe Outlet / Branch
  function submitNewOutlet(e) {
    e.preventDefault();
    const name = document.getElementById('outlet-new-name').value.trim();
    const city = document.getElementById('outlet-new-city').value.trim();
    const code = document.getElementById('outlet-new-code').value.trim().toUpperCase();
    const format = document.getElementById('outlet-new-format').value;
    const manager = document.getElementById('outlet-new-manager').value.trim();
    const address = document.getElementById('outlet-new-address').value.trim();

    if (!name || !code) {
      showToast('Please provide Cafe Outlet Name and Code.', 'error');
      return;
    }

    const id = 'dept_outlet_' + code.toLowerCase().replace(/[^a-z0-9]/g, '_');
    if (DB.departments.some(d => d.id === id || d.code === code)) {
      showToast('An outlet with this code already exists.', 'error');
      return;
    }

    DB.departments.push({
      id,
      name,
      city: city || 'India',
      code,
      type: 'Outlet',
      format: format || 'Cafe Outlet',
      manager: manager || 'Store Team',
      address: address || '',
      isSystem: false
    });

    saveDatabase();
    populateSelects();
    closeModal('modal-new-outlet');
    document.getElementById('form-new-outlet').reset();
    renderDepartments();
    renderDepartmentIssuesSummary();
    renderDashboard();
    showToast(`New Cafe Outlet "${name}" (${code}) registered! Ready for coffee dispatches.`, 'success');
  }

  // 8. Add or Edit Item Master SKU
  function submitItemMaster(e) {
    e.preventDefault();
    const sku = document.getElementById('im-sku').value.trim().toUpperCase();
    const name = document.getElementById('im-name').value.trim();
    const category = document.getElementById('im-category').value;
    const uom = document.getElementById('im-uom').value.trim();
    const targetLoss = parseFloat(document.getElementById('im-loss').value) || 0;
    const cost = parseFloat(document.getElementById('im-cost').value) || 0;
    const price = parseFloat(document.getElementById('im-price').value) || 0;
    const reorder = parseFloat(document.getElementById('im-reorder').value) || 0;
    const origin = document.getElementById('im-origin').value.trim();

    if (!sku || !name) {
      showToast('Please provide SKU Code and Name.', 'error');
      return;
    }

    const editId = document.getElementById('im-edit-id').value;
    if (editId) {
      const idx = DB.items.findIndex(i => i.id === editId);
      if (idx !== -1) {
        DB.items[idx] = { ...DB.items[idx], sku, name, category, uom, targetLossPct: targetLoss, costPrice: cost, sellPrice: price, reorderLevel: reorder, origin };
        showToast(`Item ${sku} updated successfully.`);
      }
    } else {
      if (DB.items.some(i => i.sku === sku)) {
        showToast('An item with this SKU code already exists.', 'error');
        return;
      }
      const newItem = {
        id: 'item_' + Date.now(),
        sku,
        name,
        category,
        uom: uom || 'units',
        targetLossPct: targetLoss,
        costPrice: cost,
        sellPrice: price,
        reorderLevel: reorder,
        origin
      };
      DB.items.push(newItem);

      // Auto-create matching entry in corresponding module if applicable
      if (category === 'Green Coffee' && !DB.greenCoffee.some(gc => gc.sku === sku)) {
        DB.greenCoffee.push({ sku, opening: 0, purchases: 0, issuedToRoastery: 0, physical: 0, lotNumber: 'NEW', supplier: '' });
      } else if (category === 'Packaged Coffee' || category === 'Roasted Coffee') {
        if (!DB.packingInventory.some(p => p.sku === sku)) {
          DB.packingInventory.push({ sku, name, uom: uom || 'kg', opening: 0, receiving: 0, issues: {}, physical: 0 });
        }
      } else if (category === 'Retail Merchandise' || category === 'Packaging Material') {
        if (!DB.retailInventory.some(r => r.sku === sku)) {
          DB.retailInventory.push({ sku, name, category, uom: uom || 'units', opening: 0, receiving: 0, issues: {}, physical: 0 });
        }
      }

      showToast(`SKU ${sku} created and integrated into modules.`);
    }

    saveDatabase();
    populateSelects();
    closeModal('modal-item-master');
    renderItemMaster();
    renderGreenCoffee();
    renderPacking();
    renderRetail();
  }

  // ==============================================================================
  // PHYSICAL AUDIT INLINE UPDATES
  // ==============================================================================
  function updateGreenPhysical(sku, val) {
    const gc = DB.greenCoffee.find(g => g.sku === sku);
    if (gc) {
      gc.physical = parseFloat(val) || 0;
      saveDatabase();
      renderGreenCoffee();
      renderDashboard();
      showToast(`Physical count for ${sku} updated.`);
    }
  }

  function updatePackingPhysical(sku, val) {
    const pi = DB.packingInventory.find(p => p.sku === sku);
    if (pi) {
      pi.physical = parseFloat(val) || 0;
      saveDatabase();
      renderPacking();
      renderDashboard();
      showToast(`Physical count for ${sku} updated.`);
    }
  }

  function updateRetailPhysical(sku, val) {
    const ri = DB.retailInventory.find(r => r.sku === sku);
    if (ri) {
      ri.physical = parseFloat(val) || 0;
      saveDatabase();
      renderRetail();
      renderDashboard();
      showToast(`Physical count for ${sku} updated.`);
    }
  }

  // ==============================================================================
  // IMPORT & EXPORT SUITE (CSV & JSON)
  // ==============================================================================

  function downloadCSV(csvContent, fileName) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${fileName} successfully!`);
  }

  // 1. Export Green Coffee
  function exportGreenCoffeeCSV() {
    let csv = 'SKU,Lot_Number,Item_Name,Origin,Supplier,Opening_kg,Purchases_kg,Issued_To_Roastery_kg,Closing_Balance_kg,Physical_Balance_kg,Variance_kg,Unit_Cost,Asset_Value\n';
    DB.greenCoffee.forEach(gc => {
      const item = getItem(gc.sku);
      const closing = gc.opening + gc.purchases - gc.issuedToRoastery;
      const variance = gc.physical - closing;
      const assetVal = closing * (item.costPrice || 0);
      csv += `"${gc.sku}","${gc.lotNumber || ''}","${item.name}","${item.origin || ''}","${gc.supplier || ''}",${gc.opening},${gc.purchases},${gc.issuedToRoastery},${closing},${gc.physical},${variance},${item.costPrice || 0},${assetVal}\n`;
    });
    downloadCSV(csv, `Green_Coffee_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
  }

  // 2. Export Roastery Batches & Losses
  function exportRoasteryCSV() {
    let csv = 'Batch_ID,Date,Green_SKU,Roasted_SKU,Roaster_Machine,Roast_Profile,Green_In_kg,Roasted_Output_kg,Roast_Loss_kg,Roast_Loss_Pct,Target_Loss_Pct,Loss_Status,Notes\n';
    DB.roasteryBatches.forEach(b => {
      csv += `"${b.batchId}","${b.date}","${b.greenSku}","${b.roastedSku}","${b.roasterId || ''}","${b.roastProfile || ''}",${b.greenInKg},${b.roastedOutKg},${b.roastLossKg},${b.roastLossPct},${b.targetLossPct},"${b.lossStatus || ''}","${b.notes || ''}"\n`;
    });
    downloadCSV(csv, `Roastery_Batches_Log_${new Date().toISOString().split('T')[0]}.csv`);
  }

  // 3. Export Packing Department Ledger & Department Summary
  function exportPackingCSV() {
    let csv = 'SKU,Item_Name,UOM,Opening,Receiving,Total_Issues,Closing_Balance,Physical_Balance,Variance';
    // Append each department name as a column
    DB.departments.forEach(d => {
      csv += `,"Issues_to_${d.code}"`;
    });
    csv += '\n';

    DB.packingInventory.forEach(pi => {
      let issuesTotal = 0;
      if (pi.issues) {
        Object.values(pi.issues).forEach(v => { issuesTotal += Number(v || 0); });
      }
      const closing = pi.opening + pi.receiving - issuesTotal;
      const variance = pi.physical - closing;

      csv += `"${pi.sku}","${pi.name || pi.sku}","${pi.uom}",${pi.opening},${pi.receiving},${issuesTotal},${closing},${pi.physical},${variance}`;

      DB.departments.forEach(d => {
        const deptQty = (pi.issues && pi.issues[d.id]) ? pi.issues[d.id] : 0;
        csv += `,${deptQty}`;
      });
      csv += '\n';
    });

    downloadCSV(csv, `Packing_Department_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
  }

  // 4. Export Retail Inventory
  function exportRetailCSV() {
    let csv = 'SKU,Item_Name,Category,UOM,Opening,Purchases_Receiving,Total_Issues,Closing_Balance,Physical_Balance,Variance,Unit_Cost,Asset_Value\n';
    DB.retailInventory.forEach(ri => {
      const item = getItem(ri.sku);
      let issuesTotal = 0;
      if (ri.issues) {
        Object.values(ri.issues).forEach(v => { issuesTotal += Number(v || 0); });
      }
      const closing = ri.opening + ri.receiving - issuesTotal;
      const variance = ri.physical - closing;
      const assetVal = closing * (item.costPrice || 0);

      csv += `"${ri.sku}","${ri.name || item.name}","${ri.category || item.category}","${ri.uom}",${ri.opening},${ri.receiving},${issuesTotal},${closing},${ri.physical},${variance},${item.costPrice || 0},${assetVal}\n`;
    });
    downloadCSV(csv, `Retail_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
  }

  // 5. Export Item Master
  function exportItemMasterCSV() {
    let csv = 'SKU_Code,Item_Name,Category,UOM,Target_Roasting_Loss_Pct,Cost_Price,Selling_Price,Reorder_Level,Origin\n';
    DB.items.forEach(i => {
      csv += `"${i.sku}","${i.name}","${i.category}","${i.uom}",${i.targetLossPct || 0},${i.costPrice || 0},${i.sellPrice || 0},${i.reorderLevel || 0},"${i.origin || ''}"\n`;
    });
    downloadCSV(csv, `Item_Master_${new Date().toISOString().split('T')[0]}.csv`);
  }

  // 6. JSON Backup Export & Import
  function exportDatabaseJSON() {
    const dataStr = JSON.stringify(DB, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Coffee_Retails_DB_Backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Complete Database JSON backup downloaded!');
  }

  function handleImportJSON(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const imported = JSON.parse(e.target.result);
        if (imported.items && imported.greenCoffee && imported.roasteryBatches) {
          DB = imported;
          saveDatabase();
          refreshAllViews();
          showToast('Database backup successfully restored!', 'success');
        } else {
          showToast('Invalid backup file format.', 'error');
        }
      } catch (err) {
        showToast('Error parsing JSON backup file.', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  // 7. CSV Import for Item Master
  function handleImportItemMasterCSV(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        if (lines.length < 2) {
          showToast('CSV is empty or missing data rows.', 'error');
          return;
        }

        let addedCount = 0;
        // Parse CSV rows
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
          if (cols.length >= 2 && cols[0]) {
            const sku = cols[0].toUpperCase();
            const name = cols[1];
            const category = cols[2] || 'Green Coffee';
            const uom = cols[3] || 'kg';
            const loss = parseFloat(cols[4]) || 0;
            const cost = parseFloat(cols[5]) || 0;
            const price = parseFloat(cols[6]) || 0;
            const reorder = parseFloat(cols[7]) || 0;
            const origin = cols[8] || '';

            const existingIdx = DB.items.findIndex(it => it.sku === sku);
            const itemObj = {
              id: existingIdx !== -1 ? DB.items[existingIdx].id : 'item_' + Date.now() + '_' + i,
              sku,
              name,
              category,
              uom,
              targetLossPct: loss,
              costPrice: cost,
              sellPrice: price,
              reorderLevel: reorder,
              origin
            };

            if (existingIdx !== -1) {
              DB.items[existingIdx] = itemObj;
            } else {
              DB.items.push(itemObj);
              addedCount++;
            }
          }
        }

        saveDatabase();
        populateSelects();
        renderItemMaster();
        showToast(`Successfully processed Item Master CSV! Added/Updated ${lines.length - 1} SKUs.`);
      } catch (err) {
        showToast('Error reading CSV file. Check format.', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  }

  function resetToDemoData() {
    if (confirm('Are you sure you want to reload realistic sample data? Any unbacked up custom edits will be replaced.')) {
      DB = JSON.parse(JSON.stringify(DEFAULT_SEED_DATA));
      saveDatabase();
      refreshAllViews();
      showToast('Loaded demo dataset successfully!', 'info');
    }
  }

  // ==============================================================================
  // VIEW SWITCHER & NAVIGATION
  // ==============================================================================
  function switchTab(tabId) {
    // Hide all tab panes
    document.querySelectorAll('.tab-pane').forEach(el => el.classList.remove('active'));

    // Show target tab
    const target = document.getElementById(`tab-${tabId}`);
    if (target) target.classList.add('active');

    // Update active nav button
    document.querySelectorAll('.nav-btn, .nav-sub-btn').forEach(btn => btn.classList.remove('active'));

    const navBtn = document.getElementById(`nav-${tabId}`);
    if (navBtn) navBtn.classList.add('active');

    // If sub-tab, highlight coffee parent
    if (['green', 'roastery', 'packing'].includes(tabId)) {
      const parentCoffee = document.getElementById('nav-coffee-group');
      if (parentCoffee) parentCoffee.classList.add('active');
    }

    // Update breadcrumb
    const breadcrumb = document.getElementById('topbar-page-title');
    if (breadcrumb) {
      const titles = {
        'dashboard': 'Smart Dashboard',
        'green': 'Green Coffee Inventory',
        'roastery': 'Roastery Unit & Roasting Loss',
        'packing': 'Packing Department & Dispatches',
        'retail': 'Retail Merchandise & Packaging Materials',
        'itemmaster': 'Item Master Catalog',
        'departments': 'Locations & Dynamic Departments',
        'ledger': 'Audit Trail & Transactions Ledger',
        'impexp': 'Import & Export Hub'
      };
      breadcrumb.textContent = titles[tabId] || 'Inventory OS';
    }

    // Refresh specific view data
    if (tabId === 'dashboard') renderDashboard();
    else if (tabId === 'green') renderGreenCoffee();
    else if (tabId === 'roastery') renderRoastery();
    else if (tabId === 'packing') renderPacking();
    else if (tabId === 'retail') renderRetail();
    else if (tabId === 'itemmaster') renderItemMaster();
    else if (tabId === 'departments') renderDepartments();
    else if (tabId === 'ledger') renderLedger();

    // Close mobile sidebar if open
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.remove('mobile-open');
  }

  function refreshAllViews() {
    populateSelects();
    renderDashboard();
    renderGreenCoffee();
    renderRoastery();
    renderPacking();
    renderRetail();
    renderItemMaster();
    renderDepartments();
    renderLedger();
  }



  // ==============================================================================
  // INITIALIZATION & EVENT LISTENERS
  // ==============================================================================
  function initApp() {
    // Attach form submit handlers
    const formGreenPurchase = document.getElementById('form-green-purchase');
    if (formGreenPurchase) formGreenPurchase.addEventListener('submit', submitGreenPurchase);

    const formIssueRoastery = document.getElementById('form-issue-roastery');
    if (formIssueRoastery) formIssueRoastery.addEventListener('submit', submitIssueToRoastery);

    const formRoastBatch = document.getElementById('form-roast-batch');
    if (formRoastBatch) formRoastBatch.addEventListener('submit', submitRoastBatch);

    const formPackingIssue = document.getElementById('form-packing-issue');
    if (formPackingIssue) formPackingIssue.addEventListener('submit', submitPackingIssue);

    const formRetailPurchase = document.getElementById('form-retail-purchase');
    if (formRetailPurchase) formRetailPurchase.addEventListener('submit', submitRetailPurchase);

    const formRetailIssue = document.getElementById('form-retail-issue');
    if (formRetailIssue) formRetailIssue.addEventListener('submit', submitRetailIssue);

    const formNewDept = document.getElementById('form-new-dept');
    if (formNewDept) formNewDept.addEventListener('submit', submitNewDepartment);

    const formNewOutlet = document.getElementById('form-new-outlet');
    if (formNewOutlet) formNewOutlet.addEventListener('submit', submitNewOutlet);

    const formItemMaster = document.getElementById('form-item-master');
    if (formItemMaster) formItemMaster.addEventListener('submit', submitItemMaster);

    // Live calculation in Roast Batch Modal (Loss kg and %)
    const greenInInput = document.getElementById('rb-green-in');
    const roastedOutInput = document.getElementById('rb-roasted-out');
    function updateRoastPreview() {
      const gIn = parseFloat(greenInInput.value) || 0;
      const rOut = parseFloat(roastedOutInput.value) || 0;
      const previewEl = document.getElementById('roast-calc-preview');
      if (!previewEl) return;

      if (gIn > 0 && rOut > 0 && rOut < gIn) {
        const lossKg = gIn - rOut;
        const lossPct = (lossKg / gIn) * 100;
        previewEl.innerHTML = `Loss: <strong>${formatNumber(lossKg, 1)} kg</strong> (${formatNumber(lossPct, 1)}%)`;
        previewEl.style.color = lossPct > 18 ? 'var(--danger-crimson)' : 'var(--amber-bright)';
      } else {
        previewEl.innerHTML = `Loss: <strong>0.0 kg</strong> (0.0%)`;
        previewEl.style.color = 'var(--text-muted)';
      }
    }
    if (greenInInput && roastedOutInput) {
      greenInInput.addEventListener('input', updateRoastPreview);
      roastedOutInput.addEventListener('input', updateRoastPreview);
    }

    // Search inputs
    const greenSearch = document.getElementById('green-search-input');
    if (greenSearch) greenSearch.addEventListener('input', renderGreenCoffee);

    const roastSearch = document.getElementById('roastery-search-input');
    if (roastSearch) roastSearch.addEventListener('input', renderRoastery);

    const packSearch = document.getElementById('packing-search-input');
    if (packSearch) packSearch.addEventListener('input', renderPacking);

    const retailSearch = document.getElementById('retail-search-input');
    if (retailSearch) retailSearch.addEventListener('input', renderRetail);

    const itemSearch = document.getElementById('item-master-search-input');
    if (itemSearch) itemSearch.addEventListener('input', renderItemMaster);

    const catFilter = document.getElementById('item-master-category-filter');
    if (catFilter) catFilter.addEventListener('change', renderItemMaster);

    // Mobile sidebar toggle
    const mobileBtn = document.querySelector('.mobile-menu-toggle');
    if (mobileBtn) {
      mobileBtn.addEventListener('click', () => {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.toggle('mobile-open');
      });
    }

    // Modal background click to close
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('open');
        }
      });
    });

    // Initial render
    refreshAllViews();
    switchTab('dashboard');
  }

  // ==============================================================================
  // PUBLIC EXPOSURE FOR HTML BUTTONS
  // ==============================================================================
  window.CoffeeApp = {
    switchTab,
    openModal,
    closeModal,
    updateGreenPhysical,
    updatePackingPhysical,
    updateRetailPhysical,
    exportGreenCoffeeCSV,
    exportRoasteryCSV,
    exportPackingCSV,
    exportRetailCSV,
    exportItemMasterCSV,
    exportDatabaseJSON,
    handleImportJSON,
    handleImportItemMasterCSV,
    resetToDemoData,

    openGreenPurchaseModal: function (sku) {
      const sel = document.getElementById('gp-sku');
      if (sel && sku) sel.value = sku;
      openModal('modal-green-purchase');
    },

    openIssueToRoasteryModal: function (sku) {
      const sel = document.getElementById('ir-sku');
      if (sel && sku) sel.value = sku;
      openModal('modal-issue-roastery');
    },

    openNewRoastModal: function (greenSku) {
      const sel = document.getElementById('rb-green-sku');
      if (sel && greenSku) sel.value = greenSku;
      openModal('modal-new-roast');
    },

    openPackingIssueModal: function (sku, deptId) {
      const selSku = document.getElementById('pi-sku');
      if (selSku && sku) selSku.value = sku;
      const selDept = document.getElementById('pi-dept');
      if (selDept && deptId) selDept.value = deptId;
      openModal('modal-packing-issue');
    },

    openRetailPurchaseModal: function (sku) {
      const sel = document.getElementById('rp-sku');
      if (sel && sku) sel.value = sku;
      openModal('modal-retail-purchase');
    },

    openRetailIssueModal: function (sku) {
      const sel = document.getElementById('ri-sku');
      if (sel && sku) sel.value = sku;
      openModal('modal-retail-issue');
    },

    openAddItemModal: function () {
      document.getElementById('form-item-master').reset();
      document.getElementById('im-edit-id').value = '';
      document.getElementById('im-modal-title').textContent = 'Add Master SKU Item';
      openModal('modal-item-master');
    },

    openEditItemModal: function (id) {
      const item = DB.items.find(i => i.id === id);
      if (!item) return;

      document.getElementById('im-edit-id').value = item.id;
      document.getElementById('im-sku').value = item.sku;
      document.getElementById('im-name').value = item.name;
      document.getElementById('im-category').value = item.category;
      document.getElementById('im-uom').value = item.uom;
      document.getElementById('im-loss').value = item.targetLossPct || 0;
      document.getElementById('im-cost').value = item.costPrice || 0;
      document.getElementById('im-price').value = item.sellPrice || 0;
      document.getElementById('im-reorder').value = item.reorderLevel || 0;
      document.getElementById('im-origin').value = item.origin || '';

      document.getElementById('im-modal-title').textContent = `Edit SKU: ${item.sku}`;
      openModal('modal-item-master');
    },

    deleteItem: function (id) {
      const item = DB.items.find(i => i.id === id);
      if (!item) return;
      if (confirm(`Are you sure you want to remove ${item.sku} (${item.name}) from Item Master?`)) {
        DB.items = DB.items.filter(i => i.id !== id);
        saveDatabase();
        populateSelects();
        renderItemMaster();
        showToast(`Item ${item.sku} removed.`);
      }
    },

    deleteDepartment: function (deptId) {
      const d = DB.departments.find(dept => dept.id === deptId);
      if (!d) return;
      if (d.isSystem) {
        showToast('System core departments cannot be deleted.', 'error');
        return;
      }
      if (confirm(`Delete custom department "${d.name}"?`)) {
        DB.departments = DB.departments.filter(dept => dept.id !== deptId);
        saveDatabase();
        populateSelects();
        renderDepartments();
        renderDepartmentIssuesSummary();
        showToast(`Department "${d.name}" deleted.`);
      }
    }
  };

  // Launch on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
