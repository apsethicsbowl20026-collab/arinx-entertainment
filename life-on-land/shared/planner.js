// Canopy Action Planner: a transparent, weighted recommender.
// It scores personal actions against a profile (location, home, interests, time) and explains each pick.
// Targets refer to SDG 15 sub-targets (15.1–15.9).

export const LOCATIONS = [
  { id: 'urban', label: 'City or dense urban area' },
  { id: 'suburban', label: 'Suburb or town' },
  { id: 'rural', label: 'Village or farmland' },
  { id: 'forest-edge', label: 'Near forest, hills or a protected area' },
];

export const HOMES = [
  { id: 'apartment', label: 'Apartment (balcony or terrace)' },
  { id: 'house', label: 'House with a garden or yard' },
  { id: 'none', label: 'No outdoor space' },
];

export const INTERESTS = [
  { id: 'gardening', label: 'Gardening and plants' },
  { id: 'wildlife', label: 'Wildlife and birds' },
  { id: 'water', label: 'Rivers, lakes and wetlands' },
  { id: 'food', label: 'Food and farming' },
  { id: 'consumption', label: 'Shopping and everyday choices' },
  { id: 'community', label: 'Community and volunteering' },
  { id: 'learning', label: 'Learning and technology' },
];

export const TIME = [
  { id: 'quick', label: 'A few minutes a week', maxEffort: 1 },
  { id: 'moderate', label: 'A few hours a month', maxEffort: 2 },
  { id: 'project', label: 'Weekend projects', maxEffort: 3 },
];

// settings/homes: 'any' means no restriction. A restriction excludes actions that do not fit.
// effort: 1 = minutes, 2 = a few hours, 3 = a weekend or longer.
export const ACTIONS = [
  {
    id: 'balcony-native-plants',
    title: 'Grow native plants on a balcony or windowsill',
    description: 'Start a small pot garden with native flowering plants and herbs. Pots attract pollinators and birds and need little space.',
    targets: ['15.5'], interests: ['gardening', 'wildlife'], settings: ['any'], homes: ['apartment', 'house'], effort: 1,
    firstStep: 'List three native plants for your region and buy seeds or seedlings from a local nursery.',
  },
  {
    id: 'backyard-native-tree',
    title: 'Plant a native tree in your garden or compound',
    description: 'A native tree gives shade, food and shelter for wildlife and stores carbon as it grows.',
    targets: ['15.2', '15.1'], interests: ['gardening', 'wildlife'], settings: ['any'], homes: ['house'], effort: 2,
    firstStep: 'Choose a native species that suits your soil and rainfall, then plant it in the monsoon with a protective guard.',
  },
  {
    id: 'community-planting',
    title: 'Join or organise a tree planting and care drive',
    description: 'Collective planting works best when the trees are watered and protected for their first few years.',
    targets: ['15.2', '15.3'], interests: ['community', 'gardening'], settings: ['any'], homes: ['any'], effort: 2,
    firstStep: 'Contact your residents’ association, municipal garden department or a local conservation group.',
  },
  {
    id: 'restore-degraded-land',
    title: 'Help restore a degraded patch of land',
    description: 'Volunteer to clear waste, stabilise eroded soil and plant native species on degraded land.',
    targets: ['15.3', '15.1'], interests: ['community', 'water', 'gardening'], settings: ['rural', 'forest-edge', 'suburban'], homes: ['any'], effort: 3,
    firstStep: 'Search for a local restoration project or forest department volunteer programme in your area.',
  },
  {
    id: 'remove-invasive-weeds',
    title: 'Remove invasive plants safely from local land',
    description: 'Invasive plants such as Lantana or Parthenium crowd out native species. Removing them carefully helps native plants recover.',
    targets: ['15.8'], interests: ['gardening', 'community', 'wildlife'], settings: ['rural', 'forest-edge', 'suburban'], homes: ['any'], effort: 2,
    firstStep: 'Learn to identify two invasive species in your area. Wear gloves and a mask, and bag seeds rather than composting them.',
  },
  {
    id: 'wetland-cleanup',
    title: 'Clean up and protect a pond, lake or river bank',
    description: 'Wetlands filter water and host many species. Organised clean-ups keep waste out of them.',
    targets: ['15.1'], interests: ['water', 'community'], settings: ['any'], homes: ['any'], effort: 1,
    firstStep: 'Organise a one-hour clean-up with neighbours at the nearest pond, lake or river bank.',
  },
  {
    id: 'certified-wood-paper',
    title: 'Buy certified wood and paper (FSC or PEFC)',
    description: 'Certification labels show that timber and paper came from responsibly managed forests.',
    targets: ['15.2'], interests: ['consumption'], settings: ['any'], homes: ['any'], effort: 1,
    firstStep: 'Check the label on your next paper, furniture or packaging purchase.',
  },
  {
    id: 'deforestation-free-food',
    title: 'Choose deforestation-free food and products',
    description: 'Commodities such as palm oil, soy, cocoa and beef are major drivers of forest loss. Certified or local choices reduce that pressure.',
    targets: ['15.2', '15.5'], interests: ['consumption', 'food'], settings: ['any'], homes: ['any'], effort: 1,
    firstStep: 'Pick one product this week and check for RSPO-certified palm oil or a clear deforestation-free policy.',
  },
  {
    id: 'plant-based-meals',
    title: 'Eat more plant-based, local and seasonal food',
    description: 'Shifting some meals to plant-based foods eases pressure on farmland and forests.',
    targets: ['15.3'], interests: ['food'], settings: ['any'], homes: ['any'], effort: 1,
    firstStep: 'Plan one plant-based, locally grown meal each week.',
  },
  {
    id: 'compost-soil',
    title: 'Compost kitchen waste to build healthy soil',
    description: 'Compost returns nutrients to the soil and reduces the methane produced in landfills.',
    targets: ['15.3'], interests: ['food', 'gardening'], settings: ['any'], homes: ['any'], effort: 1,
    firstStep: 'Start a small compost bin, a pot or a community compost bin for vegetable scraps and dry leaves.',
  },
  {
    id: 'organic-garden',
    title: 'Garden without harmful pesticides',
    description: 'Avoiding synthetic pesticides protects soil organisms, pollinators and birds.',
    targets: ['15.5', '15.1'], interests: ['gardening', 'wildlife'], settings: ['any'], homes: ['house', 'apartment'], effort: 1,
    firstStep: 'Replace one chemical spray with a natural alternative, such as hand-picking pests or neem-based treatment.',
  },
  {
    id: 'wildlife-friendly-habits',
    title: 'Practise wildlife-friendly habits at home',
    description: 'Do not feed wild animals, secure bins, dim outdoor lights at night and keep pets from chasing wildlife.',
    targets: ['15.5', '15.7'], interests: ['wildlife'], settings: ['any'], homes: ['any'], effort: 1,
    firstStep: 'Check your bins and outdoor lights this evening and secure anything that attracts animals.',
  },
  {
    id: 'report-wildlife-crime',
    title: 'Report illegal logging or wildlife crime',
    description: 'Citizen reports help forest departments act faster against poaching and illegal timber trade.',
    targets: ['15.7'], interests: ['community', 'wildlife'], settings: ['any'], homes: ['any'], effort: 1,
    firstStep: 'Save your local forest department contact details and note what information to record: place, time and what you saw.',
  },
  {
    id: 'citizen-science-logging',
    title: 'Record local species with a citizen-science app',
    description: 'Apps such as iNaturalist turn your photos into records that scientists can use to track species.',
    targets: ['15.5', '15.9'], interests: ['learning', 'wildlife'], settings: ['any'], homes: ['any'], effort: 1,
    firstStep: 'Install iNaturalist and upload your first three sightings from around your home.',
  },
  {
    id: 'ai-species-id',
    title: 'Use AI-assisted identification to learn local biodiversity',
    description: 'AI image recognition can suggest what a plant, bird or insect is. Confirm suggestions with a field guide or expert before you trust them.',
    targets: ['15.5', '15.9'], interests: ['learning', 'wildlife', 'gardening'], settings: ['any'], homes: ['any'], effort: 1,
    firstStep: 'Photograph one plant or bird this week, get an AI suggestion, and check it against a field guide.',
  },
  {
    id: 'biodiversity-in-planning',
    title: 'Ask for green cover in local development plans',
    description: 'Ecosystem values should be part of planning. Public consultations are a chance to ask for trees, green corridors and wetland protection.',
    targets: ['15.9'], interests: ['community', 'learning'], settings: ['urban', 'suburban'], homes: ['any'], effort: 2,
    firstStep: 'Find out when your city or town holds public consultations on development plans and read the draft.',
  },
  {
    id: 'forest-rights-learning',
    title: 'Learn about forest rights and community livelihoods',
    description: 'Forest-dependent communities are key partners in conservation. Understanding their rights helps build fair solutions.',
    targets: ['15.6', '15.9'], interests: ['learning', 'community'], settings: ['rural', 'forest-edge'], homes: ['any'], effort: 1,
    firstStep: 'Read about the Forest Rights Act, 2006, and how it applies in your district.',
  },
  {
    id: 'personal-footprint',
    title: 'Track your land footprint and set one goal',
    description: 'Noticing how your purchases and habits affect land helps you choose the next change.',
    targets: ['15.9'], interests: ['consumption', 'learning'], settings: ['any'], homes: ['any'], effort: 1,
    firstStep: 'Write down the paper, wood and food products you buy in a typical week and pick one to change.',
  },
];

function effortLimit(timeId) {
  return (TIME.find(t => t.id === timeId) || TIME[1]).maxEffort;
}

export function normalizeProfile(input = {}) {
  const pick = (list, value, fallback) => (list.some(o => o.id === value) ? value : fallback);
  const interests = Array.isArray(input.interests)
    ? input.interests.filter(i => INTERESTS.some(o => o.id === i))
    : [];
  return {
    location: pick(LOCATIONS, input.location, 'suburban'),
    home: pick(HOMES, input.home, 'none'),
    time: pick(TIME, input.time, 'moderate'),
    interests: [...new Set(interests)],
  };
}

// Returns a score and the reasons behind it. Excluded actions get score -Infinity.
export function scoreAction(action, profile) {
  const p = normalizeProfile(profile);
  const reasons = [];
  if (!action.settings.includes('any') && !action.settings.includes(p.location)) return { score: -Infinity, reasons };
  if (!action.homes.includes('any') && !action.homes.includes(p.home)) return { score: -Infinity, reasons };
  if (action.effort > effortLimit(p.time)) return { score: -Infinity, reasons };

  let score = 1; // base score so that every fitting action is still rankable
  const matched = action.interests.filter(i => p.interests.includes(i));
  if (matched.length) {
    score += 3 * matched.length;
    const labels = matched.map(id => INTERESTS.find(i => i.id === id).label.toLowerCase());
    reasons.push(`Matches your interest in ${labels.join(' and ')}`);
  }
  if (!action.settings.includes('any')) {
    score += 2;
    reasons.push(`Suited to ${LOCATIONS.find(l => l.id === p.location).label.toLowerCase()}`);
  }
  if (!action.homes.includes('any')) {
    score += 2;
    reasons.push('Fits your home');
  }
  // Prefer actions that match the time available, without excluding quicker ones.
  score += (effortLimit(p.time) - action.effort) * 0.5 + (action.effort === effortLimit(p.time) ? 0.5 : 0);
  reasons.push(action.effort === 1 ? 'Takes only minutes' : action.effort === 2 ? 'Takes a few hours' : 'A weekend-sized project');
  return { score, reasons };
}

// Ranks actions for a profile. Returns up to `limit` items, best first, with an explanation for each.
export function buildPlan(profile, { limit = 5 } = {}) {
  const p = normalizeProfile(profile);
  const ranked = ACTIONS.map(action => ({ action, ...scoreAction(action, p) }))
    .filter(r => Number.isFinite(r.score))
    .sort((a, b) => b.score - a.score || a.action.id.localeCompare(b.action.id));

  // Spread the picks across SDG 15 targets so the plan is not five variations of one idea.
  // Pass 1: best action for each not-yet-covered target. Pass 2: fill remaining slots by score.
  const picks = [];
  const usedTargets = new Set();
  for (const r of ranked) {
    if (picks.length >= limit) break;
    if (r.action.targets.some(t => !usedTargets.has(t))) {
      picks.push(r);
      r.action.targets.forEach(t => usedTargets.add(t));
    }
  }
  for (const r of ranked) {
    if (picks.length >= limit) break;
    if (!picks.includes(r)) picks.push(r);
  }
  picks.sort((a, b) => b.score - a.score || a.action.id.localeCompare(b.action.id));

  return {
    profile: p,
    total: ranked.length,
    actions: picks.map(r => ({
      id: r.action.id,
      title: r.action.title,
      description: r.action.description,
      targets: r.action.targets,
      effort: r.action.effort,
      firstStep: r.action.firstStep,
      reasons: r.reasons,
    })),
  };
}

// A compact prompt (well under the 1,000-character question limit) for the AI model.
export function planPrompt(plan) {
  const lines = plan.actions.map((a, i) => `${i + 1}. ${a.title} (SDG ${a.targets.join(', ')})`);
  return `Write a friendly, practical 4-week plan for me to help Life on Land (SDG 15). Use these shortlisted actions, in this order, one focus per week, with a first step for each:\n${lines.join('\n')}`;
}

// Offline version of the same plan, used when no AI model is connected.
export function offlineWeeklyPlan(plan) {
  const weeks = [1, 2, 3, 4].map(w => ({ week: w, items: [] }));
  plan.actions.forEach((a, i) => weeks[Math.min(i, 3)].items.push(a));
  return weeks
    .filter(w => w.items.length)
    .map(w => `Week ${w.week}: ${w.items.map(a => `${a.title}. First step: ${a.firstStep}`).join(' Also: ')}`)
    .join('\n\n');
}
