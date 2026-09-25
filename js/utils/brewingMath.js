/**
 * CraftMatrix Pro Advanced Brewing Mathematics & Science Engine
 * Industry-standard brewing equations for recipe development and cellar operations.
 */

/**
 * Calculate IBU using Glenn Tinseth's formula
 * @param {number} hopWeightOz - Weight of hop addition in ounces
 * @param {number} alphaAcid - Hop Alpha Acid percentage (e.g. 12.5 for 12.5%)
 * @param {number} boilMinutes - Boil duration in minutes
 * @param {number} boilGravity - Specific gravity of wort during boil (e.g. 1.050)
 * @param {number} batchVolumeGal - Final batch volume in gallons
 * @returns {number} IBU contribution
 */
export function calculateTinsethIbu(hopWeightOz, alphaAcid, boilMinutes, boilGravity, batchVolumeGal) {
  const oz = parseFloat(hopWeightOz) || 0;
  const aa = parseFloat(alphaAcid) || 0;
  const mins = parseFloat(boilMinutes) || 0;
  const gravity = parseFloat(boilGravity) || 1.050;
  const gal = parseFloat(batchVolumeGal) || 31; // default 1 BBL (31 Gal)

  if (oz <= 0 || aa <= 0 || mins <= 0 || gal <= 0) return 0;

  // Tinseth Bigness Factor & Boil Time Factor
  const bignessFactor = 1.65 * Math.pow(0.000125, (gravity - 1.0));
  const boilTimeFactor = (1 - Math.exp(-0.04 * mins)) / 4.15;
  const utilization = bignessFactor * boilTimeFactor;

  // IBU = (Oz * AA% * Utilization * 74.89) / VolGal
  const ibu = (oz * (aa / 100) * utilization * 7489) / gal;
  return Math.max(0, Math.round(ibu * 10) / 10);
}

/**
 * Convert SRM color value to realistic RGB Hex Code
 * @param {number} srm - Standard Reference Method color number (1-40+)
 * @returns {string} Hex color string (e.g. #f3d449)
 */
export function srmToHex(srm) {
  const val = Math.max(1, Math.min(45, parseFloat(srm) || 1));
  
  // High-fidelity SRM color lookup spectrum
  const srmTable = [
    { srm: 1, hex: '#f8f753', name: 'Very Light Straw' },
    { srm: 2, hex: '#f6f513', name: 'Straw' },
    { srm: 3, hex: '#ece61a', name: 'Pale Gold' },
    { srm: 4, hex: '#e5b729', name: 'Deep Gold' },
    { srm: 5, hex: '#dcb028', name: 'Pale Amber' },
    { srm: 6, hex: '#d08f1a', name: 'Medium Amber' },
    { srm: 8, hex: '#c36814', name: 'Deep Amber' },
    { srm: 10, hex: '#b74c0f', name: 'Copper' },
    { srm: 13, hex: '#a63309', name: 'Deep Copper' },
    { srm: 17, hex: '#872506', name: 'Brown' },
    { srm: 20, hex: '#711c03', name: 'Dark Brown' },
    { srm: 24, hex: '#591603', name: 'Ruby Dark' },
    { srm: 29, hex: '#411003', name: 'Very Dark / Porter' },
    { srm: 35, hex: '#260902', name: 'Imperial Stout Black' },
    { srm: 40, hex: '#0b0502', name: 'Opaque Midnight Black' }
  ];

  for (let i = 0; i < srmTable.length - 1; i++) {
    if (val >= srmTable[i].srm && val <= srmTable[i + 1].srm) {
      return srmTable[i].hex;
    }
  }

  return val >= 40 ? '#080402' : '#f8f753';
}

/**
 * Get descriptive beer color name from SRM
 */
export function getSrmColorName(srm) {
  const val = parseFloat(srm) || 1;
  if (val < 3) return 'Very Light Straw / Pilsner';
  if (val < 6) return 'Golden Blonde / Helles';
  if (val < 9) return 'Amber / Pale Ale';
  if (val < 14) return 'Copper / Red Ale / Märzen';
  if (val < 20) return 'Brown / Dunkel / Bock';
  if (val < 30) return 'Dark Brown / Robust Porter';
  return 'Opaque Black / Imperial Stout';
}

/**
 * Convert Specific Gravity to Degrees Plato
 */
export function sgToPlato(sg) {
  const val = parseFloat(sg) || 1.000;
  if (val <= 1.000) return 0;
  // Polynomial approximation
  const plato = (-1 * 616.868) + (1111.14 * val) - (630.272 * Math.pow(val, 2)) + (135.997 * Math.pow(val, 3));
  return Math.max(0, Math.round(plato * 10) / 10);
}

/**
 * Convert Degrees Plato to Specific Gravity
 */
export function platoToSg(plato) {
  const p = parseFloat(plato) || 0;
  if (p <= 0) return 1.000;
  const sg = 1 + (p / (258.6 - ((p / 258.2) * 227.1)));
  return Math.round(sg * 1000) / 1000;
}

/**
 * Calculate ABV and Apparent Attenuation
 */
export function calculateAbv(og, fg) {
  const original = parseFloat(og) || 1.050;
  const final = parseFloat(fg) || 1.010;

  if (original <= final) {
    return { abv: 0, attenuation: 0, calories12oz: 0 };
  }

  // Standard formula
  const abv = (original - final) * 131.25;
  // Apparent Attenuation %
  const attenuation = ((original - final) / (original - 1.000)) * 100;

  // Approximate calories in 12oz (355ml) serving
  const abw = abv * 0.79336;
  const realExtract = (0.1808 * sgToPlato(original)) + (0.8192 * sgToPlato(final));
  const calories = ((6.9 * abw) + (4.0 * (realExtract - 0.1))) * final * 3.55;

  return {
    abv: Math.round(abv * 100) / 100,
    attenuation: Math.round(attenuation * 10) / 10,
    calories12oz: Math.max(50, Math.round(calories))
  };
}

/**
 * Calculate Draft Carbonation Equilibrium Pressure (PSI)
 * Based on temperature (°F) and target Volumes of CO2
 */
export function calculateKegPsi(tempF, targetVolCo2) {
  const t = parseFloat(tempF) || 38;
  const v = parseFloat(targetVolCo2) || 2.5;

  // ASBC equation for CO2 solubility in beer
  const psi = -16.6999 + (0.010105 * t) + (0.00116512 * Math.pow(t, 2)) + 
              (0.173354 * t * v) + (4.24267 * v) - (0.0684226 * Math.pow(v, 2));

  return Math.max(0, Math.round(psi * 10) / 10);
}
