// Curated answers used by the Land Guide when live AI is not configured.
// Keep every statistic here traceable to the Sources list on the page.

export const KNOWLEDGE = [
  {
    topic: 'About SDG 15',
    keywords: ['sdg', 'goal', 'life on land', 'what is', 'overview', 'sustainable development'],
    answer: 'SDG 15, Life on Land, is one of the 17 UN Sustainable Development Goals. It covers protecting and restoring terrestrial ecosystems, sustainably managing forests, combating desertification, halting land degradation and stopping biodiversity loss. Forests cover about 31% of Earth\'s land (4.06 billion hectares, FAO 2020).',
  },
  {
    topic: 'Forests and deforestation',
    keywords: ['forest', 'deforestation', 'trees', 'logging', 'canopy', 'tree cover'],
    answer: 'The world\'s annual deforestation rate was estimated at 10 million hectares a year in 2015–2020, down from 12 million hectares a year in 2010–2015 (FAO). Agricultural expansion drives most of it, and the FAO estimates that agriculture accounts for nearly 90% of global deforestation.',
  },
  {
    topic: 'Land degradation and desertification',
    keywords: ['desert', 'degradation', 'degraded', 'soil', 'drylands', 'drought', 'erosion'],
    answer: 'Between 2015 and 2019 the world lost at least 100 million hectares of healthy, productive land every year to degradation, affecting food and water security (UNCCD figures summarised by Gaia Education). Restoring degraded land and soil is the focus of Target 15.3.',
  },
  {
    topic: 'Biodiversity and extinction',
    keywords: ['species', 'extinction', 'biodiversity', 'endangered', 'animals', 'plants', 'wildlife'],
    answer: 'Around one million animal and plant species are threatened with extinction, according to IPBES (2019). Forests alone are home to more than 80% of land species. Protecting habitat is the most direct way to slow this loss (Targets 15.5 and 15.9).',
  },
  {
    topic: 'Invasive species',
    keywords: ['invasive', 'alien', 'non-native', 'introduced', 'weed'],
    answer: 'Target 15.8 asks countries to prevent the introduction of invasive alien species and to significantly reduce their impact on land and water ecosystems, controlling or eradicating priority species. Early mapping is the cheapest step, and AI image and satellite tools can help detect new spread sooner.',
  },
  {
    topic: 'Wildlife trafficking and poaching',
    keywords: ['poach', 'trafficking', 'illegal wildlife', 'smuggling', 'ivory', 'protected species'],
    answer: 'Target 15.7 calls for urgent action to end poaching and trafficking of protected species. AI-assisted acoustic sensors and camera traps can help rangers spot human activity at night, so patrols can respond faster. These tools support enforcement; they do not replace it.',
  },
  {
    topic: 'AI and camera traps',
    keywords: ['camera', 'trap', 'images', 'photo', 'identify', 'identification', 'classify'],
    answer: 'Computer vision models sort camera-trap photos into empty frames, animals, people and vehicles, then identify species. A 2018 study of Snapshot Serengeti images reported about 92% species-identification accuracy with deep learning. Pre-filtering with tools such as MegaDetector can cut manual review time substantially, but experts should still check results.',
  },
  {
    topic: 'AI and satellites',
    keywords: ['satellite', 'radar', 'alert', 'global forest watch', 'cloud', 'remote sensing', 'map'],
    answer: 'AI models scan satellite imagery to flag forest loss. Global Forest Watch alerts such as GLAD and RADD are near-real-time; RADD uses radar, so it can see through cloud cover in the tropics. Alerts show where to look, and ground checks confirm what happened.',
  },
  {
    topic: 'AI and acoustic monitoring',
    keywords: ['sound', 'audio', 'acoustic', 'chainsaw', 'microphone', 'listen', 'noise'],
    answer: 'Rainforest Connection repurposes old phones as solar-powered listening devices. On-device or cloud AI listens for chainsaws, trucks and key species,  and sends alerts to local partners so they can respond quickly. The approach is cheap to run and works in areas without reliable internet.',
  },
  {
    topic: 'AI, drones and restoration',
    keywords: ['drone', 'reforest', 'restor', 'plant', 'seed', 'planting', 'nursery', 'inventory'],
    answer: 'AI can help choose where and what to plant by combining soil, climate and slope data. Satellite imagery combined with AI can also build forest inventories (stem density, species distribution, carbon storage), which guide management. Restoration still depends on native species, local communities and long-term care.',
  },
  {
    topic: 'Risks and limits of AI',
    keywords: ['risk', 'limit', 'bias', 'wrong', 'accurate', 'accuracy', 'trust', 'problem', 'downside', 'energy'],
    answer: 'AI models are only as good as their training data, so they can miss rare species or misclassify images from new places. Results can be overtrusted if uncertainty is not reported. Compute and hardware also have environmental costs, so simple, edge-based tools are often the most sustainable choice.',
  },
  {
    topic: 'What can I do?',
    keywords: ['help', 'action', 'what can i do', 'volunteer', 'join', 'contribute', 'get involved', 'how can i'],
    answer: 'You can: report sightings through citizen-science apps such as iNaturalist; buy certified wood and products with low deforestation risk; support local protected areas and community forest groups; plant only native species in your garden; and use the Take Action checklist on this page to track your commitments.',
  },
  {
    topic: 'Data and sources',
    keywords: ['data', 'source', 'statistic', 'fao', 'unccd', 'ipbes', 'reference', 'study'],
    answer: 'The main sources are the FAO Global Forest Resources Assessment 2020, the UNCCD, IPBES (2019), the UN SDG portal and published studies on AI in conservation. The full list with links is in the Sources section at the bottom of this page.',
  },
];

export const FALLBACK_ANSWER = 'I can answer questions about SDG 15 and AI for forests, land, wildlife and biodiversity. Try asking about deforestation, invasive species, camera traps, satellite alerts, or what you can do to help.';

export const OFFLINE_NOTE = 'Offline mode: this answer comes from curated notes on this page, not a live AI model.';

// Returns the best matching curated entry, or null when nothing matches.
export function answerOffline(question) {
  const text = String(question || '').toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const entry of KNOWLEDGE) {
    // Longer keywords are more specific, so they count for more ("invasive" beats "species").
    const score = entry.keywords.reduce((sum, keyword) => sum + (text.includes(keyword) ? keyword.length : 0), 0);
    if (score > bestScore) {
      best = entry;
      bestScore = score;
    }
  }
  return best ? {topic: best.topic, answer: best.answer} : null;
}
