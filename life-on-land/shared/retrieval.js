// Offline retrieval engine for Canopy.
// A small TF-IDF index over the curated knowledge base. It runs in the browser (offline answers)
// and on the server (grounding passages for the optional AI model).
import { KNOWLEDGE, SOURCES } from './knowledge.js';

const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'because', 'been',
  'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'could', 'did', 'do', 'does', 'doing', 'down',
  'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'him',
  'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'no', 'nor',
  'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'out', 'over', 'own', 'same', 'she', 'should',
  'so', 'some', 'such', 'than', 'that', 'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those',
  'through', 'to', 'too', 'under', 'until', 'up', 'us', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which',
  'while', 'who', 'whom', 'why', 'will', 'with', 'would', 'you', 'your', 'tell', 'me', 'please', 'explain', 'know',
  'want', 'help', 'make', 'get', 'also', 'much', 'many', 'way', 'ways', 'things', 'thing', 'let', 'give',
]);

// Map common words to one canonical concept so that different phrasings match.
const SYNONYMS = {
  forests: 'forest', woodland: 'forest', woodlands: 'forest', woods: 'forest', jungle: 'forest', trees: 'tree', planted: 'plant',
  planting: 'plant', saplings: 'sapling', animals: 'wildlife', animal: 'wildlife', fauna: 'wildlife', species: 'species',
  endangered: 'threatened', extinct: 'extinction', extinctions: 'extinction', poachers: 'poaching', poacher: 'poaching',
  poached: 'poaching', smuggling: 'trafficking', smuggled: 'trafficking', desert: 'desertification',
  deserts: 'desertification', degraded: 'degradation', degrading: 'degradation', soils: 'soil', mountain: 'mountains',
  wetland: 'wetlands', lake: 'wetlands', lakes: 'wetlands', pond: 'wetlands', ponds: 'wetlands', river: 'freshwater',
  rivers: 'freshwater', water: 'freshwater', invasives: 'invasive', weeds: 'invasive', weed: 'invasive',
  alien: 'invasive', fertilizer: 'fertiliser', artificial: 'ai', intelligence: 'ai', machine: 'ai', learning: 'ai',
  ai: 'ai', india: 'india', indian: 'india', maharashtra: 'maharashtra', ghats: 'ghats', sustainably: 'sustainable',
  sustainability: 'sustainable', protected: 'protection', protecting: 'protection', protect: 'protection',
  conserve: 'conservation', conserving: 'conservation', forestry: 'forest', tigers: 'tiger', leopards: 'leopard',
};

const GREETING = /^\s*(hi|hello|hey|namaste|good (morning|afternoon|evening)|greetings)\b/i;
const THANKS = /\b(thanks|thank you|dhanyavad|shukriya)\b/i;

export function normalize(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s.-]/g, ' ')
    .split(/[\s-]+/)
    .map(token => token.replace(/^\.+|\.+$/g, '')) // keep "15.5", drop sentence dots
    .filter(Boolean)
    .map(token => {
      let t = SYNONYMS[token] ?? token;
      if (t.length > 4 && t.endsWith('ies')) t = `${t.slice(0, -3)}y`;
      else if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) t = t.slice(0, -1);
      return t;
    })
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

function termCounts(tokens) {
  const counts = new Map();
  for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);
  return counts;
}

export function buildIndex(entries = KNOWLEDGE) {
  const docs = entries.map(entry => {
    // Title and tags are weighted more heavily than body text.
    const tokens = [
      ...normalize(entry.title), ...normalize(entry.title),
      ...normalize(entry.tags.join(' ')), ...normalize(entry.tags.join(' ')),
      ...normalize(entry.body),
    ];
    return { entry, tf: termCounts(tokens), length: tokens.length || 1 };
  });
  const df = new Map();
  for (const doc of docs) for (const term of doc.tf.keys()) df.set(term, (df.get(term) || 0) + 1);
  const n = docs.length;
  const idf = term => Math.log(1 + n / (df.get(term) || 1));
  return { docs, idf };
}

const defaultIndex = buildIndex();

// Returns the best-matching knowledge entries for a query, highest score first.
export function search(query, { k = 3, minScore = 0.08, index = defaultIndex } = {}) {
  const terms = [...new Set(normalize(query))];
  if (!terms.length) return [];
  const scored = index.docs.map(doc => {
    let score = 0;
    for (const term of terms) {
      const tf = doc.tf.get(term);
      if (tf) score += (1 + Math.log(tf)) * index.idf(term);
    }
    return { entry: doc.entry, score: score / Math.sqrt(doc.length) };
  });
  return scored
    .filter(s => s.score >= minScore)
    .sort((a, b) => b.score - a.score || a.entry.id.localeCompare(b.entry.id))
    .slice(0, k);
}

// A citation: the specific knowledge entry, plus the publisher and link it came from.
export function sourceFor(entry) {
  const src = SOURCES[entry.source];
  return { id: entry.id, title: entry.title, publisher: src.title, url: src.url };
}

export const FALLBACK_REPLY =
  'I focus on SDG 15, Life on Land: forests, wildlife, biodiversity, soil and land restoration. ' +
  'I could not find a matching answer in my knowledge base for that question. Try asking about forests, ' +
  'invasive species, wildlife protection, land restoration, or how AI supports conservation.';

// Answers a question from the knowledge base without any AI model.
export function answerLocally(query, { history = [] } = {}) {
  const text = String(query || '').trim();
  if (!text) return { reply: 'Ask me anything about Life on Land. For example: “How much forest is left in the world?”', sources: [] };
  if (GREETING.test(text) && normalize(text).length <= 2) {
    return {
      reply: 'Hello! I am Canopy, your guide to SDG 15, Life on Land. What would you like to explore: forests, wildlife, land restoration, or your own actions?',
      sources: [],
    };
  }
  if (THANKS.test(text) && normalize(text).length <= 3) {
    return { reply: 'You are welcome. Every tree you protect and every habitat you respect helps Life on Land.', sources: [] };
  }

  // Follow-up questions such as "and in India?" are matched against the previous user question too.
  const previous = [...history].reverse().find(m => m.role === 'user')?.content || '';
  let hits = search(text, { k: 3 });
  if (!hits.length && previous) hits = search(`${previous} ${text}`, { k: 3 });
  if (!hits.length) return { reply: FALLBACK_REPLY, sources: [] };

  const sources = [];
  const parts = hits.slice(0, 2).map(hit => {
    sources.push(sourceFor(hit.entry));
    return `${hit.entry.body} [${sources.length}]`;
  });
  return { reply: parts.join('\n\n'), sources };
}

// Passages to ground an AI answer: the top matches for the latest question plus the previous one.
export function retrievePassages(messages) {
  const userTurns = messages.filter(m => m.role === 'user').map(m => m.content);
  const latest = userTurns[userTurns.length - 1] || '';
  const previous = userTurns[userTurns.length - 2] || '';
  let hits = search(latest, { k: 4 });
  if (previous) {
    for (const hit of search(`${previous} ${latest}`, { k: 4 })) {
      if (!hits.some(h => h.entry.id === hit.entry.id)) hits.push(hit);
    }
  }
  return hits.slice(0, 4).map(h => ({ ...sourceFor(h.entry), body: h.entry.body }));
}
