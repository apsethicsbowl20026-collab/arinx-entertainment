import { useMemo, useState } from 'react';
import { TreePine } from 'lucide-react';

// Illustrative estimate only. Carbon uptake varies widely by species, climate, soil and tree age.
export default function Impact() {
  const [trees, setTrees] = useState(50);
  const [years, setYears] = useState(10);
  const [kgPerYear, setKgPerYear] = useState(22);

  const result = useMemo(() => {
    const t = Math.max(0, Number(trees) || 0);
    const y = Math.max(0, Number(years) || 0);
    const k = Math.max(0, Number(kgPerYear) || 0);
    const kg = t * y * k;
    return { kg, tonnes: kg / 1000 };
  }, [trees, years, kgPerYear]);

  return (
    <section className="section" id="impact">
      <div className="container impact">
        <header className="section__head">
          <h2>Estimate your tree impact</h2>
          <p>A simple, adjustable estimate of carbon absorbed by trees you plant. Replace the default with figures for your species and region when you have them.</p>
        </header>
        <div className="card impact__card">
          <div className="impact__inputs">
            <label className="field-inline">Trees planted
              <input type="number" min="0" value={trees} onChange={e => setTrees(e.target.value)} />
            </label>
            <label className="field-inline">Years of growth
              <input type="number" min="0" value={years} onChange={e => setYears(e.target.value)} />
            </label>
            <label className="field-inline">kg CO₂ absorbed per tree per year
              <input type="number" min="0" step="1" value={kgPerYear} onChange={e => setKgPerYear(e.target.value)} />
            </label>
          </div>
          <div className="impact__result" aria-live="polite">
            <TreePine size={40} aria-hidden="true" />
            <div>
              <div className="impact__big">{Math.round(result.kg).toLocaleString('en-IN')} kg CO₂</div>
              <div className="muted">about {result.tonnes.toLocaleString('en-IN', { maximumFractionDigits: 2 })} tonnes absorbed over the period</div>
            </div>
          </div>
          <p className="muted small">The default of 22 kg per tree per year is an illustrative assumption, not a measured value for any particular site. Trees also support soil, water and wildlife, which this figure does not capture.</p>
        </div>
      </div>
    </section>
  );
}
