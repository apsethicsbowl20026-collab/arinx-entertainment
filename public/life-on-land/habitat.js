// Habitat health checker: a transparent, rule-based scoring model.
// It is deliberately NOT machine learning. Every weight below is visible so that
// users, teachers and researchers can read it, challenge it and adjust it.

export const FACTORS = {
  cover: {label: 'Forest cover', max: 35},
  trend: {label: 'Recent forest trend', max: 20},
  protection: {label: 'Protection status', max: 15},
  invasives: {label: 'Invasive species', max: 15},
  landUse: {label: 'Surrounding land use', max: 15},
};

export const PROTECTION = {none: 0, partial: 8, strict: 15};
export const INVASIVES = {none: 15, some: 7, widespread: 0};
export const LAND_USE = {natural: 15, mixed: 9, intensive: 4, urban: 0};

export const BANDS = [
  {min: 75, label: 'Healthy', tone: 'good'},
  {min: 50, label: 'Watch', tone: 'fair'},
  {min: 25, label: 'At risk', tone: 'warn'},
  {min: 0, label: 'Critical', tone: 'bad'},
];

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

export function scoreHabitat({cover, trend, protection, invasives, landUse}) {
  const coverNum = Number(cover);
  const trendNum = Number(trend);
  if (!Number.isFinite(coverNum) || coverNum < 0 || coverNum > 100) throw new RangeError('Forest cover must be between 0 and 100 percent.');
  if (!Number.isFinite(trendNum) || trendNum < -50 || trendNum > 20) throw new RangeError('Forest trend must be between -50 and +20 percent.');
  if (!Object.hasOwn(PROTECTION, protection)) throw new RangeError('Unknown protection status.');
  if (!Object.hasOwn(INVASIVES, invasives)) throw new RangeError('Unknown invasive species level.');
  if (!Object.hasOwn(LAND_USE, landUse)) throw new RangeError('Unknown land use.');

  const parts = {
    cover: Math.round(coverNum * 0.35),
    // -10% or worse scores 0; no change scores 20; gains are capped at 20.
    trend: Math.round(clamp(20 + 2 * trendNum, 0, 20)),
    protection: PROTECTION[protection],
    invasives: INVASIVES[invasives],
    landUse: LAND_USE[landUse],
  };
  const total = Object.values(parts).reduce((sum, value) => sum + value, 0);
  const band = BANDS.find(b => total >= b.min);

  const actions = [];
  if (coverNum < 30) actions.push('Prioritise restoration with native trees to rebuild canopy cover.');
  if (trendNum < 0) actions.push('Subscribe to satellite deforestation alerts (for example Global Forest Watch) and investigate the drivers of loss.');
  if (protection === 'none') actions.push('Explore formal protection or a community conservation agreement for the remaining habitat.');
  if (invasives !== 'none') actions.push('Map invasive species early and plan removal with the local forest or wildlife authority.');
  if (landUse === 'intensive' || landUse === 'urban') actions.push('Create buffer strips and wildlife corridors of native vegetation around the habitat.');
  if (actions.length === 0) actions.push('Keep monitoring each season and re-check the score after any major change.');

  return {total, band, parts, actions: actions.slice(0, 4)};
}
