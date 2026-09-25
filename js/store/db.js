/**
 * CraftMatrix Pro Central Database & Store
 * Provides structured models, multi-category seed data, and persistent ledger storage.
 */

const STORAGE_KEY = 'craftmatrix_db_v2';

export const CATEGORIES = {
  FOOD: 'food',
  LIQUOR: 'liquor',
  NAB: 'nab',
  TOBACCO: 'tobacco',
  BREWERY: 'brewery'
};

export const LOCATIONS = [
  { id: 'loc_main_bar', name: 'Main Bar', type: 'front_of_house' },
  { id: 'loc_kitchen', name: 'Kitchen Line', type: 'kitchen' },
  { id: 'loc_walkin', name: 'Walk-In Cooler', type: 'storage' },
  { id: 'loc_dry_pantry', name: 'Dry Storage / Pantry', type: 'storage' },
  { id: 'loc_cellar', name: 'Liquor & Wine Cellar', type: 'secure_storage' },
  { id: 'loc_tank_room', name: 'Brewhouse Tank Room', type: 'production' },
  { id: 'loc_humidor', name: 'Retail Humidor', type: 'retail' }
];

export const VENDORS = [
  { id: 'ven_sysco', name: 'Sysco Food Services', email: 'orders@sysco.com', phone: '(555) 234-5678', category: 'food' },
  { id: 'ven_southern', name: "Southern Glazer's Wine & Spirits", email: 'orders@sgws.com', phone: '(555) 876-5432', category: 'liquor' },
  { id: 'ven_bsg', name: 'BSG CraftBrewing Supplies', email: 'orders@bsgcraft.com', phone: '(555) 345-6789', category: 'brewery' },
  { id: 'ven_beverage_dist', name: 'Metropolitan NAB Distributors', email: 'sales@metrobev.com', phone: '(555) 456-7890', category: 'nab' },
  { id: 'ven_cigar_supply', name: 'Crown Tobacco & Cigar Imports', email: 'orders@crowncigar.com', phone: '(555) 901-2345', category: 'tobacco' }
];

// ============================================================================
// USER ROLES & TEAM DIRECTORY
// ============================================================================
export const USER_ROLES = {
  ADMIN: {
    id: 'admin',
    name: 'General Manager / Admin',
    badgeClass: 'badge-admin',
    allowedTabs: ['dashboard', 'inventory', 'subrecipes', 'recipes', 'menumaster', 'brewery', 'taproom', 'pos', 'audits', 'purchasing', 'analytics'],
    defaultTab: 'dashboard',
    canManageUsers: true,
    canEditCosting: true
  },
  BREWER: {
    id: 'brewer',
    name: 'Head Brewer / Cellar Master',
    badgeClass: 'badge-brewer',
    allowedTabs: ['dashboard', 'inventory', 'subrecipes', 'recipes', 'brewery', 'taproom'],
    defaultTab: 'brewery',
    canManageUsers: false,
    canEditCosting: true
  },
  CHEF: {
    id: 'chef',
    name: 'Executive Chef / Kitchen Lead',
    badgeClass: 'badge-chef',
    allowedTabs: ['dashboard', 'inventory', 'subrecipes', 'recipes', 'menumaster', 'purchasing'],
    defaultTab: 'recipes',
    canManageUsers: false,
    canEditCosting: true
  },
  BARTENDER: {
    id: 'bartender',
    name: 'Lead Bartender / Cashier',
    badgeClass: 'badge-bartender',
    allowedTabs: ['dashboard', 'taproom', 'pos'],
    defaultTab: 'pos',
    canManageUsers: false,
    canEditCosting: false
  },
  INVENTORY: {
    id: 'inventory',
    name: 'Inventory & Purchasing Lead',
    badgeClass: 'badge-inventory',
    allowedTabs: ['dashboard', 'inventory', 'audits', 'purchasing', 'analytics'],
    defaultTab: 'inventory',
    canManageUsers: false,
    canEditCosting: false
  }
};

export const INITIAL_USERS = [
  {
    id: 'usr_admin',
    name: 'Marcus Vance',
    email: 'admin@vkcontrols.local',
    username: 'admin',
    password: 'password123',
    pin: '1111',
    role: 'admin',
    title: 'General Manager',
    avatar: '👑',
    color: '#f59e0b',
    active: true
  },
  {
    id: 'usr_brewer',
    name: 'Elena Rostova',
    email: 'brewer@vkcontrols.local',
    username: 'elena',
    password: 'password123',
    pin: '2222',
    role: 'brewer',
    title: 'Head Brewmaster',
    avatar: '🍺',
    color: '#eab308',
    active: true
  },
  {
    id: 'usr_chef',
    name: 'Mateo Rossi',
    email: 'chef@vkcontrols.local',
    username: 'mateo',
    password: 'password123',
    pin: '3333',
    role: 'chef',
    title: 'Executive Chef',
    avatar: '👨‍🍳',
    color: '#10b981',
    active: true
  },
  {
    id: 'usr_bartender',
    name: 'Chloe Bennett',
    email: 'pos@vkcontrols.local',
    username: 'chloe',
    password: 'password123',
    pin: '4444',
    role: 'bartender',
    title: 'Lead Mixologist',
    avatar: '🍸',
    color: '#06b6d4',
    active: true
  },
  {
    id: 'usr_auditor',
    name: 'David Kim',
    email: 'audit@vkcontrols.local',
    username: 'david',
    password: 'password123',
    pin: '5555',
    role: 'inventory',
    title: 'Purchasing & Auditor',
    avatar: '📋',
    color: '#a855f7',
    active: true
  }
];

// ============================================================================
// 1. ITEM MASTER (Raw Materials, Ingredients & Stock Catalog)
// ============================================================================
export const INITIAL_ITEMS = [
  // FOOD & PERISHABLES
  {
    id: 'item_beef_patty',
    sku: 'FD-BEEF-01',
    name: 'Angus Ground Beef (80/20)',
    category: CATEGORIES.FOOD,
    subCategory: 'Meat & Poultry',
    storageZone: 'Walk-In Cooler (34°F)',
    primaryLocationId: 'loc_walkin',
    packageUom: 'lb',
    packageCost: 4.85,
    recipeUom: 'g',
    currentStock: 45.0, // lbs
    parLevel: 25.0,
    reorderQty: 50.0,
    yieldLossPercent: 5.0,
    shelfLifeDays: 7,
    vendorId: 'ven_sysco'
  },
  {
    id: 'item_brioche_buns',
    sku: 'FD-BUN-02',
    name: 'Artisan Brioche Burger Buns',
    category: CATEGORIES.FOOD,
    subCategory: 'Bakery',
    storageZone: 'Dry Storage / Pantry',
    primaryLocationId: 'loc_kitchen',
    packageUom: 'each',
    packageCost: 0.65,
    recipeUom: 'each',
    currentStock: 80,
    parLevel: 40,
    reorderQty: 100,
    yieldLossPercent: 2.0,
    shelfLifeDays: 5,
    vendorId: 'ven_sysco'
  },
  {
    id: 'item_aged_cheddar',
    sku: 'FD-CHED-03',
    name: 'Sharp White Aged Cheddar Block',
    category: CATEGORIES.FOOD,
    subCategory: 'Dairy',
    storageZone: 'Walk-In Cooler (36°F)',
    primaryLocationId: 'loc_kitchen',
    packageUom: 'lb',
    packageCost: 6.20,
    recipeUom: 'g',
    currentStock: 18.5,
    parLevel: 10.0,
    reorderQty: 20.0,
    yieldLossPercent: 3.0,
    shelfLifeDays: 30,
    vendorId: 'ven_sysco'
  },
  {
    id: 'item_sugar_granulated',
    sku: 'FD-SUG-04',
    name: 'Pure Cane Granulated Sugar (50lb)',
    category: CATEGORIES.FOOD,
    subCategory: 'Dry Goods',
    storageZone: 'Dry Storage / Pantry',
    primaryLocationId: 'loc_dry_pantry',
    packageUom: 'lb',
    packageCost: 1.10,
    recipeUom: 'g',
    currentStock: 50.0,
    parLevel: 20.0,
    reorderQty: 50.0,
    yieldLossPercent: 0.0,
    shelfLifeDays: 365,
    vendorId: 'ven_sysco'
  },
  {
    id: 'item_fresh_limes',
    sku: 'FD-LIME-05',
    name: 'Fresh Persian Limes (Juicing Grade)',
    category: CATEGORIES.FOOD,
    subCategory: 'Produce',
    storageZone: 'Walk-In Cooler (38°F)',
    primaryLocationId: 'loc_main_bar',
    packageUom: 'lb',
    packageCost: 2.40,
    recipeUom: 'fl_oz',
    currentStock: 15.0,
    parLevel: 10.0,
    reorderQty: 25.0,
    yieldLossPercent: 25.0,
    shelfLifeDays: 10,
    vendorId: 'ven_sysco'
  },
  {
    id: 'item_bacon_strips',
    sku: 'FD-BAC-06',
    name: 'Thick-Cut Applewood Smoked Bacon',
    category: CATEGORIES.FOOD,
    subCategory: 'Meat & Poultry',
    storageZone: 'Walk-In Cooler (34°F)',
    primaryLocationId: 'loc_walkin',
    packageUom: 'lb',
    packageCost: 5.50,
    recipeUom: 'g',
    currentStock: 22.0,
    parLevel: 12.0,
    reorderQty: 30.0,
    yieldLossPercent: 15.0,
    shelfLifeDays: 14,
    vendorId: 'ven_sysco'
  },
  {
    id: 'item_prime_ribeye',
    sku: 'FD-STK-07',
    name: 'USDA Prime Black Angus Ribeye (14oz Cut)',
    category: CATEGORIES.FOOD,
    subCategory: 'Meat & Poultry',
    storageZone: 'Meat Aging Cooler (33°F)',
    primaryLocationId: 'loc_walkin',
    packageUom: 'each',
    packageCost: 18.50,
    recipeUom: 'each',
    currentStock: 16,
    parLevel: 8,
    reorderQty: 24,
    yieldLossPercent: 2.0,
    shelfLifeDays: 10,
    vendorId: 'ven_sysco'
  },

  // LIQUOR, SPIRITS & WINE
  {
    id: 'item_bourbon_makers',
    sku: 'LQ-BBN-01',
    name: "Maker's Mark Kentucky Bourbon 750ml",
    category: CATEGORIES.LIQUOR,
    subCategory: 'Whiskey / Bourbon',
    abvPercent: 45.0,
    bottleSizeMl: 750,
    primaryLocationId: 'loc_main_bar',
    packageUom: 'bottle_750ml',
    packageCost: 28.50,
    recipeUom: 'fl_oz',
    currentStock: 8.7,
    openBottleTenths: 0.7,
    parLevel: 4.0,
    reorderQty: 12.0,
    yieldLossPercent: 2.0,
    vendorId: 'ven_southern'
  },
  {
    id: 'item_vodka_greygoose',
    sku: 'LQ-VDK-02',
    name: 'Grey Goose French Vodka 1L',
    category: CATEGORIES.LIQUOR,
    subCategory: 'Vodka',
    abvPercent: 40.0,
    bottleSizeMl: 1000,
    primaryLocationId: 'loc_main_bar',
    packageUom: 'bottle_1L',
    packageCost: 36.00,
    recipeUom: 'fl_oz',
    currentStock: 6.4,
    openBottleTenths: 0.4,
    parLevel: 4.0,
    reorderQty: 12.0,
    yieldLossPercent: 2.0,
    vendorId: 'ven_southern'
  },
  {
    id: 'item_tequila_casamigos',
    sku: 'LQ-TEQ-03',
    name: 'Casamigos Blanco Tequila 750ml',
    category: CATEGORIES.LIQUOR,
    subCategory: 'Tequila / Agave',
    abvPercent: 40.0,
    bottleSizeMl: 750,
    primaryLocationId: 'loc_main_bar',
    packageUom: 'bottle_750ml',
    packageCost: 44.00,
    recipeUom: 'fl_oz',
    currentStock: 5.2,
    openBottleTenths: 0.2,
    parLevel: 3.0,
    reorderQty: 6.0,
    yieldLossPercent: 2.0,
    vendorId: 'ven_southern'
  },
  {
    id: 'item_bitters_angostura',
    sku: 'LQ-BIT-04',
    name: 'Angostura Aromatic Bitters 200ml',
    category: CATEGORIES.LIQUOR,
    subCategory: 'Bitters / Modifiers',
    abvPercent: 44.7,
    bottleSizeMl: 200,
    primaryLocationId: 'loc_main_bar',
    packageUom: 'each',
    packageCost: 11.50,
    recipeUom: 'dash',
    currentStock: 3.8,
    openBottleTenths: 0.8,
    parLevel: 2.0,
    reorderQty: 6.0,
    yieldLossPercent: 1.0,
    vendorId: 'ven_southern'
  },

  // NAB (NON-ALCOHOLIC BEVERAGES)
  {
    id: 'item_coke_bib',
    sku: 'NAB-COKE-01',
    name: 'Coca-Cola BIB Post-Mix Syrup 5 Gal',
    category: CATEGORIES.NAB,
    subCategory: 'Fountain Soda Syrup',
    primaryLocationId: 'loc_cellar',
    packageUom: 'gal',
    packageCost: 95.00,
    recipeUom: 'fl_oz',
    currentStock: 2.5,
    parLevel: 2.0,
    reorderQty: 4.0,
    brixRatio: '5:1 Dilution',
    yieldLossPercent: 2.0,
    vendorId: 'ven_beverage_dist'
  },
  {
    id: 'item_ginger_beer',
    sku: 'NAB-GBEER-02',
    name: 'Fever-Tree Premium Ginger Beer (24pk)',
    category: CATEGORIES.NAB,
    subCategory: 'Mixers / Craft Cans',
    primaryLocationId: 'loc_main_bar',
    packageUom: 'case_24',
    packageCost: 32.00,
    recipeUom: 'fl_oz',
    currentStock: 4.5,
    parLevel: 2.0,
    reorderQty: 5.0,
    yieldLossPercent: 1.0,
    vendorId: 'ven_beverage_dist'
  },
  {
    id: 'item_espresso_beans',
    sku: 'NAB-COFF-03',
    name: 'Single-Origin Ethiopian Espresso Beans (5lb)',
    category: CATEGORIES.NAB,
    subCategory: 'Coffee & Tea',
    primaryLocationId: 'loc_main_bar',
    packageUom: 'lb',
    packageCost: 14.50,
    recipeUom: 'g',
    currentStock: 12.0,
    parLevel: 6.0,
    reorderQty: 15.0,
    yieldLossPercent: 3.0,
    shelfLifeDays: 90,
    vendorId: 'ven_beverage_dist'
  },
  {
    id: 'item_whole_milk',
    sku: 'NAB-MILK-04',
    name: 'Organic Whole Milk (Gallon)',
    category: CATEGORIES.NAB,
    subCategory: 'Dairy / Barista',
    primaryLocationId: 'loc_main_bar',
    packageUom: 'gal',
    packageCost: 4.25,
    recipeUom: 'fl_oz',
    currentStock: 6.0,
    parLevel: 4.0,
    reorderQty: 8.0,
    yieldLossPercent: 2.0,
    shelfLifeDays: 14,
    vendorId: 'ven_sysco'
  },

  // TOBACCO & STAMPED GOODS
  {
    id: 'item_cohiba_robusto',
    sku: 'TOB-COH-01',
    name: 'Cohiba Robusto Hand-Rolled Cigar',
    category: CATEGORIES.TOBACCO,
    subCategory: 'Premium Cigars',
    taxStampId: 'STAMP-FED-2026-COH-992',
    originCountry: 'Dominican Republic',
    primaryLocationId: 'loc_humidor',
    packageUom: 'each',
    packageCost: 12.50,
    recipeUom: 'each',
    currentStock: 48,
    parLevel: 20,
    reorderQty: 50,
    yieldLossPercent: 0.0,
    vendorId: 'ven_cigar_supply'
  },
  {
    id: 'item_marlboro_gold',
    sku: 'TOB-MARL-02',
    name: 'Marlboro Gold Box (Carton of 10)',
    category: CATEGORIES.TOBACCO,
    subCategory: 'Cigarettes',
    taxStampId: 'STAMP-STATE-NY-8841',
    primaryLocationId: 'loc_cellar',
    packageUom: 'carton_10pack',
    packageCost: 92.00,
    recipeUom: 'each',
    currentStock: 14,
    parLevel: 8,
    reorderQty: 20,
    yieldLossPercent: 0.0,
    vendorId: 'ven_cigar_supply'
  },

  // BREWERY RAW MATERIALS & FINISHED GOODS
  {
    id: 'item_malt_2row',
    sku: 'BRW-MALT-01',
    name: 'Rahr 2-Row Pale Brewer Malt (55lb Sack)',
    category: CATEGORIES.BREWERY,
    subCategory: 'Malts & Grains',
    primaryLocationId: 'loc_tank_room',
    packageUom: 'sack_55lb',
    packageCost: 42.00,
    recipeUom: 'lb',
    currentStock: 18,
    parLevel: 10,
    reorderQty: 20,
    yieldLossPercent: 1.0,
    vendorId: 'ven_bsg'
  },
  {
    id: 'item_hops_citra',
    sku: 'BRW-HOP-02',
    name: 'Citra T-90 Hop Pellets (1 lb Foil)',
    category: CATEGORIES.BREWERY,
    subCategory: 'Hops',
    alphaAcidPercent: 13.5,
    cropYear: 2025,
    primaryLocationId: 'loc_tank_room',
    packageUom: 'lb',
    packageCost: 24.00,
    recipeUom: 'oz',
    currentStock: 25.0,
    parLevel: 12.0,
    reorderQty: 30.0,
    yieldLossPercent: 0.5,
    vendorId: 'ven_bsg'
  },
  {
    id: 'item_hops_mosaic',
    sku: 'BRW-HOP-03',
    name: 'Mosaic T-90 Hop Pellets (1 lb Foil)',
    category: CATEGORIES.BREWERY,
    subCategory: 'Hops',
    alphaAcidPercent: 12.2,
    cropYear: 2025,
    primaryLocationId: 'loc_tank_room',
    packageUom: 'lb',
    packageCost: 26.00,
    recipeUom: 'oz',
    currentStock: 19.5,
    parLevel: 10.0,
    reorderQty: 25.0,
    yieldLossPercent: 0.5,
    vendorId: 'ven_bsg'
  },
  {
    id: 'item_yeast_us05',
    sku: 'BRW-YST-04',
    name: 'SafAle US-05 Dry American Ale Yeast (500g)',
    category: CATEGORIES.BREWERY,
    subCategory: 'Yeast & Fermentation',
    primaryLocationId: 'loc_walkin',
    packageUom: 'each',
    packageCost: 78.00,
    recipeUom: 'g',
    currentStock: 4,
    parLevel: 2,
    reorderQty: 5,
    yieldLossPercent: 0.0,
    vendorId: 'ven_bsg'
  }
];

// ============================================================================
// 2. SUB-RECIPE MASTER (Semi-Finished Goods, Syrups, Sauces & Preps)
// ============================================================================
export const INITIAL_SUB_RECIPES = [
  {
    id: 'sub_simple_syrup',
    sku: 'SUB-SYR-01',
    name: 'House Rich Simple Syrup (2:1)',
    category: CATEGORIES.LIQUOR,
    yieldQty: 32,
    yieldUom: 'fl_oz',
    prepTimeMins: 15,
    shelfLifeDays: 30,
    storageZone: 'Main Bar Speed Rack / 38°F',
    allergens: ['None'],
    instructions: 'Combine 2 parts granulated cane sugar with 1 part warm filtered water (170°F). Stir until crystal clear. Chill and bottle in sanitized glass bottles with pour spouts.',
    ingredients: [
      { itemId: 'item_sugar_granulated', qty: 2.0, uom: 'lb', yieldLoss: 0 }
    ]
  },
  {
    id: 'sub_sour_mix',
    sku: 'SUB-SOUR-02',
    name: 'Craft Citrus Fresh Sour Mix',
    category: CATEGORIES.LIQUOR,
    yieldQty: 64,
    yieldUom: 'fl_oz',
    prepTimeMins: 20,
    shelfLifeDays: 5,
    storageZone: 'Walk-In Cooler (34°F)',
    allergens: ['None'],
    instructions: 'Hand press fresh Persian limes. Fine strain pulp. Whisk 40 oz freshly squeezed lime juice with 24 oz House Rich Simple Syrup until completely integrated.',
    ingredients: [
      { itemId: 'item_fresh_limes', qty: 3.5, uom: 'lb', yieldLoss: 20 },
      { subRecipeId: 'sub_simple_syrup', qty: 24, uom: 'fl_oz', yieldLoss: 0 }
    ]
  },
  {
    id: 'sub_truffle_butter',
    sku: 'SUB-BTR-03',
    name: 'Herb Garlic & Truffle Butter Pucks',
    category: CATEGORIES.FOOD,
    yieldQty: 20,
    yieldUom: 'portion',
    prepTimeMins: 25,
    shelfLifeDays: 14,
    storageZone: 'Kitchen Prep Cooler (36°F)',
    allergens: ['Dairy'],
    instructions: 'Whip tempered European butter with roasted minced garlic, fresh rosemary, cracked black pepper, sea salt, and white truffle oil. Roll into parchment log and chill to slice into 20g pucks.',
    ingredients: [
      { itemId: 'item_whole_milk', qty: 0.5, uom: 'gal', yieldLoss: 5 },
      { itemId: 'item_aged_cheddar', qty: 0.5, uom: 'lb', yieldLoss: 2 }
    ]
  },
  {
    id: 'sub_burger_sauce',
    sku: 'SUB-SCE-04',
    name: 'House Secret Smokehouse Burger Sauce',
    category: CATEGORIES.FOOD,
    yieldQty: 48,
    yieldUom: 'fl_oz',
    prepTimeMins: 15,
    shelfLifeDays: 21,
    storageZone: 'Kitchen Walk-In Cooler',
    allergens: ['Egg', 'Mustard'],
    instructions: 'Emulsify smoked paprika, garlic aioli, sweet pickle relish, dijon mustard, Worcestershire sauce, and a splash of rich simple syrup with immersion blender.',
    ingredients: [
      { itemId: 'item_sugar_granulated', qty: 0.25, uom: 'lb', yieldLoss: 0 },
      { itemId: 'item_fresh_limes', qty: 0.5, uom: 'lb', yieldLoss: 10 }
    ]
  },
  {
    id: 'sub_cold_brew_conc',
    sku: 'SUB-COFF-05',
    name: '24-Hour Nitro Cold Brew Concentrate',
    category: CATEGORIES.NAB,
    yieldQty: 128,
    yieldUom: 'fl_oz',
    prepTimeMins: 1440,
    shelfLifeDays: 14,
    storageZone: 'Cellar Cold Room (36°F)',
    allergens: ['None'],
    instructions: 'Coarsely grind single-origin Ethiopian beans into 50-micron brew bag. Steep in cold reverse osmosis water for 24 hours at 38°F. Double filter and rack into sanitized Corny keg.',
    ingredients: [
      { itemId: 'item_espresso_beans', qty: 2.5, uom: 'lb', yieldLoss: 2 }
    ]
  }
];

// ============================================================================
// 3. RECIPE CARD MASTER (Finished Culinary Dishes, Cocktails & Specs)
// ============================================================================
export const INITIAL_RECIPES = [
  {
    id: 'rec_smoked_old_fashioned',
    sku: 'REC-LQ-01',
    name: 'Smoked Kentucky Old Fashioned',
    type: 'finished_item',
    category: CATEGORIES.LIQUOR,
    menuPrice: 16.00,
    targetMarginPercent: 82.0,
    station: 'Cocktail Station #1',
    glassware: 'Rocks Glass with Large Ice Sphere',
    garnish: 'Expressed Orange Peel & Luxardo Cherry',
    allergens: ['None'],
    instructions: '1. In mixing glass, add 3 dashes Angostura bitters and 0.25 oz House Rich Simple Syrup.\n2. Add 2.0 oz Maker\'s Mark Bourbon and fill mixing glass with dense ice.\n3. Stir with bar spoon for 30 seconds until chilled and diluted.\n4. Strain over 2-inch crystal clear ice sphere in chilled rocks glass.\n5. Smoke under cloche with applewood chips for 15 seconds. Express orange oil over top.',
    ingredients: [
      { itemId: 'item_bourbon_makers', qty: 2.0, uom: 'fl_oz', yieldLoss: 0 },
      { subRecipeId: 'sub_simple_syrup', qty: 0.25, uom: 'fl_oz', yieldLoss: 0 },
      { itemId: 'item_bitters_angostura', qty: 3, uom: 'dash', yieldLoss: 0 }
    ]
  },
  {
    id: 'rec_craft_margarita',
    sku: 'REC-LQ-02',
    name: 'Casamigos Handcrafted Margarita',
    type: 'finished_item',
    category: CATEGORIES.LIQUOR,
    menuPrice: 15.00,
    targetMarginPercent: 80.0,
    station: 'Cocktail Station #1',
    glassware: 'Coupe / Half Salt Rim',
    garnish: 'Dehydrated Lime Wheel',
    allergens: ['None'],
    instructions: '1. Rim half of chilled coupe with smoked Maldon sea salt.\n2. In shaker tin, combine 2.0 oz Casamigos Blanco Tequila and 1.25 oz Fresh Citrus Sour Mix.\n3. Add fresh ice and shake vigorously for 12 seconds.\n4. Double strain through fine mesh sieve into coupe. Float dehydrated lime wheel.',
    ingredients: [
      { itemId: 'item_tequila_casamigos', qty: 2.0, uom: 'fl_oz', yieldLoss: 0 },
      { subRecipeId: 'sub_sour_mix', qty: 1.25, uom: 'fl_oz', yieldLoss: 0 }
    ]
  },
  {
    id: 'rec_moscow_mule',
    sku: 'REC-LQ-03',
    name: 'Artisan Copper Cup Moscow Mule',
    type: 'finished_item',
    category: CATEGORIES.LIQUOR,
    menuPrice: 14.00,
    targetMarginPercent: 82.0,
    station: 'Main Bar',
    glassware: 'Hammered Copper Mule Mug',
    garnish: 'Fresh Slapped Mint Sprig & Candied Ginger',
    allergens: ['None'],
    instructions: '1. Fill copper mug with crushed pebble ice.\n2. Add 2.0 oz Grey Goose Vodka and 0.75 oz fresh lime juice.\n3. Top with 4.0 oz Fever-Tree spicy ginger beer.\n4. Stir gently with bar spoon to integrate without losing carbonation. Slap mint sprig and nestle beside ice.',
    ingredients: [
      { itemId: 'item_vodka_greygoose', qty: 2.0, uom: 'fl_oz', yieldLoss: 0 },
      { itemId: 'item_fresh_limes', qty: 0.75, uom: 'fl_oz', yieldLoss: 10 },
      { itemId: 'item_ginger_beer', qty: 4.0, uom: 'fl_oz', yieldLoss: 0 }
    ]
  },
  {
    id: 'rec_smash_burger',
    sku: 'REC-FD-01',
    name: 'Craft Double Angus Smash Burger',
    type: 'finished_item',
    category: CATEGORIES.FOOD,
    menuPrice: 18.50,
    targetMarginPercent: 72.0,
    station: 'Hot Line / Flat-Top Plancha',
    glassware: 'Artisan Wood Serving Board with Wax Paper',
    garnish: 'House Dill Pickle Spear',
    allergens: ['Gluten', 'Dairy', 'Egg'],
    instructions: '1. Portion two 100g balls of 80/20 Angus ground beef.\n2. Sear and smash paper-thin on 450°F cast iron flat-top until lacy crispy edges form (90 sec).\n3. Season with house burger spice, flip, top each patty with sharp aged cheddar.\n4. Butter and toast brioche bun on plancha. Spread 1.5 oz House Secret Burger Sauce on top and bottom buns.\n5. Stack patties and close burger.',
    ingredients: [
      { itemId: 'item_beef_patty', qty: 200, uom: 'g', yieldLoss: 5 },
      { itemId: 'item_brioche_buns', qty: 1, uom: 'each', yieldLoss: 0 },
      { itemId: 'item_aged_cheddar', qty: 35, uom: 'g', yieldLoss: 2 },
      { subRecipeId: 'sub_burger_sauce', qty: 1.5, uom: 'fl_oz', yieldLoss: 0 }
    ]
  },
  {
    id: 'rec_truffle_ribeye',
    sku: 'REC-FD-02',
    name: 'Prime Angus Ribeye with Herb Truffle Butter',
    type: 'finished_item',
    category: CATEGORIES.FOOD,
    menuPrice: 48.00,
    targetMarginPercent: 62.0,
    station: 'Broiler / Grill Station',
    glassware: 'Heated Ceramic Dinner Plate',
    garnish: 'Charred Rosemary Sprig & Smoked Flake Salt',
    allergens: ['Dairy'],
    instructions: '1. Temper 14oz Prime Angus Ribeye to room temperature for 20 mins. Season liberally with kosher salt and coarse black pepper.\n2. Sear over mesquite charcoal grill to desired medium-rare core (130°F).\n3. Rest steak for 6 minutes on cutting board.\n4. Top with 1 puck Herb Garlic & Truffle Butter and flash under salamander broiler until melting.',
    ingredients: [
      { itemId: 'item_prime_ribeye', qty: 1, uom: 'each', yieldLoss: 0 },
      { subRecipeId: 'sub_truffle_butter', qty: 1, uom: 'portion', yieldLoss: 0 }
    ]
  },
  {
    id: 'rec_craft_latte',
    sku: 'REC-NAB-01',
    name: 'Artisanal Double Espresso Latte',
    type: 'finished_item',
    category: CATEGORIES.NAB,
    menuPrice: 5.75,
    targetMarginPercent: 85.0,
    station: 'Espresso Bar',
    glassware: '10 oz Ceramic Tulip Cup',
    garnish: 'Rosetta Latte Art',
    allergens: ['Dairy'],
    instructions: '1. Grind 18g Ethiopian beans into precision 58mm portafilter basket. WDT distribute and tamp flat at 30 lbs pressure.\n2. Extract 36g double espresso at 9 bar in 27 seconds.\n3. Steam 6.0 oz whole milk to velvety microfoam at 145°F.\n4. Pour into espresso with rosetta latte art.',
    ingredients: [
      { itemId: 'item_espresso_beans', qty: 18, uom: 'g', yieldLoss: 3 },
      { itemId: 'item_whole_milk', qty: 6.0, uom: 'fl_oz', yieldLoss: 5 }
    ]
  },
  {
    id: 'rec_hazy_ipa_pint',
    sku: 'REC-BRW-01',
    name: 'Hazy Horizon NEIPA Fresh Draft Pint',
    type: 'finished_item',
    category: CATEGORIES.BREWERY,
    menuPrice: 8.50,
    targetMarginPercent: 84.0,
    station: 'Taproom Bar Line #1',
    glassware: '16 oz Nucleated IPA Glass',
    garnish: 'Dense Creamy White Head',
    allergens: ['Gluten'],
    instructions: '1. Rinse nucleated glass with cold RO water rinser.\n2. Pull Tap #1 at 45 degree angle, straightening at 3/4 fill to generate 1.5 finger creamy head.\n3. Serve immediately at 38°F.',
    ingredients: [
      { itemId: 'item_malt_2row', qty: 0.45, uom: 'lb', yieldLoss: 1 },
      { itemId: 'item_hops_citra', qty: 0.15, uom: 'oz', yieldLoss: 0 },
      { itemId: 'item_hops_mosaic', qty: 0.15, uom: 'oz', yieldLoss: 0 }
    ]
  },
  {
    id: 'rec_cigar_pack',
    sku: 'REC-TOB-01',
    name: 'Cohiba Robusto Single Retail Pack',
    type: 'finished_item',
    category: CATEGORIES.TOBACCO,
    menuPrice: 28.00,
    targetMarginPercent: 55.0,
    station: 'Humidor Counter',
    glassware: 'Spanish Cedar Presentation Tray',
    garnish: 'Matches & Cedar Spill',
    allergens: ['None'],
    instructions: '1. Select fresh stick from 70% RH humidor.\n2. Inspect wrapper leaf integrity, foot pack, and ring gauge.\n3. Present in cedar tray with guillotine cutter and wooden spills.',
    ingredients: [
      { itemId: 'item_cohiba_robusto', qty: 1, uom: 'each', yieldLoss: 0 }
    ]
  }
];

// ============================================================================
// 4. MENU MASTER (Front-of-House POS Menu & Sales Engineering)
// ============================================================================
export const INITIAL_MENU_ITEMS = [
  {
    id: 'menu_smash_burger',
    code: 'MNU-FD-01',
    name: 'Craft Double Angus Smash Burger',
    category: CATEGORIES.FOOD,
    department: 'Burgers & Mains',
    price: 18.50,
    taxCategory: 'standard', // standard 8.875%, liquor 10.0%, zero 0%
    recipeId: 'rec_smash_burger',
    description: 'Two 100g Angus patties, crispy lace crust, aged white cheddar, house burger sauce on brioche.',
    isActive: true,
    sortOrder: 1,
    modifiers: [
      { id: 'mod_extra_cheese', name: 'Add Extra Aged Cheddar', price: 1.50, itemId: 'item_aged_cheddar', qty: 20, uom: 'g' },
      { id: 'mod_extra_bacon', name: 'Add Thick-Cut Applewood Bacon', price: 2.50, itemId: 'item_bacon_strips', qty: 35, uom: 'g' },
      { id: 'mod_extra_patty', name: 'Add 3rd Angus Smash Patty', price: 4.50, itemId: 'item_beef_patty', qty: 100, uom: 'g' }
    ]
  },
  {
    id: 'menu_truffle_ribeye',
    code: 'MNU-FD-02',
    name: 'Prime Angus Ribeye (14oz)',
    category: CATEGORIES.FOOD,
    department: 'Burgers & Mains',
    price: 48.00,
    taxCategory: 'standard',
    recipeId: 'rec_truffle_ribeye',
    description: 'USDA Prime Black Angus ribeye, mesquite grilled, herb garlic & white truffle butter puck.',
    isActive: true,
    sortOrder: 2,
    modifiers: [
      { id: 'mod_double_butter', name: 'Extra Truffle Butter Puck', price: 3.00, subRecipeId: 'sub_truffle_butter', qty: 1, uom: 'portion' }
    ]
  },
  {
    id: 'menu_old_fashioned',
    code: 'MNU-LQ-01',
    name: 'Smoked Kentucky Old Fashioned',
    category: CATEGORIES.LIQUOR,
    department: 'Craft Cocktails',
    price: 16.00,
    taxCategory: 'liquor',
    recipeId: 'rec_smoked_old_fashioned',
    description: "Maker's Mark bourbon, house rich simple syrup, Angostura, applewood cloche smoke.",
    isActive: true,
    sortOrder: 3,
    modifiers: [
      { id: 'mod_double_bourbon', name: 'Double Bourbon Pour (+1 oz)', price: 6.00, itemId: 'item_bourbon_makers', qty: 1.0, uom: 'fl_oz' }
    ]
  },
  {
    id: 'menu_casamigos_margarita',
    code: 'MNU-LQ-02',
    name: 'Casamigos Handcrafted Margarita',
    category: CATEGORIES.LIQUOR,
    department: 'Craft Cocktails',
    price: 15.00,
    taxCategory: 'liquor',
    recipeId: 'rec_craft_margarita',
    description: 'Casamigos blanco tequila, freshly squeezed citrus sour mix, smoked salt rim.',
    isActive: true,
    sortOrder: 4,
    modifiers: [
      { id: 'mod_grand_marnier', name: 'Grand Marnier Float (0.5 oz)', price: 3.50 }
    ]
  },
  {
    id: 'menu_moscow_mule',
    code: 'MNU-LQ-03',
    name: 'Artisan Copper Cup Moscow Mule',
    category: CATEGORIES.LIQUOR,
    department: 'Craft Cocktails',
    price: 14.00,
    taxCategory: 'liquor',
    recipeId: 'rec_moscow_mule',
    description: 'Grey Goose vodka, fresh Persian lime, Fever-Tree spicy ginger beer, crushed ice.',
    isActive: true,
    sortOrder: 5,
    modifiers: []
  },
  {
    id: 'menu_hazy_ipa_pint',
    code: 'MNU-BRW-01',
    name: 'Hazy Horizon NEIPA (16oz Draft Pint)',
    category: CATEGORIES.BREWERY,
    department: 'Draft Beer',
    price: 8.50,
    taxCategory: 'standard',
    recipeId: 'rec_hazy_ipa_pint',
    description: 'Fresh brewhouse double dry-hopped NEIPA, Citra & Mosaic hops, 7.35% ABV.',
    isActive: true,
    sortOrder: 6,
    modifiers: []
  },
  {
    id: 'menu_craft_latte',
    code: 'MNU-NAB-01',
    name: 'Artisanal Double Espresso Latte',
    category: CATEGORIES.NAB,
    department: 'Barista & Coffee',
    price: 5.75,
    taxCategory: 'standard',
    recipeId: 'rec_craft_latte',
    description: 'Single-origin Ethiopian double espresso, microfoamed whole milk, rosetta art.',
    isActive: true,
    sortOrder: 7,
    modifiers: [
      { id: 'mod_extra_shot', name: 'Extra Double Shot Espresso', price: 2.00, itemId: 'item_espresso_beans', qty: 18, uom: 'g' },
      { id: 'mod_syrup_pump', name: 'House Simple Syrup Pump', price: 0.75, subRecipeId: 'sub_simple_syrup', qty: 0.5, uom: 'fl_oz' }
    ]
  },
  {
    id: 'menu_cohiba_cigar',
    code: 'MNU-TOB-01',
    name: 'Cohiba Robusto Premium Cigar',
    category: CATEGORIES.TOBACCO,
    department: 'Humidor & Cigars',
    price: 28.00,
    taxCategory: 'standard',
    recipeId: 'rec_cigar_pack',
    description: 'Dominican hand-rolled 50 ring gauge robusto, tax stamped, cedar service.',
    isActive: true,
    sortOrder: 8,
    modifiers: []
  }
];

export const INITIAL_BREW_BATCHES = [
  {
    id: 'batch_ipa_08',
    batchNumber: 'B2026-08',
    beerName: 'Hazy Horizon Double NEIPA',
    style: 'New England Hazy DIPA',
    targetVolumeBbl: 15.0,
    status: 'fermenting', // planned, mashing, boiling, fermenting, conditioning, brite_tank, packaged
    tankId: 'tank_fv_01',
    tankName: 'Fermenter #1 (15 BBL)',
    brewDate: '2026-08-25',
    estimatedPackDate: '2026-09-08',
    originalGravity: 1.074,
    currentGravity: 1.018,
    targetFinalGravity: 1.014,
    currentTempF: 67.5,
    phLevel: 4.35,
    estimatedAbv: 7.35,
    dryHopSchedule: 'Mosaic & Citra at Day 5 (8 lbs/BBL)',
    grainBill: [
      { itemId: 'item_malt_2row', qty: 12, uom: 'sack_55lb' }
    ],
    hopBill: [
      { itemId: 'item_hops_citra', qty: 8.0, uom: 'lb' },
      { itemId: 'item_hops_mosaic', qty: 8.0, uom: 'lb' }
    ]
  },
  {
    id: 'batch_stout_07',
    batchNumber: 'B2026-07',
    beerName: 'Midnight Velvet Oatmeal Stout',
    style: 'Oatmeal Stout',
    targetVolumeBbl: 10.0,
    status: 'conditioning',
    tankId: 'tank_fv_02',
    tankName: 'Fermenter #2 (10 BBL)',
    brewDate: '2026-08-16',
    estimatedPackDate: '2026-09-02',
    originalGravity: 1.060,
    currentGravity: 1.015,
    targetFinalGravity: 1.014,
    currentTempF: 54.0,
    phLevel: 4.20,
    estimatedAbv: 5.9,
    dryHopSchedule: 'None (Conditioning)',
    grainBill: [
      { itemId: 'item_malt_2row', qty: 8, uom: 'sack_55lb' }
    ],
    hopBill: [
      { itemId: 'item_hops_citra', qty: 2.0, uom: 'lb' }
    ]
  },
  {
    id: 'batch_pale_06',
    batchNumber: 'B2026-06',
    beerName: 'Mosaic Crush Session Pale',
    style: 'American Pale Ale',
    targetVolumeBbl: 15.0,
    status: 'brite_tank',
    tankId: 'tank_bt_01',
    tankName: 'Brite Tank #1 (15 BBL)',
    brewDate: '2026-08-08',
    estimatedPackDate: '2026-08-31',
    originalGravity: 1.048,
    currentGravity: 1.010,
    targetFinalGravity: 1.010,
    currentTempF: 34.0,
    phLevel: 4.15,
    estimatedAbv: 5.0,
    packagedKegs: 0,
    packagedCans: 0,
    availableVolumeBbl: 14.8
  }
];

export const INITIAL_TAP_LINES = [
  {
    id: 'tap_01',
    lineNum: 1,
    beerName: 'Hazy Horizon Double NEIPA',
    style: 'New England Hazy DIPA',
    abvPercent: 7.35,
    srm: 5,
    kegType: 'keg_half_bbl',
    totalGal: 15.5,
    currentGal: 10.5,
    totalPintsCapacity: 124,
    pintsRemaining: 84,
    currentPsi: 12.5,
    currentTempF: 38.0,
    gasBlend: '100% CO2',
    pricePint: 8.50,
    priceFlight: 3.50,
    priceGrowler: 22.00,
    lastCleanedDate: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
    batchId: 'batch_ipa_08',
    status: 'active'
  },
  {
    id: 'tap_02',
    lineNum: 2,
    beerName: 'Midnight Velvet Oatmeal Stout',
    style: 'Oatmeal Stout (Nitro Draft)',
    abvPercent: 5.9,
    srm: 38,
    kegType: 'keg_sixtel',
    totalGal: 5.16,
    currentGal: 4.4,
    totalPintsCapacity: 41,
    pintsRemaining: 35,
    currentPsi: 32.0,
    currentTempF: 42.0,
    gasBlend: '75% N2 / 25% CO2 (Beer Gas)',
    pricePint: 8.00,
    priceFlight: 3.25,
    priceGrowler: 20.00,
    lastCleanedDate: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
    batchId: 'batch_stout_07',
    status: 'active'
  },
  {
    id: 'tap_03',
    lineNum: 3,
    beerName: 'Mosaic Crush Session Pale',
    style: 'American Pale Ale',
    abvPercent: 5.0,
    srm: 7,
    kegType: 'keg_half_bbl',
    totalGal: 15.5,
    currentGal: 4.2,
    totalPintsCapacity: 124,
    pintsRemaining: 33,
    currentPsi: 11.5,
    currentTempF: 37.5,
    gasBlend: '100% CO2',
    pricePint: 7.50,
    priceFlight: 3.00,
    priceGrowler: 19.00,
    lastCleanedDate: new Date(Date.now() - 11 * 86400000).toISOString().split('T')[0],
    batchId: 'batch_pale_06',
    status: 'active'
  },
  {
    id: 'tap_04',
    lineNum: 4,
    beerName: 'Copper Canyon Amber Ale',
    style: 'American Amber Ale',
    abvPercent: 5.6,
    srm: 14,
    kegType: 'keg_half_bbl',
    totalGal: 15.5,
    currentGal: 14.2,
    totalPintsCapacity: 124,
    pintsRemaining: 114,
    currentPsi: 12.0,
    currentTempF: 38.0,
    gasBlend: '100% CO2',
    pricePint: 7.50,
    priceFlight: 3.00,
    priceGrowler: 19.00,
    lastCleanedDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
    batchId: null,
    status: 'active'
  },
  {
    id: 'tap_05',
    lineNum: 5,
    beerName: 'Bohemian Crest Czech Pilsner',
    style: 'Traditional Saaz Pilsner',
    abvPercent: 4.8,
    srm: 3,
    kegType: 'keg_half_bbl',
    totalGal: 15.5,
    currentGal: 8.8,
    totalPintsCapacity: 124,
    pintsRemaining: 70,
    currentPsi: 13.0,
    currentTempF: 36.0,
    gasBlend: '100% CO2',
    pricePint: 7.00,
    priceFlight: 3.00,
    priceGrowler: 18.00,
    lastCleanedDate: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0],
    batchId: null,
    status: 'active'
  },
  {
    id: 'tap_06',
    lineNum: 6,
    beerName: 'Marionberry Kettle Sour',
    style: 'Fruited Berliner Weisse',
    abvPercent: 4.5,
    srm: 22,
    kegType: 'keg_sixtel',
    totalGal: 5.16,
    currentGal: 2.1,
    totalPintsCapacity: 41,
    pintsRemaining: 17,
    currentPsi: 11.0,
    currentTempF: 39.0,
    gasBlend: '100% CO2',
    pricePint: 8.50,
    priceFlight: 3.50,
    priceGrowler: 22.00,
    lastCleanedDate: new Date(Date.now() - 8 * 86400000).toISOString().split('T')[0],
    batchId: null,
    status: 'active'
  },
  {
    id: 'tap_07',
    lineNum: 7,
    beerName: 'Single-Origin Nitro Cold Brew',
    style: 'Non-Alcoholic Barista Draft',
    abvPercent: 0.0,
    srm: 40,
    kegType: 'keg_sixtel',
    totalGal: 5.16,
    currentGal: 3.9,
    totalPintsCapacity: 41,
    pintsRemaining: 31,
    currentPsi: 38.0,
    currentTempF: 36.0,
    gasBlend: '100% Pure N2',
    pricePint: 5.50,
    priceFlight: 2.50,
    priceGrowler: 15.00,
    lastCleanedDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
    batchId: null,
    status: 'active'
  },
  {
    id: 'tap_08',
    lineNum: 8,
    beerName: 'Orchard Gold Crisp Dry Cider',
    style: 'Heritage Apple Hard Cider',
    abvPercent: 6.2,
    srm: 6,
    kegType: 'keg_half_bbl',
    totalGal: 15.5,
    currentGal: 2.0,
    totalPintsCapacity: 124,
    pintsRemaining: 16,
    currentPsi: 12.0,
    currentTempF: 38.0,
    gasBlend: '100% CO2',
    pricePint: 7.50,
    priceFlight: 3.00,
    priceGrowler: 19.00,
    lastCleanedDate: new Date(Date.now() - 16 * 86400000).toISOString().split('T')[0],
    batchId: null,
    status: 'active'
  }
];

class CraftMatrixDB {
  constructor() {
    this.data = null;
    this.listeners = [];
    this.init();
  }

  init() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        this.data = JSON.parse(raw);
        let needsSave = false;

        if (!this.data.subRecipes || this.data.subRecipes.length === 0) {
          this.data.subRecipes = JSON.parse(JSON.stringify(INITIAL_SUB_RECIPES));
          needsSave = true;
        }
        if (!this.data.menuItems || this.data.menuItems.length === 0) {
          this.data.menuItems = JSON.parse(JSON.stringify(INITIAL_MENU_ITEMS));
          needsSave = true;
        }
        if (!this.data.tapLines || this.data.tapLines.length === 0) {
          this.data.tapLines = JSON.parse(JSON.stringify(INITIAL_TAP_LINES));
          needsSave = true;
        }
        if (!this.data.items || this.data.items.length === 0) {
          this.data.items = JSON.parse(JSON.stringify(INITIAL_ITEMS));
          needsSave = true;
        }
        if (!this.data.recipes || this.data.recipes.length === 0) {
          this.data.recipes = JSON.parse(JSON.stringify(INITIAL_RECIPES));
          needsSave = true;
        }
        if (!this.data.users || this.data.users.length === 0) {
          this.data.users = JSON.parse(JSON.stringify(INITIAL_USERS));
          needsSave = true;
        }

        if (needsSave) this.save();
      } catch (e) {
        console.error('Error loading stored DB, reinitializing seeds', e);
        this.resetToDefaults();
      }
    } else {
      this.resetToDefaults();
    }
  }

  resetToDefaults() {
    this.data = {
      users: JSON.parse(JSON.stringify(INITIAL_USERS)),
      items: JSON.parse(JSON.stringify(INITIAL_ITEMS)),
      subRecipes: JSON.parse(JSON.stringify(INITIAL_SUB_RECIPES)),
      recipes: JSON.parse(JSON.stringify(INITIAL_RECIPES)),
      menuItems: JSON.parse(JSON.stringify(INITIAL_MENU_ITEMS)),
      brewBatches: JSON.parse(JSON.stringify(INITIAL_BREW_BATCHES)),
      tapLines: JSON.parse(JSON.stringify(INITIAL_TAP_LINES)),
      locations: JSON.parse(JSON.stringify(LOCATIONS)),
      vendors: JSON.parse(JSON.stringify(VENDORS)),
      transactions: [],
      purchaseOrders: [],
      salesHistory: [],
      lastUpdated: new Date().toISOString()
    };
    this.save();
  }

  save() {
    this.data.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(fn => {
      try {
        fn(this.data);
      } catch (err) {
        console.error('Listener callback error:', err);
      }
    });
  }

  // ==========================================
  // 0. USERS & AUTHENTICATION STORE METHODS
  // ==========================================
  getUsers() {
    if (!this.data || !this.data.users) {
      if (!this.data) this.data = {};
      this.data.users = JSON.parse(JSON.stringify(INITIAL_USERS));
    }
    return this.data.users;
  }

  getUserById(id) {
    return this.getUsers().find(u => u.id === id);
  }

  getUserByUsernameOrEmail(identifier) {
    if (!identifier) return null;
    const clean = identifier.trim().toLowerCase();
    return this.getUsers().find(u => 
      (u.email && u.email.toLowerCase() === clean) || 
      (u.username && u.username.toLowerCase() === clean)
    );
  }

  getUserByPin(pin) {
    if (!pin) return null;
    return this.getUsers().find(u => u.pin === pin.toString().trim() && u.active);
  }

  saveUser(user) {
    if (!this.data.users) this.data.users = [];
    const idx = this.data.users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      this.data.users[idx] = { ...this.data.users[idx], ...user };
    } else {
      this.data.users.push(user);
    }
    this.save();
    return user;
  }

  deleteUser(userId) {
    if (!this.data.users) return false;
    // Disallow deleting the primary admin account
    if (userId === 'usr_admin') return false;
    this.data.users = this.data.users.filter(u => u.id !== userId);
    this.save();
    return true;
  }

  // ==========================================
  // 1. ITEM MASTER METHODS
  // ==========================================
  getItems(category = null) {
    if (!this.data || !this.data.items) return [];
    if (!category || category === 'all') return this.data.items;
    return this.data.items.filter(i => i.category === category);
  }

  getItemById(id) {
    if (!this.data || !this.data.items) return null;
    return this.data.items.find(i => i.id === id);
  }

  saveItem(item) {
    if (!this.data.items) this.data.items = [];
    const idx = this.data.items.findIndex(i => i.id === item.id);
    if (idx >= 0) {
      this.data.items[idx] = { ...this.data.items[idx], ...item };
    } else {
      this.data.items.unshift(item);
    }
    this.save();
    return item;
  }

  deleteItem(id) {
    if (!this.data.items) return false;
    this.data.items = this.data.items.filter(i => i.id !== id);
    this.save();
    return true;
  }

  // ==========================================
  // 2. SUB-RECIPE MASTER METHODS
  // ==========================================
  getSubRecipes(category = null) {
    if (!this.data || !this.data.subRecipes) return [];
    if (!category || category === 'all') return this.data.subRecipes;
    return this.data.subRecipes.filter(s => s.category === category);
  }

  getSubRecipeById(id) {
    if (!this.data || !this.data.subRecipes) return null;
    return this.data.subRecipes.find(s => s.id === id);
  }

  saveSubRecipe(subRecipe) {
    if (!this.data.subRecipes) this.data.subRecipes = [];
    const idx = this.data.subRecipes.findIndex(s => s.id === subRecipe.id);
    if (idx >= 0) {
      this.data.subRecipes[idx] = { ...this.data.subRecipes[idx], ...subRecipe };
    } else {
      this.data.subRecipes.unshift(subRecipe);
    }
    this.save();
    return subRecipe;
  }

  deleteSubRecipe(id) {
    if (!this.data.subRecipes) return false;
    this.data.subRecipes = this.data.subRecipes.filter(s => s.id !== id);
    this.save();
    return true;
  }

  /**
   * Production Action: Prep/Cook Sub-Recipe Batch
   * Depletes required raw ingredient inventory and logs a transaction.
   */
  prepSubRecipeBatch(subRecipeId, batchCount = 1) {
    const sub = this.getSubRecipeById(subRecipeId);
    if (!sub) return { success: false, message: 'Sub-Recipe not found' };

    const multiplier = parseFloat(batchCount) || 1;
    const depletions = [];

    // Check inventory availability
    for (const ing of (sub.ingredients || [])) {
      if (ing.itemId) {
        const item = this.getItemById(ing.itemId);
        if (!item) continue;
        const requiredQty = (ing.qty || 0) * multiplier;
        depletions.push({ item, requiredQty, uom: ing.uom });
      }
    }

    // Deduct stock
    depletions.forEach(({ item, requiredQty }) => {
      item.currentStock = Math.max(0, Math.round(((item.currentStock || 0) - requiredQty) * 100) / 100);
      this.saveItem(item);
    });

    const totalYield = (sub.yieldQty || 1) * multiplier;
    this.recordTransaction({
      type: 'SUB_RECIPE_PREP',
      notes: `Prepped ${multiplier}x batch (${totalYield} ${sub.yieldUom}) of "${sub.name}"`,
      subRecipeId: sub.id,
      batches: multiplier
    });

    return {
      success: true,
      subRecipe: sub,
      multiplier,
      totalYield,
      depletedCount: depletions.length
    };
  }

  // ==========================================
  // 3. RECIPE CARD MASTER METHODS
  // ==========================================
  getRecipes(category = null) {
    if (!this.data || !this.data.recipes) return [];
    if (!category || category === 'all') return this.data.recipes;
    return this.data.recipes.filter(r => r.category === category);
  }

  getRecipeById(id) {
    if (!this.data || !this.data.recipes) return null;
    return this.data.recipes.find(r => r.id === id);
  }

  saveRecipe(recipe) {
    if (!this.data.recipes) this.data.recipes = [];
    const idx = this.data.recipes.findIndex(r => r.id === recipe.id);
    if (idx >= 0) {
      this.data.recipes[idx] = { ...this.data.recipes[idx], ...recipe };
    } else {
      this.data.recipes.unshift(recipe);
    }
    this.save();
    return recipe;
  }

  deleteRecipe(id) {
    if (!this.data.recipes) return false;
    this.data.recipes = this.data.recipes.filter(r => r.id !== id);
    this.save();
    return true;
  }

  // ==========================================
  // 4. MENU MASTER METHODS
  // ==========================================
  getMenuItems(category = null) {
    if (!this.data || !this.data.menuItems) return [];
    if (!category || category === 'all') return this.data.menuItems;
    return this.data.menuItems.filter(m => m.category === category);
  }

  getMenuItemById(id) {
    if (!this.data || !this.data.menuItems) return null;
    return this.data.menuItems.find(m => m.id === id);
  }

  saveMenuItem(menuItem) {
    if (!this.data.menuItems) this.data.menuItems = [];
    const idx = this.data.menuItems.findIndex(m => m.id === menuItem.id);
    if (idx >= 0) {
      this.data.menuItems[idx] = { ...this.data.menuItems[idx], ...menuItem };
    } else {
      this.data.menuItems.push(menuItem);
    }
    this.save();
    return menuItem;
  }

  deleteMenuItem(id) {
    if (!this.data.menuItems) return false;
    this.data.menuItems = this.data.menuItems.filter(m => m.id !== id);
    this.save();
    return true;
  }

  // ==========================================
  // 5. BREWERY & TANKS METHODS
  // ==========================================
  getBrewBatches() {
    return this.data.brewBatches || [];
  }

  getBrewBatchById(id) {
    return (this.data.brewBatches || []).find(b => b.id === id);
  }

  addBrewBatch(batch) {
    if (!this.data.brewBatches) this.data.brewBatches = [];
    this.data.brewBatches.unshift(batch);
    this.save();
    return batch;
  }

  updateBrewBatch(batch) {
    if (!this.data.brewBatches) this.data.brewBatches = [];
    const idx = this.data.brewBatches.findIndex(b => b.id === batch.id);
    if (idx >= 0) {
      this.data.brewBatches[idx] = { ...this.data.brewBatches[idx], ...batch };
      this.save();
    }
    return batch;
  }

  // ==========================================
  // 6. TAPROOM & DRAFT LINES METHODS
  // ==========================================
  getTapLines() {
    return this.data.tapLines || [];
  }

  getTapLineById(id) {
    return (this.data.tapLines || []).find(t => t.id === id);
  }

  saveTapLine(line) {
    if (!this.data.tapLines) this.data.tapLines = [];
    const idx = this.data.tapLines.findIndex(t => t.id === line.id);
    if (idx >= 0) {
      this.data.tapLines[idx] = { ...this.data.tapLines[idx], ...line };
    } else {
      this.data.tapLines.push(line);
    }
    this.save();
  }

  pourFromTap(tapId, pourType = 'pint_16oz') {
    const line = this.getTapLineById(tapId);
    if (!line) return null;

    let pintsDeducted = 1.0;
    let galDeducted = 0.125;
    let price = line.pricePint || 7.50;
    let label = '16 oz Pint';

    if (pourType === 'flight_4oz') {
      pintsDeducted = 0.25;
      galDeducted = 0.03125;
      price = line.priceFlight || 3.00;
      label = '4 oz Tasting Flight';
    } else if (pourType === 'growler_64oz') {
      pintsDeducted = 4.0;
      galDeducted = 0.50;
      price = line.priceGrowler || 20.00;
      label = '64 oz Growler Refill';
    }

    if (line.pintsRemaining < pintsDeducted) {
      return { success: false, message: `Keg low! Only ${line.pintsRemaining.toFixed(1)} pints remaining in ${line.beerName}.` };
    }

    line.pintsRemaining = Math.max(0, Math.round((line.pintsRemaining - pintsDeducted) * 10) / 10);
    line.currentGal = Math.max(0, Math.round((line.currentGal - galDeducted) * 100) / 100);
    this.saveTapLine(line);

    this.recordTransaction({
      type: 'TAPROOM_DRAFT_POUR',
      notes: `Draft Pour: ${label} of ${line.beerName} (Tap #${line.lineNum})`,
      subtotal: price,
      tapId: line.id,
      pints: pintsDeducted
    });

    return {
      success: true,
      line,
      pintsDeducted,
      label,
      price
    };
  }

  cleanTapLine(tapId) {
    const line = this.getTapLineById(tapId);
    if (!line) return null;

    line.lastCleanedDate = new Date().toISOString().split('T')[0];
    this.saveTapLine(line);

    this.recordTransaction({
      type: 'LINE_CLEANING_COMPLIANCE',
      notes: `Caustic flush & sanitize draft line #${line.lineNum} (${line.beerName})`,
      tapId: line.id
    });

    return line;
  }

  tapKegOnLine(tapId, kegConfig) {
    const line = this.getTapLineById(tapId);
    if (!line) return null;

    const totalGal = kegConfig.kegType === 'keg_sixtel' ? 5.16 : 15.5;
    const totalPints = kegConfig.kegType === 'keg_sixtel' ? 41 : 124;

    const updated = {
      ...line,
      beerName: kegConfig.beerName || 'Fresh Craft Ale',
      style: kegConfig.style || 'American Ale',
      abvPercent: parseFloat(kegConfig.abvPercent) || 5.5,
      srm: parseInt(kegConfig.srm) || 8,
      kegType: kegConfig.kegType || 'keg_half_bbl',
      totalGal: totalGal,
      currentGal: totalGal,
      totalPintsCapacity: totalPints,
      pintsRemaining: totalPints,
      currentPsi: parseFloat(kegConfig.currentPsi) || 12.0,
      pricePint: parseFloat(kegConfig.pricePint) || 7.50,
      priceFlight: parseFloat(kegConfig.priceFlight) || 3.00,
      priceGrowler: parseFloat(kegConfig.priceGrowler) || 19.00,
      batchId: kegConfig.batchId || null,
      lastCleanedDate: new Date().toISOString().split('T')[0]
    };

    this.saveTapLine(updated);

    this.recordTransaction({
      type: 'KEG_TAPPED',
      notes: `Tapped fresh ${kegConfig.kegType === 'keg_sixtel' ? '1/6 BBL' : '1/2 BBL'} keg of ${updated.beerName} on Tap #${line.lineNum}`,
      tapId: line.id
    });

    return updated;
  }

  // ==========================================
  // 7. TRANSACTIONS & AUDIT LEDGER
  // ==========================================
  getTransactions() {
    return this.data.transactions || [];
  }

  recordTransaction(tx) {
    if (!this.data.transactions) this.data.transactions = [];
    const entry = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      ...tx
    };
    this.data.transactions.unshift(entry);
    if (this.data.transactions.length > 500) {
      this.data.transactions = this.data.transactions.slice(0, 500);
    }
    this.save();
    return entry;
  }

  getPurchaseOrders() {
    return this.data.purchaseOrders || [];
  }

  savePurchaseOrder(po) {
    if (!this.data.purchaseOrders) this.data.purchaseOrders = [];
    const idx = this.data.purchaseOrders.findIndex(p => p.id === po.id);
    if (idx >= 0) {
      this.data.purchaseOrders[idx] = { ...this.data.purchaseOrders[idx], ...po };
    } else {
      this.data.purchaseOrders.unshift(po);
    }
    this.save();
    return po;
  }

  // ==========================================
  // 8. PREDICTIVE RUN-RATE & TTB REPORT
  // ==========================================
  calculateRunRates() {
    const items = this.getItems();
    const transactions = this.getTransactions();

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const recentTx = transactions.filter(t => t.timestamp >= sevenDaysAgo && (t.type.includes('SALE') || t.type.includes('POUR') || t.type.includes('DEPLETION')));

    return items.map(item => {
      let dailyBurnRate = (item.parLevel || 10) * 0.12;
      if (item.category === CATEGORIES.LIQUOR) dailyBurnRate = 0.85;
      if (item.category === CATEGORIES.FOOD) dailyBurnRate = 3.5;
      if (item.category === CATEGORIES.BREWERY) dailyBurnRate = 1.2;

      const currentStock = item.currentStock || 0;
      const daysRemaining = dailyBurnRate > 0 ? currentStock / dailyBurnRate : 999;
      const stockoutRisk = daysRemaining <= 3 ? 'CRITICAL' : daysRemaining <= 7 ? 'WARNING' : 'HEALTHY';
      const recommendedOrderQty = Math.max(0, Math.ceil((item.parLevel * 1.5) - currentStock));

      return {
        item,
        dailyBurnRate: Math.round(dailyBurnRate * 10) / 10,
        daysRemaining: Math.round(daysRemaining * 10) / 10,
        stockoutRisk,
        recommendedOrderQty
      };
    });
  }

  generateTTBReport() {
    const batches = this.getBrewBatches();
    const transactions = this.getTransactions();

    const totalProducedBbl = batches.reduce((sum, b) => sum + (b.targetVolumeBbl || 0), 0);
    const totalPackagedBbl = batches.filter(b => b.status === 'packaged' || b.status === 'brite_tank').reduce((sum, b) => sum + (b.availableVolumeBbl || b.targetVolumeBbl || 0), 0);
    const tapPours = transactions.filter(t => t.type === 'TAPROOM_DRAFT_POUR');
    const tapPintsTotal = tapPours.reduce((sum, t) => sum + (t.pints || 1), 0);
    const taproomRemovedBbl = Math.round((tapPintsTotal / 248) * 100) / 100;

    const cellarLossBbl = Math.round(totalProducedBbl * 0.042 * 100) / 100;
    const taxRatePerBbl = 3.50;
    const taxableVolumeBbl = Math.max(12.5, taproomRemovedBbl + totalPackagedBbl * 0.4);
    const estimatedTaxDue = taxableVolumeBbl * taxRatePerBbl;

    return {
      reportingPeriod: 'August 2026 (Monthly BROP)',
      ein: 'XX-XXXX8841',
      brewerNoticeNo: 'BR-NY-2026-042',
      totalProducedBbl,
      totalPackagedBbl,
      taproomRemovedBbl: Math.max(4.2, taproomRemovedBbl),
      cellarLossBbl,
      taxableVolumeBbl: Math.round(taxableVolumeBbl * 100) / 100,
      taxRatePerBbl,
      estimatedTaxDue: Math.round(estimatedTaxDue * 100) / 100,
      lines: [
        { lineNo: 'Part I, Line 1', desc: 'Bulk beer on hand beginning of period', bbl: 24.5 },
        { lineNo: 'Part I, Line 2', desc: 'Beer produced by fermentation during period', bbl: totalProducedBbl },
        { lineNo: 'Part I, Line 3', desc: 'Total bulk beer produced and received', bbl: 24.5 + totalProducedBbl },
        { lineNo: 'Part I, Line 11', desc: 'Beer removed tax-determined for tavern/taproom consumption', bbl: Math.max(4.2, taproomRemovedBbl) },
        { lineNo: 'Part I, Line 12', desc: 'Beer packaged into barrels, kegs and cans', bbl: totalPackagedBbl },
        { lineNo: 'Part I, Line 15', desc: 'Loss from cellar operations, filtration & yeast racking', bbl: cellarLossBbl },
        { lineNo: 'Part II, Line 33', desc: 'Federal Excise Tax Liability ($3.50/BBL Small Brewer)', bbl: Math.round(taxableVolumeBbl * 100) / 100, taxDue: estimatedTaxDue }
      ]
    };
  }
}

export const db = new CraftMatrixDB();
