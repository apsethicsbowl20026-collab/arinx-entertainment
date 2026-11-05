import { useState } from 'react';
import { Bot, Check, ChevronRight, MapPin, Sparkles } from 'lucide-react';
import { ACTIONS, buildPlan, HOMES, INTERESTS, LOCATIONS, planPrompt, TIME } from '../../shared/planner.js';
import { addPledge, getPledges } from '../lib/storage.js';

const DEFAULT = { location: 'suburban', home: 'apartment', time: 'moderate', interests: ['gardening', 'wildlife'] };

function Options({ name, legend, options, value, onChange }) {
  return (
    <fieldset className="field">
      <legend>{legend}</legend>
      <div className="radio-group">
        {options.map(o => (
          <label key={o.id} className={`radio ${value === o.id ? 'is-on' : ''}`}>
            <input type="radio" name={name} value={o.id} checked={value === o.id} onChange={() => onChange(o.id)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function Planner({ onAskAi }) {
  const [profile, setProfile] = useState(DEFAULT);
  const [plan, setPlan] = useState(() => buildPlan(DEFAULT));
  const [committed, setCommitted] = useState(() => new Set());

  function update(patch) {
    setProfile(p => ({ ...p, ...patch }));
  }

  function toggleInterest(id) {
    setProfile(p => ({
      ...p,
      interests: p.interests.includes(id) ? p.interests.filter(i => i !== id) : [...p.interests, id],
    }));
  }

  function generate(e) {
    e?.preventDefault();
    setPlan(buildPlan(profile));
    setCommitted(new Set());
  }

  function commit(action) {
    addPledge(action.title, 'planner');
    setCommitted(prev => new Set(prev).add(action.id));
  }

  const pledgeCount = getPledges().length;

  return (
    <section className="section section--tint" id="planner">
      <div className="container planner">
        <header className="section__head">
          <h2>Your AI action planner</h2>
          <p>
            Tell us where you live and what you enjoy. Canopy’s transparent recommender scores {ACTIONS.length} actions and explains why each one suits you.
          </p>
        </header>

        <form className="card planner__form" onSubmit={generate}>
          <Options name="location" legend={<><MapPin size={15} aria-hidden="true" /> Where do you live?</>} options={LOCATIONS} value={profile.location} onChange={v => update({ location: v })} />
          <Options name="home" legend="What outdoor space do you have?" options={HOMES} value={profile.home} onChange={v => update({ home: v })} />
          <Options name="time" legend="How much time can you give?" options={TIME} value={profile.time} onChange={v => update({ time: v })} />
          <fieldset className="field">
            <legend>What interests you? (choose any)</legend>
            <div className="check-group">
              {INTERESTS.map(i => (
                <label key={i.id} className={`check ${profile.interests.includes(i.id) ? 'is-on' : ''}`}>
                  <input type="checkbox" checked={profile.interests.includes(i.id)} onChange={() => toggleInterest(i.id)} />
                  {i.label}
                </label>
              ))}
            </div>
          </fieldset>
          <button className="btn btn--primary" type="submit"><Sparkles size={17} aria-hidden="true" /> Generate my plan</button>
        </form>

        <div className="plan">
          <div className="plan__head">
            <h3>Your top {plan.actions.length} actions</h3>
            <span className="muted small">{plan.total} actions match your profile · {pledgeCount} pledges saved</span>
          </div>
          {plan.actions.length === 0 && <p className="muted">No actions match this combination. Try a longer time option or a different home type.</p>}
          <ol className="plan__list">
            {plan.actions.map((a, i) => (
              <li className="card plan__item" key={a.id}>
                <div className="plan__rank">{i + 1}</div>
                <div className="plan__main">
                  <div className="plan__tags">
                    {a.targets.map(t => <span className="badge" key={t}>SDG {t}</span>)}
                  </div>
                  <h4>{a.title}</h4>
                  <p>{a.description}</p>
                  <p className="why"><strong>Why for you:</strong> {a.reasons.join(' · ')}</p>
                  <p className="step"><ChevronRight size={15} aria-hidden="true" /> <strong>First step:</strong> {a.firstStep}</p>
                  <button className="btn btn--small" disabled={committed.has(a.id)} onClick={() => commit(a)}>
                    {committed.has(a.id) ? <><Check size={15} aria-hidden="true" /> Pledged</> : 'Pledge to do this'}
                  </button>
                </div>
              </li>
            ))}
          </ol>
          {plan.actions.length > 0 && (
            <div className="plan__ai">
              <button className="btn btn--ghost" onClick={() => onAskAi({ text: planPrompt(plan), plan })}>
                <Bot size={17} aria-hidden="true" /> Ask Canopy AI to write a 4-week plan from these
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

