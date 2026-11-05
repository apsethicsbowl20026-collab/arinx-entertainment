import { useEffect, useState } from 'react';
import { Leaf, Menu, X } from 'lucide-react';
import Hero from './components/Hero.jsx';
import Targets from './components/Targets.jsx';
import Facts from './components/Facts.jsx';
import Chat from './components/Chat.jsx';
import Planner from './components/Planner.jsx';
import Impact from './components/Impact.jsx';
import Pledges from './components/Pledges.jsx';
import Footer from './components/Footer.jsx';
import { getStatus } from './lib/api.js';

const NAV = [
  { id: 'goal', label: 'SDG 15' },
  { id: 'facts', label: 'Facts' },
  { id: 'chat', label: 'Ask AI' },
  { id: 'planner', label: 'Planner' },
  { id: 'impact', label: 'Impact' },
  { id: 'pledge', label: 'Pledge' },
  { id: 'sources', label: 'Sources' },
];

export default function App() {
  const [status, setStatus] = useState(null);
  const [request, setRequest] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    getStatus().then(setStatus);
  }, []);

  function go(id) {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Sends a question (or { text, plan }) to the chat section and scrolls there.
  function ask(text, extra = {}) {
    setRequest({ text, ...extra, nonce: Date.now() + Math.random() });
    go('chat');
  }

  return (
    <div className="app">
      <a className="skip" href="#main">Skip to content</a>
      <header className="topbar">
        <div className="container topbar__inner">
          <button className="brand" onClick={() => go('top')} aria-label="Canopy home">
            <span className="brand__mark"><Leaf size={18} aria-hidden="true" /></span>
            <span>Canopy</span>
          </button>
          <nav className={`nav ${menuOpen ? 'is-open' : ''}`} aria-label="Main">
            {NAV.map(n => <button key={n.id} onClick={() => go(n.id)}>{n.label}</button>)}
          </nav>
          <button className="icon-btn menu-btn" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
      <main id="main">
        <Hero onNavigate={go} />
        <Targets onAsk={ask} />
        <Facts />
        <Chat status={status} request={request} />
        <Planner onAskAi={request => ask(request.text, { plan: request.plan })} />
        <Impact />
        <Pledges />
      </main>
      <Footer />
    </div>
  );
}
