import { ArrowRight, Bot, Leaf, Sprout } from 'lucide-react';

const STATS = [
  { value: '4.06 bn ha', label: 'of forest worldwide, about 31% of land (FAO, 2020)' },
  { value: '10 M ha / yr', label: 'deforestation rate, 2015–2020 (FAO, 2020)' },
  { value: '~1 million', label: 'species threatened with extinction (IPBES, 2019)' },
  { value: '25.17%', label: 'of India’s area under forest and tree cover (ISFR 2023)' },
];

export default function Hero({ onNavigate }) {
  return (
    <section className="hero" id="top">
      <img className="hero__bg" src="/hero-canopy.jpg" alt="" aria-hidden="true" />
      <div className="hero__shade" />
      <div className="container hero__content">
        <p className="eyebrow"><Leaf size={16} aria-hidden="true" /> UN Sustainable Development Goal 15</p>
        <h1>Life on Land, powered by AI</h1>
        <p className="lead">
          Canopy helps you understand how to protect, restore and sustainably use forests, wildlife
          and land. Ask our AI guide, build a personal action plan, and see the facts behind each
          target.
        </p>
        <div className="hero__actions">
          <button className="btn btn--primary" onClick={() => onNavigate('chat')}>
            <Bot size={18} aria-hidden="true" /> Ask Canopy AI
          </button>
          <button className="btn btn--ghost" onClick={() => onNavigate('planner')}>
            <Sprout size={18} aria-hidden="true" /> Build my action plan <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>
        <dl className="stats">
          {STATS.map(s => (
            <div className="stat" key={s.value}>
              <dt>{s.value}</dt>
              <dd>{s.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
