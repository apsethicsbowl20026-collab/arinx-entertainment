import React, {useEffect, useRef, useState} from 'react';
import {
  Bookmark, Check, ChevronLeft, ChevronRight, Clock3, Play, Share2, Sparkles, X
} from 'lucide-react';
import {CATEGORIES, avatarGradient, clamp, fmtCount, fmtDuration, providerLabel, thumbGradient, timeAgo, initials, cx} from './lib.js';

export function Logo({word = true, small = false}) {
  return (
    <span className={cx('logo', small && 'logo-sm')}>
      <span className="logo-mark" aria-hidden="true"><i /><b>A</b></span>
      {word && <span className="logo-word">ARINX<span className="logo-dot">.</span></span>}
    </span>
  );
}

export function Avatar({name, size = 36, className = ''}) {
  return (
    <span className={cx('avatar', className)} style={{width: size, height: size, fontSize: Math.max(11, size * 0.34), backgroundImage: avatarGradient(name)}} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function Thumb({video, children, className = ''}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [video.id, video.thumb]);
  const showImage = video.thumb && !failed;
  return (
    <div className={cx('thumb', className)} style={!showImage ? {backgroundImage: thumbGradient(video.id || video.title)} : undefined}>
      {showImage && <img src={video.thumb} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />}
      {!showImage && <span className="thumb-mark" aria-hidden="true"><Play size={22} fill="currentColor" /></span>}
      <span className="thumb-shine" aria-hidden="true" />
      {!!video.durationSec && <span className="chip chip-time">{fmtDuration(video.durationSec)}</span>}
      {children}
    </div>
  );
}

export function VideoCard({video, onOpen, index = 0, progress = 0, dense = false}) {
  const label = providerLabel(video);
  return (
    <article className={cx('card', dense && 'card-dense')} style={{'--i': clamp(index, 0, 14)}}>
      <button className="card-hit" onClick={() => onOpen(video)} aria-label={`Play ${video.title}`}>
        <Thumb video={video} className="card-thumb">
          <span className="card-play"><Play size={20} fill="currentColor" /></span>
          {label && <span className={cx('badge', 'provider', `provider-${label.toLowerCase().replace(/\s+/g, '-')}`)}>{label}</span>}
          {progress > 0 && <span className="card-progress"><i style={{width: `${clamp(progress, 2, 100)}%`}} /></span>}
        </Thumb>
      </button>
      <div className="card-body">
        <Avatar name={video.author || 'ARINX'} size={34} />
        <div className="card-copy">
          <h3><button onClick={() => onOpen(video)}>{video.title}</button></h3>
          <p className="card-author">{video.author || 'ARINX creator'}</p>
          <p className="card-meta">{video.category}<span aria-hidden="true"> · </span>{video.createdAt ? timeAgo(video.createdAt) : (video.license || 'Open licensed')}</p>
        </div>
      </div>
    </article>
  );
}

export function Rail({title, eyebrow, onMore, children, id}) {
  const track = useRef(null);
  const nudge = direction => track.current?.scrollBy({left: direction * Math.max(320, track.current.clientWidth * 0.75), behavior: 'smooth'});
  return (
    <section className="shelf" id={id}>
      <header className="section-head">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
        </div>
        <div className="rail-tools">
          <button className="icon-btn ghost tiny" onClick={() => nudge(-1)} aria-label="Scroll left"><ChevronLeft size={18} /></button>
          <button className="icon-btn ghost tiny" onClick={() => nudge(1)} aria-label="Scroll right"><ChevronRight size={18} /></button>
          {onMore && <button className="text-btn" onClick={onMore}>View all <ChevronRight size={15} /></button>}
        </div>
      </header>
      <div className="rail-track" ref={track}>{children}</div>
    </section>
  );
}

export function Modal({open, onClose, children, label, size = 'md'}) {
  useEffect(() => {
    if (!open) return;
    const onKey = event => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-layer" role="dialog" aria-modal="true" aria-label={label}>
      <button className="modal-scrim" aria-label="Close" onClick={onClose} />
      <div className={cx('modal', `modal-${size}`)}>{children}</div>
    </div>
  );
}

export function CloseButton({onClick, label = 'Close'}) {
  return <button className="icon-btn ghost modal-close" onClick={onClick} aria-label={label}><X size={19} /></button>;
}

export function Toasts({items, onDismiss}) {
  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map(toast => (
        <div key={toast.id} className={cx('toast', toast.kind)}>
          <span className="toast-icon">{toast.kind === 'error' ? <X size={15} /> : toast.kind === 'save' ? <Bookmark size={15} /> : <Check size={15} />}</span>
          <span>{toast.message}</span>
          <button onClick={() => onDismiss(toast.id)} aria-label="Dismiss"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({icon: Icon = Sparkles, title, text, action, onAction}) {
  return (
    <div className="empty glass">
      <span className="empty-icon"><Icon size={26} /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action && <button className="btn btn-primary" onClick={onAction}>{action}</button>}
    </div>
  );
}

export function CategoryPills({value, onChange, counts = {}}) {
  return (
    <div className="category-pills" role="tablist" aria-label="Categories">
      {CATEGORIES.filter(category => category === 'All' || !counts[category] || counts[category] > 0).map(category => (
        <button key={category} role="tab" aria-selected={value === category} className={cx('pill', value === category && 'active')} onClick={() => onChange(category)}>
          {category}
          {counts[category] ? <span className="pill-count">{counts[category]}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Stat({icon: Icon, value, label}) {
  return (
    <div className="stat">
      <span className="stat-icon"><Icon size={17} /></span>
      <span className="stat-copy"><b>{value}</b><small>{label}</small></span>
    </div>
  );
}

export function ProgressRow({video, percent, onOpen, onRemove}) {
  return (
    <div className="progress-row glass">
      <button className="progress-thumb" onClick={() => onOpen(video)} aria-label={`Resume ${video.title}`}>
        <Thumb video={video} />
        <span className="resume-play"><Play size={18} fill="currentColor" /></span>
      </button>
      <div className="progress-copy">
        <button className="progress-title" onClick={() => onOpen(video)}>{video.title}</button>
        <span className="card-meta">{video.author || 'ARINX'} · {Math.round(percent)}% watched</span>
        <span className="progress-track"><i style={{width: `${clamp(percent, 2, 100)}%`}} /></span>
      </div>
      {onRemove && <button className="icon-btn ghost tiny" onClick={() => onRemove(video.id)} aria-label="Remove from history"><X size={15} /></button>}
    </div>
  );
}

export function VideoRow({video, onOpen, meta}) {
  return (
    <button className="video-row" onClick={() => onOpen(video)}>
      <Thumb video={video} className="video-row-thumb" />
      <span className="video-row-copy">
        <b>{video.title}</b>
        <small>{video.author || 'ARINX'}</small>
        <small className="muted">{meta || `${video.category} · ${video.createdAt ? timeAgo(video.createdAt) : video.license}`}</small>
      </span>
      <ChevronRight size={17} className="video-row-arrow" />
    </button>
  );
}

export function formatClock(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

export {Clock3, Share2, fmtCount};
