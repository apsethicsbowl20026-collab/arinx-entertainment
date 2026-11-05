import { SOURCES } from '../../shared/knowledge.js';

export default function Footer() {
  return (
    <footer className="footer" id="sources">
      <div className="container">
        <h2>Sources</h2>
        <ul className="sources-list">
          {Object.values(SOURCES).map(s => (
            <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></li>
          ))}
        </ul>
        <p className="small">
          Canopy is an educational prototype. Statistics are taken from the sources above and may have been updated since. AI answers can contain mistakes,
          so check important decisions against the original sources. Uses only public information and does not collect personal data.
        </p>
        <p className="small">Built for SDG 15, Life on Land.</p>
      </div>
    </footer>
  );
}
