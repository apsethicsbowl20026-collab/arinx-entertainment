import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Archive, ArrowRight, Check, ChevronRight, Command, Eye, EyeOff, FileVideo, Film, Globe2,
  Link2, Loader2, LockKeyhole, Mail, Play, Search, ShieldCheck, Sparkles, UploadCloud, UserRound,
  Youtube, Zap
} from 'lucide-react';
import {CATEGORIES, capturePoster, clamp, cx, detectProvider, fmtDuration, post, uploadFile} from './lib.js';
import {CloseButton, Logo, Modal} from './components.jsx';

export function AuthModal({open, onClose, onDone, notify}) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({name: '', email: '', password: ''});
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setError(''); setBusy(false); } }, [open, mode]);

  const update = key => event => setForm(current => ({...current, [key]: event.target.value}));
  const submit = async event => {
    event.preventDefault();
    setBusy(true); setError('');
    try {
      const data = await post('auth', {action: mode, ...form});
      notify(mode === 'login' ? `Welcome back, ${data.user.name}` : `Welcome to ARINX, ${data.user.name}`);
      onDone(data.user);
      onClose();
      setForm({name: '', email: '', password: ''});
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <Modal open={open} onClose={onClose} label="Account" size="auth">
      <div className="auth-split">
        <aside className="auth-brand">
          <div className="auth-orbit" aria-hidden="true"><span /><span /><span /></div>
          <Logo />
          <div className="auth-brand-copy">
            <span className="eyebrow">Your world, in motion</span>
            <h2>Blue hour,<br />every hour.</h2>
            <p>One quiet place for films, ideas, sound and code — dressed in deep blue glass.</p>
          </div>
          <ul className="auth-points">
            <li><span><UploadCloud size={14} /></span>Upload up to the storage limit — no add-ons required</li>
            <li><span><Link2 size={14} /></span>Publish YouTube, Vimeo, Archive or direct links</li>
            <li><span><ShieldCheck size={14} /></span>Private history, saved list and progress</li>
          </ul>
        </aside>
        <section className="auth-panel">
          <CloseButton onClick={onClose} />
          <div className="auth-head">
            <span className="eyebrow">{mode === 'login' ? 'Welcome back' : 'Create your space'}</span>
            <h2>{mode === 'login' ? 'Sign in to ARINX' : 'Make an account'}</h2>
            <p>{mode === 'login' ? 'Your watchlist and progress are waiting.' : 'Free, fast, and built on the edge.'}</p>
          </div>
          <div className="segmented" role="tablist" aria-label="Account action">
            <button role="tab" aria-selected={mode === 'login'} className={cx(mode === 'login' && 'active')} onClick={() => setMode('login')}>Sign in</button>
            <button role="tab" aria-selected={mode === 'register'} className={cx(mode === 'register' && 'active')} onClick={() => setMode('register')}>Create account</button>
          </div>
          <form className="auth-form" onSubmit={submit}>
            {mode === 'register' && (
              <label className="field">
                <span>Display name</span>
                <div className="field-control"><UserRound size={17} /><input value={form.name} onChange={update('name')} placeholder="How should we call you?" autoComplete="name" required minLength={2} maxLength={60} /></div>
              </label>
            )}
            <label className="field">
              <span>Email</span>
              <div className="field-control"><Mail size={17} /><input type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" autoComplete="email" required /></div>
            </label>
            <label className="field">
              <span>Password</span>
              <div className="field-control">
                <LockKeyhole size={17} />
                <input type={visible ? 'text' : 'password'} value={form.password} onChange={update('password')} placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} maxLength={200} />
                <button type="button" className="field-eye" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </label>
            {error && <div className="form-error">{error}</div>}
            <button className="btn btn-primary btn-wide" disabled={busy}>
              {busy ? <Loader2 size={18} className="spin" /> : <ArrowRight size={18} />}
              {busy ? 'One moment…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>
          <p className="auth-switch">
            {mode === 'login' ? 'First time here?' : 'Already have an account?'}
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button>
          </p>
        </section>
      </div>
    </Modal>
  );
}

export function UploadModal({open, onClose, user, maxMB = 16, onUploaded, onNeedAuth, notify}) {
  const inputRef = useRef(null);
  const [tab, setTab] = useState('file');
  const [file, setFile] = useState(null);
  const [poster, setPoster] = useState(null);
  const [duration, setDuration] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [fields, setFields] = useState({title: '', description: '', category: 'Entertainment'});
  const [link, setLink] = useState({url: '', title: '', category: 'Entertainment'});
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const posterUrl = useMemo(() => poster ? URL.createObjectURL(poster) : '', [poster]);
  useEffect(() => () => { if (posterUrl) URL.revokeObjectURL(posterUrl); }, [posterUrl]);
  useEffect(() => {
    if (!open) return;
    setTab('file'); setFile(null); setPoster(null); setDuration(0); setAnalyzing(false);
    setFields({title: '', description: '', category: 'Entertainment'});
    setLink({url: '', title: '', category: 'Entertainment'});
    setProgress(0); setBusy(false); setError('');
  }, [open]);
  const detected = detectProvider(link.url);

  const pick = async chosen => {
    if (!chosen) return;
    setError('');
    if (!/^video\//.test(chosen.type) || !/(mp4|webm|quicktime|x-m4v)/.test(chosen.type)) {
      setError('Choose an MP4, WebM or MOV video file.');
      return;
    }
    if (chosen.size > maxMB * 1048576) {
      setError(`That file is ${(chosen.size / 1048576).toFixed(1)} MB. The current limit is ${maxMB} MB — use the Link tab for larger videos.`);
      return;
    }
    setFile(chosen);
    setFields(current => ({...current, title: chosen.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').slice(0, 120)}));
    setAnalyzing(true);
    const result = await capturePoster(chosen);
    setPoster(result.poster); setDuration(result.duration); setAnalyzing(false);
  };

  const submitFile = async event => {
    event.preventDefault();
    if (!user) { onNeedAuth(); return; }
    if (!file) { setError('Choose a video file first.'); return; }
    if (!fields.title.trim()) { setError('Give your video a title.'); return; }
    setBusy(true); setError(''); setProgress(2);
    try {
      const data = new FormData();
      data.append('file', file);
      data.append('title', fields.title.trim());
      data.append('description', fields.description.trim());
      data.append('category', fields.category);
      data.append('duration', String(Math.round(duration)));
      if (poster) data.append('poster', poster, 'poster.jpg');
      const result = await uploadFile(data, setProgress);
      setProgress(100);
      notify('Video published to ARINX');
      onUploaded(result.id);
      onClose();
    } catch (err) { setError(err.message); setBusy(false); setProgress(0); }
  };

  const submitLink = async event => {
    event.preventDefault();
    if (!user) { onNeedAuth(); return; }
    if (!detected) { setError('Paste a YouTube, Vimeo, Internet Archive or direct MP4/WebM/MOV link.'); return; }
    setBusy(true); setError('');
    try {
      const data = await post('videos', {url: link.url.trim(), title: link.title.trim(), category: link.category});
      notify(`Linked from ${detected.label}`);
      onUploaded(data.id);
      onClose();
    } catch (err) { setError(err.message); setBusy(false); }
  };

  const providers = [['YouTube', Youtube], ['Vimeo', Film], ['Archive', Archive], ['Direct URL', Globe2]];

  return (
    <Modal open={open} onClose={() => { if (!busy) onClose(); }} label="Publish a video" size="upload">
      <div className="upload-head">
        <div>
          <span className="eyebrow"><Sparkles size={13} /> Publish</span>
          <h2>Add to the blue</h2>
          <p>Store a file in ARINX, or connect a video that already lives elsewhere.</p>
        </div>
        <CloseButton onClick={() => { if (!busy) onClose(); }} />
      </div>
      <div className="segmented wide" role="tablist" aria-label="Publish method">
        <button role="tab" aria-selected={tab === 'file'} className={cx(tab === 'file' && 'active')} onClick={() => { setTab('file'); setError(''); }}><UploadCloud size={16} />Upload file</button>
        <button role="tab" aria-selected={tab === 'link'} className={cx(tab === 'link' && 'active')} onClick={() => { setTab('link'); setError(''); }}><Link2 size={16} />Paste a link</button>
      </div>

      {tab === 'file' ? (
        <form className="upload-body" onSubmit={submitFile}>
          <div
            className={cx('drop-zone', dragging && 'dragging', file && 'has-file')}
            onDragOver={event => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={event => { event.preventDefault(); setDragging(false); pick(event.dataTransfer.files?.[0]); }}
          >
            <input ref={inputRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" onChange={event => pick(event.target.files?.[0])} hidden />
            {file ? (
              <div className="file-picked">
                <div className="file-poster" style={posterUrl ? {backgroundImage: `url(${posterUrl})`} : undefined}>
                  {!posterUrl && <FileVideo size={26} />}
                  {analyzing && <span className="file-scan"><Loader2 size={18} className="spin" /></span>}
                  {!!duration && <span className="chip chip-time">{fmtDuration(duration)}</span>}
                </div>
                <div className="file-copy">
                  <b>{file.name}</b>
                  <small>{(file.size / 1048576).toFixed(1)} MB · {analyzing ? 'reading duration & poster…' : 'ready to publish'}</small>
                  <button type="button" className="text-btn" onClick={() => inputRef.current?.click()}>Replace file</button>
                </div>
              </div>
            ) : (
              <>
                <span className="drop-icon"><UploadCloud size={28} /></span>
                <b>Drop your video here</b>
                <p>or <button type="button" className="inline-link" onClick={() => inputRef.current?.click()}>browse files</button> — MP4, WebM or MOV up to {maxMB} MB</p>
                <span className="drop-note">Stored directly in ARINX's database. No R2 bucket needed.</span>
              </>
            )}
          </div>
          <div className="upload-grid">
            <label className="field span-2">
              <span>Title</span>
              <div className="field-control"><input value={fields.title} onChange={event => setFields({...fields, title: event.target.value})} placeholder="A name that earns the click" maxLength={120} required /></div>
            </label>
            <label className="field span-2">
              <span>Description <em>optional</em></span>
              <div className="field-control"><textarea rows={2} value={fields.description} onChange={event => setFields({...fields, description: event.target.value})} placeholder="What should viewers know?" maxLength={5000} /></div>
            </label>
            <div className="field span-2">
              <span>Category</span>
              <div className="category-pills compact">
                {CATEGORIES.filter(category => category !== 'All').map(category => (
                  <button type="button" key={category} className={cx('pill', fields.category === category && 'active')} onClick={() => setFields({...fields, category})}>{category}</button>
                ))}
              </div>
            </div>
          </div>
          {error && <div className="form-error">{error}</div>}
          {busy && <div className="progress-meter"><i style={{width: `${progress}%`}} /><span>{progress < 100 ? `Uploading ${progress}%` : 'Finishing…'}</span></div>}
          <div className="upload-foot">
            <span className="upload-hint"><Zap size={14} />Efficient chunked storage · resumable playback</span>
            <button className="btn btn-primary" disabled={busy || analyzing || !file}>{busy ? <Loader2 size={17} className="spin" /> : <UploadCloud size={17} />}{busy ? 'Publishing…' : 'Publish video'}</button>
          </div>
        </form>
      ) : (
        <form className="upload-body" onSubmit={submitLink}>
          <label className="field">
            <span>Video link</span>
            <div className="field-control">
              <Link2 size={17} />
              <input value={link.url} onChange={event => setLink({...link, url: event.target.value})} placeholder="https://www.youtube.com/watch?v=…" required />
              {detected && <span className="detect-badge"><Check size={13} />{detected.label}</span>}
            </div>
          </label>
          <div className="provider-row">
            {providers.map(([name, Icon]) => <span key={name} className="provider-chip"><Icon size={15} />{name}</span>)}
          </div>
          <div className="link-note glass">
            <Globe2 size={18} />
            <div>
              <b>Streams from the original host</b>
              <p>YouTube and Vimeo play in a private embed, Internet Archive streams in its own player, and direct MP4/WebM links are redirected to the source. Nothing is copied.</p>
            </div>
          </div>
          <div className="upload-grid">
            <label className="field">
              <span>Title <em>optional — we fetch it when we can</em></span>
              <div className="field-control"><input value={link.title} onChange={event => setLink({...link, title: event.target.value})} placeholder="Leave blank to auto-detect" maxLength={120} /></div>
            </label>
            <label className="field">
              <span>Category</span>
              <div className="field-control">
                <select value={link.category} onChange={event => setLink({...link, category: event.target.value})}>
                  {CATEGORIES.filter(category => category !== 'All').map(category => <option key={category}>{category}</option>)}
                </select>
              </div>
            </label>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="upload-foot">
            <span className="upload-hint"><ShieldCheck size={14} />Rights stay with the original creator</span>
            <button className="btn btn-primary" disabled={busy || !detected}>{busy ? <Loader2 size={17} className="spin" /> : <ArrowRight size={17} />}{busy ? 'Connecting…' : 'Add to ARINX'}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export function CommandPalette({open, onClose, videos, actions, onNavigate, onOpenVideo}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  useEffect(() => { if (open) { setQuery(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 30); } }, [open]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const actionItems = actions
      .filter(action => !q || `${action.label} ${action.hint || ''}`.toLowerCase().includes(q))
      .map(action => ({kind: 'action', ...action}));
    const videoItems = videos
      .filter(video => !q || `${video.title} ${video.author} ${video.category}`.toLowerCase().includes(q))
      .slice(0, q ? 8 : 5)
      .map(video => ({kind: 'video', video, id: `video-${video.id}`, label: video.title, hint: `${video.author || 'ARINX'} · ${video.category}`}));
    const goItems = onNavigate && !q ? [
      {kind: 'go', id: 'go-home', label: 'Discover', hint: 'Home', run: () => onNavigate({page: 'home'})},
      {kind: 'go', id: 'go-shorts', label: 'Shorts', hint: 'Vertical feed', run: () => onNavigate({page: 'shorts'})},
      {kind: 'go', id: 'go-library', label: 'Library', hint: 'History & saved', run: () => onNavigate({page: 'library'})}
    ] : [];
    return [...goItems, ...actionItems, ...videoItems];
  }, [query, actions, videos, onNavigate]);

  useEffect(() => { setActive(current => clamp(current, 0, Math.max(items.length - 1, 0))); }, [items.length]);

  if (!open) return null;
  const run = item => {
    if (!item) return;
    onClose();
    if (item.kind === 'video') onOpenVideo(item.video);
    else item.run?.();
  };
  const onKeyDown = event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setActive(index => Math.min(index + 1, items.length - 1)); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); setActive(index => Math.max(index - 1, 0)); }
    else if (event.key === 'Enter') { event.preventDefault(); run(items[active]); }
    else if (event.key === 'Escape') onClose();
  };
  let group = '';
  return (
    <div className="palette-layer" role="dialog" aria-modal="true" aria-label="Command palette">
      <button className="modal-scrim" aria-label="Close" onClick={onClose} />
      <div className="palette">
        <div className="palette-input">
          <Search size={19} />
          <input ref={inputRef} value={query} onChange={event => { setQuery(event.target.value); setActive(0); }} onKeyDown={onKeyDown} placeholder="Search videos, jump anywhere, run a command…" aria-label="Search" />
          <span className="key">ESC</span>
        </div>
        <div className="palette-list">
          {items.length === 0 && <div className="palette-empty"><Command size={20} /><span>Nothing matches “{query}”.</span></div>}
          {items.map((item, index) => {
            const heading = item.kind !== group ? (item.kind === 'video' ? 'Videos' : item.kind === 'go' ? 'Jump to' : 'Actions') : null;
            group = item.kind;
            return (
              <React.Fragment key={item.id}>
                {heading && <span className="palette-heading">{heading}</span>}
                <button className={cx('palette-row', index === active && 'active')} onMouseEnter={() => setActive(index)} onClick={() => run(item)}>
                  <span className="palette-icon">
                    {item.kind === 'video' ? (item.video.thumb ? <img src={item.video.thumb} alt="" /> : <Play size={15} />) : item.icon ? <item.icon size={16} /> : <ChevronRight size={16} />}
                  </span>
                  <span className="palette-copy"><b>{item.label}</b>{item.hint && <small>{item.hint}</small>}</span>
                  <ChevronRight size={15} className="palette-arrow" />
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="palette-foot">
          <span><span className="key">↑</span><span className="key">↓</span> navigate</span>
          <span><span className="key">↵</span> open</span>
          <span className="palette-brand"><Logo small word={false} /> ARINX command</span>
        </div>
      </div>
    </div>
  );
}
