// Browser client for the Canopy API. If the API is unreachable (for example on a static host),
// it falls back to the same offline knowledge base that the server uses.
import { answerLocally } from '../../shared/retrieval.js';

export async function getStatus() {
  try {
    const res = await fetch('/api/status', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return { ai: { enabled: false, model: null }, knowledgeBase: null, offline: true };
  }
}

// messages: [{ role: 'user' | 'assistant', content }]. Returns { reply, sources, mode, notice? }.
export async function sendChat(messages) {
  const trimmed = messages.slice(-12);
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ messages: trimmed }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    const latest = [...trimmed].reverse().find(m => m.role === 'user')?.content || '';
    const local = answerLocally(latest, { history: trimmed });
    return {
      ...local,
      mode: 'local',
      notice: `The AI service is not reachable, so this answer comes from the offline knowledge base. (${err.message})`,
    };
  }
}
