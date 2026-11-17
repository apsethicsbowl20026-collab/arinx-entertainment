import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {
  Bookmark, Clapperboard, Command, Compass, History, LayoutDashboard, LogOut, Moon, Plus,
  Search, Shield, Sun, UploadCloud, UserRound, Video
} from 'lucide-react';
import catalog from './catalog.json';
import {api, cx, mergeVideos, post, read, write} from './lib.js';
import {Avatar, Logo, Toasts} from './components.jsx';
import {AuthModal, CommandPalette, UploadModal} from './overlays.jsx';
import {Home, Shorts, Library, SearchPage} from './pages.jsx';
import {Watch} from './watch.jsx';
import './style.css';

const readRoute = () => {
  const params = new URLSearchParams(location.search);
  const id = params.get('v');
  if (id) return {page: 'watch', id};
  const page = params.get('page');
  if (['shorts', 'library', 'search'].includes(page)) return {page, q: params.get('q') || '', tab: params.get('tab') || ''};
  return {page: 'home'};
};
const toQuery = route => {
  if (!route) return '';
  const params = new URLSearchParams();
  if (route.page === 'watch' && route.id) params.set('v', route.id);
  else if (route.page && route.page !== 'home') params.set('page', route.page);
  if (route.q) params.set('q', route.q);
  if (route.tab) params.set('tab', route.tab);
  return params.toString();
};

function App() {
  const [route, setRoute] = useState(readRoute);
  const [user, setUser] = useState(undefined);
  const [managed, setManaged] = useState([]);
  const [health, setHealth] = useState(null);
  const [theme, setTheme] = useState(() => read('arinx.theme', 'dark'));
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState(() => readRoute().q || '');
  const [toasts, setToasts] = useState([]);
  const [progress, setProgress] = useState(() => read('arinx.progress', {}));
  const [saved, setSaved] = useState(() => read('arinx.saved', []));
  const [historyList, setHistoryList] = useState(() => read('arinx.history', []));
  const [likedList, setLikedList] = useState(() => read('arinx.liked', []));
  const [cinema, setCinema] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef(null);
  const menuRef = useRef(null);

  const videos = useMemo(() => mergeVideos(managed, catalog), [managed]);
  const maxMB = health?.uploadLimitMB || 16;
  const storage = health?.storage === 'r2' ? 'R2' : 'D1';

  const toastSeqRef = useRef(0);
  const notify = useCallback((message, kind = 'ok') => {
    const id = ++toastSeqRef.current;
    setToasts(current => [...current.slice(-3), {id, message, kind}]);
    setTimeout(() => setToasts(current => current.filter(toast => toast.id !== id)), 4200);
  }, []);

  const loadVideos = useCallback(async () => {
    try { const data = await api('videos'); setManaged(data.videos || []); } catch { /* keep catalog */ }
    return [];
  }, []);

  useEffect(() => {
    let alive = true;
    api('auth').then(data => alive && setUser(data.user)).catch(() => alive && setUser(null));
    api('health').then(data => alive && setHealth(data)).catch(() => {});
    api('videos').then(data => alive && setManaged(data.videos || [])).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    write('arinx.theme', theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#040914' : '#eef4ff');
  }, [theme]);

  useEffect(() => {
    if (route.page === 'search') setSearchDraft(route.q || '');
  }, [route.page, route.q]);

  useEffect(() => {
    const onPop = () => setRoute(readRoute());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    if (route.page !== 'watch' || !route.id) return;
    setHistoryList(current => {
      const next = [{id: route.id, at: Date.now()}, ...current.filter(item => item.id !== route.id)].slice(0, 80);
      write('arinx.history', next);
      return next;
    });
  }, [route.page, route.id]);

  useEffect(() => {
    const onKey = event => {
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); setPaletteOpen(value => !value);
      } else if (event.key === '/' && !typing) {
        event.preventDefault(); searchRef.current?.focus();
      } else if (event.key === 'Escape') {
        setCinema(false); setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = event => { if (!menuRef.current?.contains(event.target)) setMenuOpen(false); };
    document.addEventListener('pointerdown', onClick);
    return () => document.removeEventListener('pointerdown', onClick);
  }, [menuOpen]);

  const go = useCallback(next => {
    if (next?.openAuth) { setAuthOpen(true); return; }
    const target = !next ? {page: 'home'} : typeof next === 'string' ? {page: next} : next.id && !next.page ? {page: 'watch', id: next.id} : next;
    setMenuOpen(false);
    setCinema(false);
    const qs = toQuery(target);
    const apply = () => {
      window.history.pushState({}, '', qs ? `/?${qs}` : location.pathname);
      setRoute(target);
      window.scrollTo({top: 0, behavior: 'instant'});
    };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (document.startViewTransition && !reduce) document.startViewTransition(apply);
    else apply();
  }, []);

  const openVideo = useCallback(video => {
    go({page: 'watch', id: video.id});
  }, [go]);

  const saveProgress = useCallback((id, t, d) => {
    setProgress(current => {
      const next = {...current, [id]: {t, d, at: Date.now()}};
      write('arinx.progress', next);
      return next;
    });
  }, []);

  const toggleSave = useCallback(video => {
    const has = saved.includes(video.id);
    const next = has ? saved.filter(id => id !== video.id) : [video.id, ...saved];
    setSaved(next); write('arinx.saved', next);
    notify(has ? 'Removed from Watch later' : 'Saved to Watch later', 'save');
  }, [saved, notify]);

  const toggleLikeLocal = useCallback((id, isLiked) => {
    setLikedList(current => {
      const next = isLiked ? [id, ...current.filter(item => item !== id)] : current.filter(item => item !== id);
      write('arinx.liked', next);
      return next;
    });
  }, []);

  const logout = async () => {
    try { await post('auth', {action: 'logout'}); } catch { /* already out */ }
    setUser(null); setMenuOpen(false); notify('Signed out of ARINX');
  };

  const uploaded = async id => {
    try { const data = await api('videos'); setManaged(data.videos || []); } catch { /* noop */ }
    go({page: 'watch', id});
  };

  const submitSearch = event => {
    event.preventDefault();
    go({page: 'search', q: searchDraft.trim()});
  };

  const isAdmin = user && ['admin', 'owner'].includes(user.role);
  const actions = useMemo(() => {
    const list = [
      {id: 'publish', label: 'Publish a video', hint: 'Upload a file or link a source', icon: UploadCloud, run: () => (user ? setUploadOpen(true) : setAuthOpen(true))},
      {id: 'theme', label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`, hint: 'Appearance', icon: theme === 'dark' ? Sun : Moon, run: () => setTheme(value => (value === 'dark' ? 'light' : 'dark'))},
      {id: 'library', label: 'Open your library', hint: 'History, saved and likes', icon: Bookmark, run: () => go({page: 'library'})}
    ];
    if (user) list.push({id: 'signout', label: `Sign out of ${user.name}`, hint: 'Account', icon: LogOut, run: logout});
    else list.push({id: 'signin', label: 'Sign in or create an account', hint: 'Account', icon: UserRound, run: () => setAuthOpen(true)});
    if (isAdmin) list.push({id: 'admin', label: 'Open admin console', hint: 'Owner tools', icon: LayoutDashboard, run: () => { location.href = '/admin'; }});
    return list;
  }, [user, theme, isAdmin, go]);

  const watchVideo = route.page === 'watch' ? videos.find(video => video.id === route.id) : null;
  const navItems = [
    {page: 'home', label: 'Discover', icon: Compass},
    {page: 'shorts', label: 'Shorts', icon: Clapperboard},
    {page: 'search', label: 'Search', icon: Search},
    {page: 'library', label: 'Library', icon: Bookmark}
  ];

  return (
    <div className="app">
      <div className="ambient" aria-hidden="true"><span className="orb orb-a" /><span className="orb orb-b" /><span className="orb orb-c" /><span className="grid-lines" /></div>
      <aside className="rail">
        <button className="rail-logo" onClick={() => go({page: 'home'})} aria-label="ARINX home"><Logo word={false} /></button>
        <nav className="rail-nav" aria-label="Primary">
          {navItems.map(({page, label, icon: Icon}) => (
            <button key={page} className={cx('rail-btn', route.page === page && 'active')} onClick={() => go({page})} aria-current={route.page === page ? 'page' : undefined}>
              <Icon size={20} /><span>{label}</span>
            </button>
          ))}
          <button className="rail-btn" onClick={() => (user ? setUploadOpen(true) : setAuthOpen(true))}><Plus size={20} /><span>Publish</span></button>
          {isAdmin && <a className="rail-btn" href="/admin"><Shield size={20} /><span>Admin</span></a>}
        </nav>
        <div className="rail-bottom">
          <button className="rail-btn" onClick={() => setPaletteOpen(true)}><Command size={20} /><span>Jump</span></button>
          <button className="rail-btn" onClick={() => setTheme(value => (value === 'dark' ? 'light' : 'dark'))}>{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}<span>Theme</span></button>
          {user ? (
            <button className="rail-avatar" onClick={() => setMenuOpen(value => !value)} aria-label="Account menu"><Avatar name={user.name} size={38} /><span className="presence" /></button>
          ) : (
            <button className="rail-btn" onClick={() => setAuthOpen(true)}><UserRound size={20} /><span>Sign in</span></button>
          )}
        </div>
      </aside>

      <div className="shell">
        <header className="topbar">
          <button className="topbar-brand" onClick={() => go({page: 'home'})} aria-label="ARINX home"><Logo /></button>
          <form className="global-search" onSubmit={submitSearch} role="search">
            <Search size={18} />
            <input ref={searchRef} value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="Search films, creators, frequencies…" aria-label="Search ARINX" />
            <button type="button" className="key-btn" onClick={() => setPaletteOpen(true)} aria-label="Open command palette"><Command size={13} />K</button>
          </form>
          <div className="topbar-actions">
            <button className="icon-btn ghost" onClick={() => setPaletteOpen(true)} aria-label="Command palette"><Command size={18} /></button>
            <button className="btn btn-primary publish-btn" onClick={() => (user ? setUploadOpen(true) : setAuthOpen(true))}><UploadCloud size={16} /><span>Publish</span></button>
            {user ? (
              <div className="user-menu" ref={menuRef}>
                <button className="avatar-btn" onClick={() => setMenuOpen(value => !value)} aria-label="Account menu"><Avatar name={user.name} size={36} /></button>
                {menuOpen && (
                  <div className="user-pop glass">
                    <div className="user-pop-head"><Avatar name={user.name} size={40} /><div><b>{user.name}</b><small>{user.role} account</small></div></div>
                    {isAdmin && <a className="user-pop-item" href="/admin"><LayoutDashboard size={16} />Admin console</a>}
                    <button className="user-pop-item" onClick={() => { setMenuOpen(false); setUploadOpen(true); }}><UploadCloud size={16} />Publish a video</button>
                    <button className="user-pop-item" onClick={() => { setMenuOpen(false); go({page: 'library'}); }}><Bookmark size={16} />Your library</button>
                    <button className="user-pop-item danger" onClick={logout}><LogOut size={16} />Sign out</button>
                  </div>
                )}
              </div>
            ) : (
              <button className="btn btn-glass signin-btn" onClick={() => setAuthOpen(true)}><UserRound size={16} /><span>Sign in</span></button>
            )}
          </div>
        </header>

        <main className="stage">
          {route.page === 'home' && <Home videos={videos} progress={progress} saved={saved} onOpen={openVideo} onNavigate={go} onUpload={() => (user ? setUploadOpen(true) : setAuthOpen(true))} user={user} maxMB={maxMB} onToggleSave={toggleSave} notify={notify} />}
          {route.page === 'watch' && <Watch video={watchVideo} videos={videos} user={user} liked={likedList.includes(route.id)} saved={saved.includes(route.id)} progress={progress} onProgress={saveProgress} onToggleSave={toggleSave} onToggleLike={toggleLikeLocal} onNavigate={go} onAuth={() => setAuthOpen(true)} notify={notify} cinema={cinema} setCinema={setCinema} />}
          {route.page === 'shorts' && <Shorts videos={videos} saved={saved} onOpen={openVideo} onToggleSave={toggleSave} onLike={video => { if (!user) setAuthOpen(true); else notify('Open the video to leave a like'); }} />}
          {route.page === 'library' && <Library videos={videos} user={user} progress={progress} saved={saved} history={historyList} liked={likedList} onOpen={openVideo} onUpload={() => (user ? setUploadOpen(true) : setAuthOpen(true))} onNeedAuth={() => setAuthOpen(true)} initialTab={route.tab} onNavigate={go} />}
          {route.page === 'search' && <SearchPage videos={videos} query={route.q || ''} onQuery={q => go({page: 'search', q})} onOpen={openVideo} onNavigate={go} onUpload={() => (user ? setUploadOpen(true) : setAuthOpen(true))} maxMB={maxMB} />}
        </main>

        <footer className="site-foot">
          <div className="foot-brand"><Logo /><span>Your world, in motion.</span></div>
          <div className="foot-meta">
            <span className="foot-dot" />{storage} storage · {maxMB} MB uploads · edge delivery
          </div>
          <div className="foot-links">
            <a href="/admin">Admin</a>
            <a href="/api/health" target="_blank" rel="noreferrer">Status</a>
            <span>© {new Date().getFullYear()} ARINX</span>
          </div>
        </footer>
      </div>

      <nav className="bottom-nav glass" aria-label="Mobile">
        <button className={cx(route.page === 'home' && 'active')} onClick={() => go({page: 'home'})}><Compass size={20} /><span>Discover</span></button>
        <button className={cx(route.page === 'shorts' && 'active')} onClick={() => go({page: 'shorts'})}><Clapperboard size={20} /><span>Shorts</span></button>
        <button className="compose" onClick={() => (user ? setUploadOpen(true) : setAuthOpen(true))} aria-label="Publish"><Plus size={22} /></button>
        <button className={cx(route.page === 'library' && 'active')} onClick={() => go({page: 'library'})}><Bookmark size={20} /><span>Library</span></button>
        <button className={cx(route.page === 'search' && 'active')} onClick={() => go({page: 'search'})}><Search size={20} /><span>Search</span></button>
      </nav>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onDone={setUser} notify={notify} />
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} user={user} maxMB={maxMB} onUploaded={uploaded} onNeedAuth={() => { setUploadOpen(false); setAuthOpen(true); }} notify={notify} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} videos={videos} actions={actions} onNavigate={go} onOpenVideo={openVideo} />
      <Toasts items={toasts} onDismiss={id => setToasts(current => current.filter(toast => toast.id !== id))} />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
