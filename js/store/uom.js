/**
 * UOM (Unit of Measure) Conversion Engine
 * Supports cross-unit conversions for Hospitality, Kitchen Prep, Bar Pours & Brewery Batches.
 */

export const UOM_TYPES = {
  VOLUME: 'volume',
  WEIGHT: 'weight',
  COUNT: 'count'
};

export const UOM_DEFINITIONS = {
  // Volume (Base: fluid ounces 'fl_oz' or 'ml')
  ml: { label: 'Milliliters (ml)', type: UOM_TYPES.VOLUME, toBaseMl: 1 },
  cl: { label: 'Centiliters (cl)', type: UOM_TYPES.VOLUME, toBaseMl: 10 },
  fl_oz: { label: 'Fluid Ounces (fl oz)', type: UOM_TYPES.VOLUME, toBaseMl: 29.5735 },
  shot_1_5: { label: '1.5 oz Shot / Pour', type: UOM_TYPES.VOLUME, toBaseMl: 44.3603 },
  shot_2: { label: '2.0 oz Pour', type: UOM_TYPES.VOLUME, toBaseMl: 59.147 },
  dash: { label: 'Dash (~1 ml)', type: UOM_TYPES.VOLUME, toBaseMl: 0.92 },
  tsp: { label: 'Teaspoon (tsp)', type: UOM_TYPES.VOLUME, toBaseMl: 4.92892 },
  tbsp: { label: 'Tablespoon (tbsp)', type: UOM_TYPES.VOLUME, toBaseMl: 14.7868 },
  cup: { label: 'Cup (8 fl oz)', type: UOM_TYPES.VOLUME, toBaseMl: 236.588 },
  pint: { label: 'Pint (16 fl oz)', type: UOM_TYPES.VOLUME, toBaseMl: 473.176 },
  liter: { label: 'Liter (L / 1000ml)', type: UOM_TYPES.VOLUME, toBaseMl: 1000 },
  bottle_750ml: { label: '750ml Wine/Liquor Bottle', type: UOM_TYPES.VOLUME, toBaseMl: 750 },
  bottle_1L: { label: '1 Liter Liquor Bottle', type: UOM_TYPES.VOLUME, toBaseMl: 1000 },
  can_12oz: { label: '12 oz Can', type: UOM_TYPES.VOLUME, toBaseMl: 354.882 },
  can_16oz: { label: '16 oz Pint Can', type: UOM_TYPES.VOLUME, toBaseMl: 473.176 },
  gal: { label: 'Gallon (128 fl oz)', type: UOM_TYPES.VOLUME, toBaseMl: 3785.41 },
  keg_sixtel: { label: '1/6 BBL Keg (5.16 Gal)', type: UOM_TYPES.VOLUME, toBaseMl: 19532.7 },
  keg_half_bbl: { label: '1/2 BBL Keg (15.5 Gal)', type: UOM_TYPES.VOLUME, toBaseMl: 58673.9 },
  bbl: { label: 'Brewery Barrel (31 Gal / BBL)', type: UOM_TYPES.VOLUME, toBaseMl: 117347.8 },

  // Weight (Base: grams 'g')
  mg: { label: 'Milligram (mg)', type: UOM_TYPES.WEIGHT, toBaseGrams: 0.001 },
  g: { label: 'Gram (g)', type: UOM_TYPES.WEIGHT, toBaseGrams: 1 },
  oz: { label: 'Ounce (wt oz)', type: UOM_TYPES.WEIGHT, toBaseGrams: 28.3495 },
  lb: { label: 'Pound (lb)', type: UOM_TYPES.WEIGHT, toBaseGrams: 453.592 },
  kg: { label: 'Kilogram (kg)', type: UOM_TYPES.WEIGHT, toBaseGrams: 1000 },
  sack_55lb: { label: '55 lb Malt Grain Sack', type: UOM_TYPES.WEIGHT, toBaseGrams: 24947.6 },

  // Count / Packaging Units
  each: { label: 'Each / Single Unit', type: UOM_TYPES.COUNT, toBaseCount: 1 },
  portion: { label: 'Portion / Serving', type: UOM_TYPES.COUNT, toBaseCount: 1 },
  pack_4: { label: '4-Pack Can Caddy', type: UOM_TYPES.COUNT, toBaseCount: 4 },
  pack_6: { label: '6-Pack Carrier', type: UOM_TYPES.COUNT, toBaseCount: 6 },
  case_12: { label: 'Case of 12', type: UOM_TYPES.COUNT, toBaseCount: 12 },
  case_24: { label: 'Case of 24', type: UOM_TYPES.COUNT, toBaseCount: 24 },
  carton_10pack: { label: 'Tobacco Carton (10 Packs)', type: UOM_TYPES.COUNT, toBaseCount: 10 },
  pack_20sticks: { label: 'Cigarette Pack (20 Sticks)', type: UOM_TYPES.COUNT, toBaseCount: 1 }
};

/**
 * Convert quantity from one UOM to another UOM
 * Returns null if incompatible types.
 */
export function convertUom(qty, fromUom, toUom) {
  const quantity = parseFloat(qty);
  if (isNaN(quantity) || quantity === 0) return 0;
  if (fromUom === toUom) return quantity;

  const defFrom = UOM_DEFINITIONS[fromUom];
  const defTo = UOM_DEFINITIONS[toUom];

  if (!defFrom || !defTo) return quantity; // Fallback

  // Volume to Volume
  if (defFrom.type === UOM_TYPES.VOLUME && defTo.type === UOM_TYPES.VOLUME) {
    const inMl = quantity * defFrom.toBaseMl;
    return inMl / defTo.toBaseMl;
  }

  // Weight to Weight
  if (defFrom.type === UOM_TYPES.WEIGHT && defTo.type === UOM_TYPES.WEIGHT) {
    const inGrams = quantity * defFrom.toBaseGrams;
    return inGrams / defTo.toBaseGrams;
  }

  // Count to Count
  if (defFrom.type === UOM_TYPES.COUNT && defTo.type === UOM_TYPES.COUNT) {
    const inCount = quantity * defFrom.toBaseCount;
    return inCount / defTo.toBaseCount;
  }

  // If cross-type without custom density, default 1:1 fallback
  return quantity;
}

/**
 * Calculate cost of ingredient in recipe unit based on purchase package cost
 */
export function calculateIngredientCost(packCost, packUom, recipeQty, recipeUom, yieldPercent = 100) {
  const parsedPackCost = parseFloat(packCost) || 0;
  const parsedRecipeQty = parseFloat(recipeQty) || 0;
  const yieldFactor = (parseFloat(yieldPercent) || 100) / 100;
  
  if (parsedPackCost <= 0 || parsedRecipeQty <= 0) return 0;

  // Convert 1 package unit into recipe UOM
  const recipeUnitsInPack = convertUom(1, packUom, recipeUom);
  if (recipeUnitsInPack <= 0) return 0;

  const costPerRecipeUnit = (parsedPackCost / recipeUnitsInPack) / (yieldFactor > 0 ? yieldFactor : 1);
  return costPerRecipeUnit * parsedRecipeQty;
}
