// Pledges are stored only in this browser (localStorage). Nothing is sent to a server.
const KEY = 'canopy.pledges.v1';
const EVENT = 'canopy:pledges';

export function getPledges() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(list) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200)));
  window.dispatchEvent(new Event(EVENT));
}

export function addPledge(text, source = 'custom') {
  const clean = String(text || '').trim().slice(0, 240);
  if (!clean) return getPledges();
  const next = [{ id: crypto.randomUUID(), text: clean, source, createdAt: new Date().toISOString() }, ...getPledges()];
  save(next);
  return next;
}

export function removePledge(id) {
  const next = getPledges().filter(p => p.id !== id);
  save(next);
  return next;
}

export function subscribePledges(callback) {
  const handler = () => callback(getPledges());
  window.addEventListener(EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
