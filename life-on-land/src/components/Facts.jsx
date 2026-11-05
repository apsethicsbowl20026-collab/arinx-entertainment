const INDIA = { forest: 21.76, tree: 3.41, target: 33 };

export default function Facts() {
  const total = INDIA.forest + INDIA.tree;
  return (
    <section className="section section--tint" id="facts">
      <div className="container">
        <header className="section__head">
          <h2>The state of land and forests</h2>
          <p>Key figures from the UN and FAO, with India and Maharashtra in focus. Each figure links to its source.</p>
        </header>

        <div className="grid grid--2">
          <article className="card">
            <h3>Global forests (FAO FRA 2020)</h3>
            <ul className="facts">
              <li><strong>4.06 billion ha</strong> of forest, about 31% of the total land area.</li>
              <li><strong>10 million ha per year</strong> deforestation in 2015–2020, down from 12 million ha per year in 2010–2015.</li>
              <li><strong>4.7 million ha per year</strong> net forest loss in 2010–2020, down from 7.8 million ha per year in the 1990s.</li>
              <li><strong>726 million ha</strong> of forest in protected areas, nearly 200 million ha more than in 1990.</li>
            </ul>
          </article>
          <article className="card">
            <h3>Biodiversity and people</h3>
            <ul className="facts">
              <li><strong>About 1 million</strong> animal and plant species are threatened with extinction (IPBES, 2019).</li>
              <li><strong>About 75%</strong> of the land-based environment has been significantly altered by people (IPBES, 2019).</li>
              <li><strong>About 1.6 billion people</strong> depend on forests for their livelihood, including some 70 million indigenous people (UNCCD).</li>
              <li><strong>Over 80%</strong> of terrestrial species of animals, plants and insects live in forests (UNCCD).</li>
            </ul>
          </article>
        </div>

        <article className="card india">
          <div>
            <h3>India’s forest and tree cover (ISFR 2023)</h3>
            <p>
              Forest and tree cover covers <strong>25.17%</strong> of India’s geographical area: forest cover is 21.76% and tree cover is 3.41%.
              The 1988 National Forest Policy target is <strong>33%</strong>.
            </p>
            <p>
              <strong>Maharashtra</strong> has about 65,383 sq km of forest and tree cover, the third-largest area among Indian states. The
              <strong> Western Ghats</strong>, a UNESCO World Heritage Site and biodiversity hotspot, run through the state.
            </p>
          </div>
          <div className="bars" role="img" aria-label={`Forest and tree cover ${total.toFixed(2)} percent of India, against a 33 percent policy target`}>
            <div className="bar">
              <span>Forest cover</span>
              <div className="bar__track"><div className="bar__fill" style={{ width: `${(INDIA.forest / 40) * 100}%` }} /></div>
              <b>{INDIA.forest}%</b>
            </div>
            <div className="bar">
              <span>Tree cover</span>
              <div className="bar__track"><div className="bar__fill bar__fill--light" style={{ width: `${(INDIA.tree / 40) * 100}%` }} /></div>
              <b>{INDIA.tree}%</b>
            </div>
            <div className="bar">
              <span>Policy target</span>
              <div className="bar__track"><div className="bar__fill bar__fill--target" style={{ width: `${(INDIA.target / 40) * 100}%` }} /></div>
              <b>33%</b>
            </div>
            <p className="muted small">Bars are scaled to 40% of land area.</p>
          </div>
        </article>
      </div>
    </section>
  );
}
