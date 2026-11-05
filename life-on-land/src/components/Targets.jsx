import { MessageCircle } from 'lucide-react';

// Plain-language summaries of the SDG 15 targets. Wording follows the UN text.
export const TARGETS = [
  { id: '15.1', title: 'Conserve ecosystems', text: 'Conserve, restore and sustainably use land and inland freshwater ecosystems, especially forests, wetlands, mountains and drylands.' },
  { id: '15.2', title: 'Sustainable forests', text: 'Manage all forests sustainably, halt deforestation, restore degraded forests and substantially increase afforestation and reforestation.' },
  { id: '15.3', title: 'Restore land and soil', text: 'Combat desertification and restore degraded land and soil, aiming for a land degradation-neutral world by 2030.' },
  { id: '15.4', title: 'Protect mountains', text: 'Conserve mountain ecosystems and their biodiversity, which provide water and other benefits for sustainable development.' },
  { id: '15.5', title: 'Halt biodiversity loss', text: 'Reduce habitat degradation, halt biodiversity loss, and protect and prevent the extinction of threatened species.' },
  { id: '15.6', title: 'Share genetic benefits', text: 'Promote fair and equitable sharing of benefits from genetic resources, as internationally agreed.' },
  { id: '15.7', title: 'End wildlife trafficking', text: 'End poaching and trafficking of protected plants and animals, and address both demand and supply of illegal wildlife products.' },
  { id: '15.8', title: 'Control invasive species', text: 'Prevent the introduction of invasive alien species and reduce their impact on land and water ecosystems.' },
  { id: '15.9', title: 'Value nature in planning', text: 'Integrate ecosystem and biodiversity values into national and local planning, development and accounts.' },
];

export default function Targets({ onAsk }) {
  return (
    <section className="section" id="goal">
      <div className="container">
        <header className="section__head">
          <h2>What SDG 15 asks of us</h2>
          <p>The nine core targets of Goal 15. Choose one to ask Canopy about it.</p>
        </header>
        <div className="grid grid--3">
          {TARGETS.map(t => (
            <article className="card target" key={t.id}>
              <span className="badge">Target {t.id}</span>
              <h3>{t.title}</h3>
              <p>{t.text}</p>
              <button className="link-btn" onClick={() => onAsk(`Explain SDG target ${t.id}: ${t.title.toLowerCase()}, and what individuals can do about it.`)}>
                <MessageCircle size={15} aria-hidden="true" /> Ask Canopy about this
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
