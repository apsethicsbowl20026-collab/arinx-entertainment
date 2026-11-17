import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ArrowUpRight, Bookmark, ChevronRight, Clapperboard, Clock3, Compass, Flame, Globe2, Heart,
  Link2, Play, Plus, Search, Sparkles, ThumbsUp, UploadCloud, UsersRound, Video, Volume2, VolumeX, Zap
} from 'lucide-react';
import {CATEGORIES, cx, fmtDuration, greeting, timeAgo, wideThumb} from './lib.js';
import {Avatar, CategoryPills, EmptyState, ProgressRow, Rail, Stat, Thumb, VideoCard} from './components.jsx';

export function Home({videos, progress, saved, onOpen, onNavigate, onUpload, user, maxMB, onToggleSave, notify}) {
  const featured = videos.find(video => video.id === 'commons-1') || videos.find(video => video.thumb) || videos[0];
  const managed = videos.filter(video => video.provider !== 'commons');
  const rest = videos.filter(video => video.provider === 'commons');
  const ordered = [...managed, ...rest];
  const continueList = Object.entries(progress)
    .map(([id, entry]) => ({video: videos.find(v => v.id === id), entry}))
    .filter(item => item.video && item.entry.t > 5 && (!item.entry.d || item.entry.t < item.entry.d - 12))
    .sort((a, b) => (b.entry.at || 0) - (a.entry.at || 0))
    .slice(0, 8);
  const counts = useMemo(() => videos.reduce((acc, video) => { acc[video.category] = (acc[video.category] || 0) + 1; return acc; }, {}), [videos]);
  const rail = category => ordered.filter(video => video.category === category);
  const authors = useMemo(() => {
    const seen = new Map();
    for (const video of videos) if (video.author && !seen.has(video.author)) seen.set(video.author, video);
    return [...seen.values()].slice(0, 5);
  }, [videos]);

  return (
    <div className="home">
      <section className="hero-grid">
        {featured && (
          <article className="hero-card">
            {wideThumb(featured) && <img className="hero-art" src={wideThumb(featured)} alt="" />}
            <span className="hero-veil" />
            <div className="hero-top">
              <span className="hero-tag"><Sparkles size={13} />Featured tonight</span>
              <span className="hero-license">{featured.license || 'ARINX'}</span>
            </div>
            <div className="hero-copy">
              <span className="eyebrow">Now showing · {featured.category}</span>
              <h1>{featured.title}</h1>
              <p>{featured.author || 'ARINX'} {featured.durationSec ? `· ${fmtDuration(featured.durationSec)}` : ''}</p>
              <div className="hero-actions">
                <button className="btn btn-primary btn-lg" onClick={() => onOpen(featured)}><Play size={18} fill="currentColor" />Play now</button>
                <button className="btn btn-glass btn-lg" onClick={() => onNavigate({page: 'shorts'})}><Clapperboard size={17} />Shorts</button>
              </div>
            </div>
            <span className="hero-glow" aria-hidden="true" />
          </article>
        )}
        <div className="hero-side">
          <div className="glass hero-stat">
            <span className="eyebrow">In orbit</span>
            <div className="hero-metrics">
              <div><b>{videos.length}</b><small>videos</small></div>
              <div><b>{Object.keys(counts).length}</b><small>worlds</small></div>
              <div><b>{maxMB}<i>MB</i></b><small>uploads</small></div>
            </div>
            <div className="signal" aria-hidden="true">
              {Array.from({length: 32}).map((_, index) => (
                <i key={index} style={{'--h': `${16 + ((index * 37) % 72)}%`, '--d': `${(index % 11) * 0.09}s`}} />
              ))}
            </div>
            <p>Chunked database storage keeps uploads playable without extra cloud services.</p>
          </div>
          <button className="glass hero-tile" onClick={onUpload}>
            <span className="tile-icon"><UploadCloud size={19} /></span>
            <span className="tile-copy"><b>Publish something</b><small>Upload a file or link a video</small></span>
            <ArrowUpRight size={17} />
          </button>
          <button className="glass hero-tile" onClick={() => onNavigate({page: 'shorts'})}>
            <span className="tile-stack" aria-hidden="true">
              {ordered.slice(0, 3).map(video => <Thumb key={video.id} video={video} />)}
            </span>
            <span className="tile-copy"><b>Shorts, vertically</b><small>A calmer kind of scroll</small></span>
            <ArrowUpRight size={17} />
          </button>
        </div>
      </section>

      <div className="home-greeting">
        <div>
          <span className="eyebrow">{greeting()}{user ? `, ${user.name.split(' ')[0]}` : ''}</span>
          <h2>Pick a frequency.</h2>
        </div>
        <div className="header-stats">
          <Stat icon={Video} value={videos.length} label="videos" />
          <Stat icon={UsersRound} value={`${authors.length}+`} label="curators" />
          <Stat icon={Zap} value="Edge" label="delivery" />
        </div>
      </div>

      {continueList.length > 0 && (
        <Rail title="Continue watching" eyebrow="Pick up where you left off">
          {continueList.map(({video, entry}) => (
            <ProgressRow key={video.id} video={video} percent={entry.d ? (entry.t / entry.d) * 100 : 0} onOpen={onOpen} />
          ))}
        </Rail>
      )}

      <Rail title="Trending now" eyebrow="What the room is watching" onMore={() => onNavigate({page: 'search'})}>
        {ordered.slice(0, 10).map((video, index) => <VideoCard key={video.id} video={video} onOpen={onOpen} index={index} />)}
      </Rail>

      <section className="mood-grid">
        <div className="glass mood-card">
          <span className="eyebrow"><Compass size={13} />Explore by mood</span>
          <h3>Follow the blue.</h3>
          <div className="mood-chips">
            {CATEGORIES.filter(category => category !== 'All' && counts[category]).map(category => (
              <button key={category} className="mood-chip" onClick={() => onNavigate({page: 'search', q: category})}>
                {category}<span>{counts[category] || 0}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="glass curator-card">
          <span className="eyebrow"><UsersRound size={13} />The room</span>
          <div className="avatar-stack">{authors.map(author => <Avatar key={author.author} name={author.author} size={44} />)}</div>
          <h3>Built by people who love the frame.</h3>
          <p>{managed.length ? `${managed.length} ARINX upload${managed.length === 1 ? '' : 's'} and counting.` : 'The commons shelf is open — add the first ARINX upload.'}</p>
          <div className="curator-actions">
            <button className="btn btn-primary" onClick={onUpload}><Plus size={16} />Add yours</button>
            <button className="btn btn-glass" onClick={() => onNavigate({page: 'library'})}><Bookmark size={15} />Your library</button>
          </div>
        </div>
      </section>

      {rail('Music').length > 0 && <Rail title="Sound & motion" eyebrow="Music" onMore={() => onNavigate({page: 'search', q: 'Music'})}>{rail('Music').map((video, i) => <VideoCard key={video.id} video={video} onOpen={onOpen} index={i} />)}</Rail>}
      {rail('Education').length > 0 && <Rail title="Learn something new" eyebrow="Education" onMore={() => onNavigate({page: 'search', q: 'Education'})}>{rail('Education').map((video, i) => <VideoCard key={video.id} video={video} onOpen={onOpen} index={i} />)}</Rail>}
      {rail('Animation').length > 0 && <Rail title="Motion & animation" eyebrow="Frame by frame" onMore={() => onNavigate({page: 'search', q: 'Animation'})}>{rail('Animation').map((video, i) => <VideoCard key={video.id} video={video} onOpen={onOpen} index={i} />)}</Rail>}

      <section className="publish-banner glass">
        <div>
          <span className="eyebrow"><Sparkles size={13} />Your turn</span>
          <h2>Bring your own signal.</h2>
          <p>Upload up to {maxMB} MB straight into ARINX, or paste a link from YouTube, Vimeo, Internet Archive or any direct video URL.</p>
        </div>
        <div className="publish-actions">
          <button className="btn btn-primary btn-lg" onClick={onUpload}><UploadCloud size={18} />Publish a video</button>
          {!user && <button className="btn btn-glass btn-lg" onClick={() => onNavigate({openAuth: true})}>Sign in first</button>}
        </div>
        <span className="banner-orbit" aria-hidden="true" />
      </section>
    </div>
  );
}

function ShortSlide({video, muted, onToggleMute, onOpen, saved, onToggleSave, onLike}) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(true);
  const isEmbed = !!video.embed;
  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    node.muted = muted;
    node.play().catch(() => setPlaying(false));
  }, [muted]);
  const toggle = () => {
    const node = videoRef.current;
    if (!node) { onOpen(video); return; }
    if (node.paused) { node.play(); setPlaying(true); } else { node.pause(); setPlaying(false); }
  };
  return (
    <article className="short">
      {!isEmbed && video.thumb && <img className="short-bg" src={video.thumb} alt="" aria-hidden="true" />}
      {isEmbed ? (
        <iframe className="short-media" src={video.embed.url} title={video.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
      ) : (
        <video ref={videoRef} className="short-media" src={video.url} poster={video.thumb || undefined} muted={muted} loop playsInline preload="metadata" onClick={toggle} />
      )}
      <span className="short-veil" />
      <div className="short-top">
        <span className="hero-tag"><Clapperboard size={13} />Short</span>
        <button className="icon-btn glass tiny" onClick={onToggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
      </div>
      <div className="short-copy">
        <div className="short-author"><Avatar name={video.author || 'ARINX'} size={34} /><div><b>{video.author || 'ARINX'}</b><small>{video.category}</small></div></div>
        <h3>{video.title}</h3>
        <div className="short-meta">{video.durationSec ? `${fmtDuration(video.durationSec)} · ` : ''}{video.createdAt ? timeAgo(video.createdAt) : video.license}</div>
      </div>
      <div className="short-actions">
        <button className={cx('short-action', saved && 'active')} onClick={() => onToggleSave(video)} aria-label="Save"><Bookmark size={21} /><span>{saved ? 'Saved' : 'Save'}</span></button>
        <button className="short-action" onClick={() => onLike(video)} aria-label="Like"><Heart size={21} /><span>Like</span></button>
        <button className="short-action" onClick={() => onOpen(video)} aria-label="Open"><ArrowUpRight size={21} /><span>Watch</span></button>
      </div>
      {!playing && !isEmbed && <button className="short-pause" onClick={toggle} aria-label="Play"><Play size={26} fill="currentColor" /></button>}
    </article>
  );
}

export function Shorts({videos, saved, onOpen, onToggleSave, onLike}) {
  const [muted, setMuted] = useState(true);
  const list = useMemo(() => {
    const playable = videos.filter(video => video.url || video.embed);
    const preferred = playable.filter(video => ['Music', 'Animation', 'Sports', 'Science', 'Coding'].includes(video.category));
    return [...preferred, ...playable.filter(video => !preferred.includes(video))].slice(0, 14);
  }, [videos]);
  return (
    <div className="shorts-page">
      <header className="shorts-head">
        <div>
          <span className="eyebrow"><Clapperboard size={13} />Vertical feed</span>
          <h1>Shorts</h1>
        </div>
        <button className="btn btn-glass" onClick={() => setMuted(value => !value)}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}{muted ? 'Sound off' : 'Sound on'}</button>
      </header>
      <div className="shorts-feed">
        {list.map(video => <ShortSlide key={video.id} video={video} muted={muted} onToggleMute={() => setMuted(value => !value)} onOpen={onOpen} saved={saved.includes(video.id)} onToggleSave={onToggleSave} onLike={onLike} />)}
      </div>
      {list.length === 0 && <EmptyState icon={Clapperboard} title="No shorts yet" text="Publish a vertical clip to start the feed." />}
    </div>
  );
}

export function Library({videos, user, progress, saved, history, liked, onOpen, onUpload, onNeedAuth, initialTab, onNavigate}) {
  const [tab, setTab] = useState(initialTab || 'history');
  useEffect(() => { if (initialTab) setTab(initialTab); }, [initialTab]);
  const byId = useMemo(() => new Map(videos.map(video => [video.id, video])), [videos]);
  const progressList = Object.entries(progress).map(([id, entry]) => ({video: byId.get(id), entry})).filter(item => item.video).sort((a, b) => (b.entry.at || 0) - (a.entry.at || 0));
  const savedList = saved.map(id => byId.get(id)).filter(Boolean);
  const likedList = liked.map(id => byId.get(id)).filter(Boolean);
  const mine = videos.filter(video => video.creatorId && video.creatorId === user?.id);
  const tabs = [
    {id: 'history', label: 'History', icon: Clock3, count: progressList.length},
    {id: 'saved', label: 'Watch later', icon: Bookmark, count: savedList.length},
    {id: 'liked', label: 'Liked', icon: ThumbsUp, count: likedList.length},
    {id: 'mine', label: 'Your videos', icon: Video, count: mine.length}
  ];
  const show = list => list.length ? (
    <div className="video-grid">
      {list.map((video, index) => {
        const entry = progress[video.id];
        return <VideoCard key={video.id} video={video} onOpen={onOpen} index={index} progress={entry?.d ? (entry.t / entry.d) * 100 : 0} />;
      })}
    </div>
  ) : null;

  return (
    <div className="library-page">
      <header className="page-head">
        <div>
          <span className="eyebrow">{user ? `Signed in as ${user.name}` : 'Local to this browser'}</span>
          <h1>Your library</h1>
          <p>Everything you've watched, saved and made — kept quietly on this device until you sign in.</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={onUpload}><Plus size={17} />Publish</button>
      </header>
      <div className="segmented tabs" role="tablist" aria-label="Library sections">
        {tabs.map(({id, label, icon: Icon, count}) => (
          <button key={id} role="tab" aria-selected={tab === id} className={cx(tab === id && 'active')} onClick={() => setTab(id)}>
            <Icon size={16} />{label}<span className="tab-count">{count}</span>
          </button>
        ))}
      </div>
      {tab === 'history' && (progressList.length ? (
        <div className="continue-grid">
          {progressList.map(({video, entry}) => <ProgressRow key={video.id} video={video} percent={entry.d ? (entry.t / entry.d) * 100 : 0} onOpen={onOpen} />)}
        </div>
      ) : <EmptyState icon={Clock3} title="Nothing watched yet" text="Start a video and it will show up here with your exact position." action="Discover videos" onAction={() => onNavigate({page: 'home'})} />)}
      {tab === 'saved' && (savedList.length ? show(savedList) : <EmptyState icon={Bookmark} title="Your watch later is empty" text="Tap the bookmark on any video to keep it for later." action="Find something" onAction={() => onNavigate({page: 'search'})} />)}
      {tab === 'liked' && (likedList.length ? show(likedList) : <EmptyState icon={ThumbsUp} title="No likes yet" text="Likes are a quiet nod. Give one to a video you love." action="Browse" onAction={() => onNavigate({page: 'search'})} />)}
      {tab === 'mine' && (!user ? <EmptyState icon={UsersRound} title="Sign in to see your uploads" text="Your published videos live with your ARINX account." action="Sign in" onAction={onNeedAuth} /> : mine.length ? show(mine) : <EmptyState icon={UploadCloud} title="You haven't published yet" text="Upload a file or link a video from another platform." action="Publish a video" onAction={onUpload} />)}
    </div>
  );
}

export function SearchPage({videos, query, onQuery, onOpen, onNavigate, onUpload, maxMB}) {
  const [draft, setDraft] = useState(query || '');
  const [category, setCategory] = useState('All');
  useEffect(() => { setDraft(query || ''); }, [query]);
  const counts = useMemo(() => videos.reduce((acc, video) => { acc[video.category] = (acc[video.category] || 0) + 1; return acc; }, {All: videos.length}), [videos]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return videos.filter(video => {
      if (category !== 'All' && video.category !== category) return false;
      if (!q) return true;
      return `${video.title} ${video.author} ${video.category} ${video.description} ${video.provider}`.toLowerCase().includes(q);
    });
  }, [videos, query, category]);
  return (
    <div className="search-page">
      <header className="page-head">
        <div>
          <span className="eyebrow"><Search size={13} />Search the archive</span>
          <h1>{query ? <>Results for <em>“{query}”</em></> : 'Browse everything'}</h1>
          <p>{results.length} video{results.length === 1 ? '' : 's'} {category !== 'All' ? `in ${category}` : 'across the blue'}.</p>
        </div>
      </header>
      <form className="search-hero glass" onSubmit={event => { event.preventDefault(); onQuery(draft.trim()); }}>
        <Search size={20} />
        <input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Titles, creators, categories, sources…" aria-label="Search" />
        <button className="btn btn-primary">Search</button>
      </form>
      <CategoryPills value={category} onChange={setCategory} counts={counts} />
      {results.length ? (
        <div className="video-grid wide">
          {results.map((video, index) => <VideoCard key={video.id} video={video} onOpen={onOpen} index={index} />)}
        </div>
      ) : (
        <EmptyState icon={Search} title="No match in this orbit" text={`Nothing matched “${query}”. Try a broader term, or bring it in yourself.`} action={`Upload or link a video (${maxMB} MB)`} onAction={onUpload} />
      )}
    </div>
  );
}
