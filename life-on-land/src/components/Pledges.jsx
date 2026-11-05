import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { addPledge, getPledges, removePledge, subscribePledges } from '../lib/storage.js';

export default function Pledges() {
  const [pledges, setPledges] = useState(() => getPledges());
  const [text, setText] = useState('');

  useEffect(() => subscribePledges(setPledges), []);

  function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    addPledge(text);
    setText('');
  }

  return (
    <section className="section" id="pledge">
      <div className="container pledge">
        <header className="section__head">
          <h2>Make your pledge</h2>
          <p>Write down what you will do for Life on Land. Pledges are saved only in this browser and are not shared.</p>
        </header>
        <form className="pledge__form card" onSubmit={submit}>
          <label htmlFor="pledge-input" className="field-label">I pledge to…</label>
          <div className="pledge__row">
            <input id="pledge-input" value={text} maxLength={240} placeholder="e.g. plant a native neem sapling this monsoon" onChange={e => setText(e.target.value)} />
            <button className="btn btn--primary" type="submit" disabled={!text.trim()}>Add pledge</button>
          </div>
        </form>
        <p className="muted">{pledges.length === 0 ? 'No pledges yet. Make one above or pick an action in the planner.' : `You have ${pledges.length} pledge${pledges.length === 1 ? '' : 's'}.`}</p>
        <ul className="pledge__list">
          {pledges.map(p => (
            <li className="card pledge__item" key={p.id}>
              <div>
                <span>{p.text}</span>
                <small className="muted">{new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}{p.source === 'planner' ? ' · from planner' : ''}</small>
              </div>
              <button className="icon-btn" aria-label={`Remove pledge: ${p.text}`} onClick={() => removePledge(p.id)}><Trash2 size={16} /></button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
