import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ArrowLeft, Bookmark, Check, ChevronDown, Clock3, Copy, ExternalLink, Globe2,
  Maximize2, MessageCircle, Minimize2, Pause, Play, Send, Share2, Sparkles, ThumbsUp,
  Volume2, VolumeX
} from 'lucide-react';
import {api, clamp, cx, fmtCount, fmtDuration, post, read, providerLabel, timeAgo, wideThumb, write} from './lib.js';
import {Avatar, EmptyState, VideoRow, formatClock} from './components.jsx';

function Player({video, startAt, onProgress, onEnded, cinema, setCinema, notify}) {
  const shell = useRef(null);
  const media = useRef(null);
  const lastSave = useRef(0);
  const hideTimer = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(startAt || 0);
  const [duration, setDuration] = useState(video.durationSec || 0);
  const [muted, setMuted] = useState(false);
  const [chrome, setChrome] = useState(true);
  const [failed, setFailed] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setPlaying(false); setCurrent(0); setDuration(video.durationSec || 0); setFailed(false); setStarted(false); lastSave.current = 0;
  }, [video.id]);

  useEffect(() => {
    const onKey = event => {
      if (video.embed || !media.current) return;
      const tag = event.target.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || event.target.isContentEditable) return;
      if (event.code === 'Space') { event.preventDefault(); toggle(); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); media.current.currentTime = clamp(media.current.currentTime + 5, 0, media.current.duration || 0); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); media.current.currentTime = clamp(media.current.currentTime - 5, 0, media.current.duration || 0); }
      else if (event.key.toLowerCase() === 'm') setMuted(value => !value);
      else if (event.key.toLowerCase() === 'f') goFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (!media.current) return;
    media.current.muted = muted;
  }, [muted, video.id]);

  const reveal = () => {
    setChrome(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { if (media.current && !media.current.paused) setChrome(false); }, 2400);
  };
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  const toggle = () => {
    const node = media.current;
    if (!node) return;
    if (node.paused) node.play().catch(() => notify('Your browser blocked playback. Press play again.', 'error'));
    else node.pause();
  };
  const goFullscreen = () => {
    if (!shell.current) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else shell.current.requestFullscreen?.().catch(() => {});
  };
  const seek = event => {
    const node = media.current;
    if (!node || !node.duration) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    node.currentTime = ratio * node.duration;
    setCurrent(node.currentTime);
  };
  const onLoaded = () => {
    const node = media.current;
    if (!node) return;
    setDuration(node.duration || video.durationSec || 0);
    if (!started && startAt > 5 && (!node.duration || startAt < node.duration - 10)) {
      node.currentTime = startAt;
      setCurrent(startAt);
      notify(`Resumed at ${formatClock(startAt)}`, 'save');
    }
    setStarted(true);
  };
  const onTime = () => {
    const node = media.current;
    if (!node) return;
    setCurrent(node.currentTime);
    if (Math.abs(node.currentTime - lastSave.current) > 4) {
      lastSave.current = node.currentTime;
      onProgress(node.currentTime, node.duration || video.durationSec || 0);
    }
  };
  const pct = duration ? clamp((current / duration) * 100, 0, 100) : 0;
  const label = providerLabel(video);

  if (video.embed) {
    return (
      <div className="player player-embed glass">
        <div className="embed-frame">
          <iframe src={video.embed.url} title={video.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen loading="lazy" />
        </div>
        <div className="embed-foot">
          <span className="badge provider">{label}</span>
          <span>Streaming from the original host</span>
          {video.sourceUrl && <a href={video.sourceUrl} target="_blank" rel="noreferrer noopener">Open source <ExternalLink size={12} /></a>}
        </div>
      </div>
    );
  }

  return (
    <div className={cx('player', playing && 'is-playing', chrome && 'chrome-visible', failed && 'has-error')} ref={shell} onMouseMove={reveal} onMouseLeave={() => playing && setChrome(false)}>
      {!failed ? (
        <video
          ref={media}
          className="player-media"
          src={video.url}
          poster={wideThumb(video) || undefined}
          playsInline
          preload="metadata"
          onClick={toggle}
          onDoubleClick={goFullscreen}
          onLoadedMetadata={onLoaded}
          onTimeUpdate={onTime}
          onPlay={() => { setPlaying(true); reveal(); }}
          onPause={() => { setPlaying(false); setChrome(true); clearTimeout(hideTimer.current); }}
          onEnded={() => { setPlaying(false); setChrome(true); onEnded(); }}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="player-error">
          <Globe2 size={28} />
          <b>This file could not be played here.</b>
          <p>It may have been removed, or your browser does not support its codec.</p>
          {video.sourceUrl && <a className="btn btn-glass" href={video.sourceUrl} target="_blank" rel="noreferrer noopener">Open original <ExternalLink size={14} /></a>}
        </div>
      )}
      <span className="player-vignette" aria-hidden="true" />
      <div className="player-top">
        <span className="badge provider">{label}</span>
        {video.license && <span className="player-license">{video.license}</span>}
      </div>
      {!playing && !failed && (
        <button className="player-big" onClick={toggle} aria-label={current > 0 ? 'Resume' : 'Play'}>
          <Play size={30} fill="currentColor" />
          <span>{current > 0 ? `Resume at ${formatClock(current)}` : 'Play'}</span>
        </button>
      )}
      <div className="player-chrome">
        <div
          className="seek"
          onClick={seek}
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(current)}
          onKeyDown={event => {
            if (!media.current) return;
            if (event.key === 'ArrowRight') media.current.currentTime += 5;
            if (event.key === 'ArrowLeft') media.current.currentTime -= 5;
          }}
        >
          <span className="seek-track"><i style={{width: `${pct}%`}} /></span>
          <span className="seek-knob" style={{left: `${pct}%`}} />
        </div>
        <div className="player-controls">
          <button className="player-btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button>
          <button className="player-btn" onClick={() => setMuted(value => !value)} aria-label={muted ? 'Unmute' : 'Mute'}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
          <span className="player-time">{formatClock(current)} <i>/</i> {formatClock(duration)}</span>
          <span className="player-spacer" />
          <span className="player-kbd"><kbd>space</kbd> play <kbd>←</kbd><kbd>→</kbd> seek <kbd>m</kbd> mute</span>
          <button className={cx('player-btn', cinema && 'on')} onClick={() => setCinema(value => !value)} aria-label="Cinema mode">{cinema ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
          <button className="player-btn" onClick={goFullscreen} aria-label="Fullscreen"><Maximize2 size={17} /></button>
        </div>
      </div>
    </div>
  );
}

export function Watch({video, videos, user, liked, saved, progress, onProgress, onToggleSave, onToggleLike, onNavigate, onAuth, notify, cinema, setCinema}) {
  const [likes, setLikes] = useState({count: 0, liked: !!liked});
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [autoplay, setAutoplay] = useState(() => read('arinx.autoplay', true));
  const [copied, setCopied] = useState(false);

  const related = useMemo(() => {
    if (!video) return [];
    const same = videos.filter(item => item.id !== video.id && item.category === video.category);
    const others = videos.filter(item => item.id !== video.id && item.category !== video.category);
    return [...same, ...others].slice(0, 9);
  }, [video, videos]);
  const next = related[0];

  useEffect(() => {
    if (!video) return;
    let alive = true;
    setLikes({count: 0, liked: !!liked});
    api(`videos/${video.id}/likes`).then(data => alive && setLikes({count: data.count, liked: data.liked || !!liked})).catch(() => {});
    setCommentsLoading(true);
    api(`videos/${video.id}/comments`).then(data => { if (alive) { setComments(data.comments || []); setCommentsLoading(false); } }).catch(() => alive && setCommentsLoading(false));
    setExpanded(false);
    return () => { alive = false; };
  }, [video?.id]);

  useEffect(() => {
    if (!video?.creatorId || !user || video.creatorId === user.id) { setSubscribed(false); return; }
    let alive = true;
    api(`subscriptions/${video.creatorId}`).then(data => alive && setSubscribed(!!data.subscribed)).catch(() => {});
    return () => { alive = false; };
  }, [video?.creatorId, user?.id]);

  useEffect(() => { write('arinx.autoplay', autoplay); }, [autoplay]);
  useEffect(() => { const timeout = setTimeout(() => setCopied(false), 2200); return () => clearTimeout(timeout); }, [copied]);

  if (!video) {
    return <EmptyState icon={Sparkles} title="This video drifted away" text="It may have been removed by its creator, or the link is incomplete." action="Back to discover" onAction={() => onNavigate({page: 'home'})} />;
  }

  const toggleLike = async () => {
    if (!user) return onAuth();
    try {
      const data = await post(`videos/${video.id}/likes`);
      const nextLiked = !likes.liked;
      setLikes({count: Math.max(0, likes.count + (nextLiked ? 1 : -1)), liked: nextLiked});
      onToggleLike(video.id, nextLiked);
    } catch (error) { notify(error.message, 'error'); }
  };
  const toggleSubscribe = async () => {
    if (!user) return onAuth();
    try {
      const data = await post(`subscriptions/${video.creatorId}`);
      setSubscribed(data.subscribed);
      notify(data.subscribed ? `Following ${video.author}` : `Unfollowed ${video.author}`);
    } catch (error) { notify(error.message, 'error'); }
  };
  const share = async () => {
    const url = `${location.origin}/?v=${video.id}`;
    try {
      if (navigator.share) await navigator.share({title: video.title, url});
      else { await navigator.clipboard.writeText(url); notify('Link copied'); }
    } catch { /* cancelled */ }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(`${location.origin}/?v=${video.id}`); setCopied(true); notify('Link copied'); }
    catch { notify('Copy failed — select the address bar instead.', 'error'); }
  };
  const submitComment = async event => {
    event.preventDefault();
    if (!user) return onAuth();
    const body = commentText.trim();
    if (!body) return;
    setPosting(true);
    try {
      await post(`videos/${video.id}/comments`, {body});
      setCommentText('');
      const data = await api(`videos/${video.id}/comments`);
      setComments(data.comments || []);
      notify('Comment posted');
    } catch (error) { notify(error.message, 'error'); }
    finally { setPosting(false); }
  };

  const description = video.description || 'No description yet. The creator let the frames do the talking.';
  return (
    <div className={cx('watch', cinema && 'cinema')}>
      <div className="watch-main">
        <button className="back-link" onClick={() => onNavigate({page: 'home'})}><ArrowLeft size={16} />Discover</button>
        <Player video={video} startAt={progress[video.id]?.t || 0} onProgress={(t, d) => onProgress(video.id, t, d)} onEnded={() => { if (autoplay && next) onNavigate({page: 'watch', id: next.id}); }} cinema={cinema} setCinema={setCinema} notify={notify} />
        <div className="watch-title-row">
          <div>
            <span className="eyebrow">{video.category} · {video.createdAt ? timeAgo(video.createdAt) : (video.license || 'Open licensed')}</span>
            <h1>{video.title}</h1>
            <p className="watch-sub">{video.durationSec ? `${fmtDuration(video.durationSec)} · ` : ''}{providerLabel(video)} · {video.license || 'Uploaded to ARINX'}</p>
          </div>
        </div>
        <div className="watch-actions">
          <button className={cx('action-pill', likes.liked && 'active')} onClick={toggleLike}><ThumbsUp size={17} fill={likes.liked ? 'currentColor' : 'none'} />{likes.count ? fmtCount(likes.count) : 'Like'}</button>
          <button className={cx('action-pill', saved && 'active')} onClick={() => onToggleSave(video)}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'} />{saved ? 'Saved' : 'Save'}</button>
          <button className="action-pill" onClick={share}><Share2 size={17} />Share</button>
          <button className="action-pill" onClick={copy}>{copied ? <Check size={17} /> : <Copy size={16} />}{copied ? 'Copied' : 'Copy link'}</button>
          <button className={cx('action-pill', cinema && 'active')} onClick={() => setCinema(value => !value)}>{cinema ? <Minimize2 size={16} /> : <Maximize2 size={16} />}Cinema</button>
        </div>
        <div className="creator-bar glass">
          <Avatar name={video.author || 'ARINX'} size={46} />
          <div className="creator-copy">
            <b>{video.author || 'ARINX creator'}</b>
            <small>{video.creatorId ? 'ARINX creator' : 'Wikimedia Commons'}{video.provider === 'external' ? ` · via ${providerLabel(video)}` : ''}</small>
          </div>
          {video.creatorId && user?.id !== video.creatorId && (
            <button className={cx('btn', subscribed ? 'btn-glass' : 'btn-primary')} onClick={toggleSubscribe}>{subscribed ? <Check size={15} /> : null}{subscribed ? 'Following' : 'Follow'}</button>
          )}
          {!video.creatorId && video.sourceUrl && <a className="btn btn-glass" href={video.sourceUrl} target="_blank" rel="noreferrer noopener">Source <ExternalLink size={14} /></a>}
        </div>
        <div className={cx('description glass', expanded && 'expanded')}>
          <p>{description}</p>
          <div className="description-meta">
            <span><Clock3 size={14} />{video.durationSec ? fmtDuration(video.durationSec) : 'On demand'}</span>
            <span><Globe2 size={14} />{providerLabel(video)}</span>
            {video.sourceUrl && <a href={video.sourceUrl} target="_blank" rel="noreferrer noopener">Original source <ExternalLink size={12} /></a>}
          </div>
          {description.length > 180 && <button className="text-btn" onClick={() => setExpanded(value => !value)}>{expanded ? 'Less' : 'More'}<ChevronDown size={15} className={expanded ? 'flip' : ''} /></button>}
        </div>
        <section className="comments">
          <header className="section-head">
            <div><span className="eyebrow"><MessageCircle size={13} />Conversation</span><h2>{comments.length} comment{comments.length === 1 ? '' : 's'}</h2></div>
          </header>
          <form className="comment-form" onSubmit={submitComment}>
            <Avatar name={user?.name || 'Guest'} size={38} />
            <div className="comment-input">
              <input value={commentText} onChange={event => setCommentText(event.target.value)} placeholder={user ? 'Add to the conversation…' : 'Sign in to join the conversation'} maxLength={2000} aria-label="Write a comment" />
              <button className="btn btn-primary" disabled={posting || !commentText.trim()}>{posting ? 'Sending…' : 'Post'}<Send size={14} /></button>
            </div>
          </form>
          {commentsLoading ? <div className="comment-skeleton"><span /><span /></div> : comments.length ? (
            <div className="comment-list">
              {comments.map(comment => (
                <article className="comment" key={comment.id}>
                  <Avatar name={comment.name} size={36} />
                  <div>
                    <b>{comment.name}<small>{timeAgo(comment.createdAt)}</small></b>
                    <p>{comment.body}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : <p className="comments-empty">No comments yet — be the first ripple.</p>}
        </section>
      </div>
      <aside className="watch-aside">
        <header className="aside-head">
          <div><span className="eyebrow">Up next</span><h2>Keep the signal</h2></div>
          <button className={cx('switch', autoplay && 'on')} onClick={() => setAutoplay(value => !value)} role="switch" aria-checked={autoplay} aria-label="Autoplay next video"><i /></button>
        </header>
        <div className="upnext-list">
          {related.map(item => <VideoRow key={item.id} video={item} onOpen={entry => onNavigate({page: 'watch', id: entry.id})} />)}
        </div>
        <div className="aside-note glass">
          <Sparkles size={17} />
          <div><b>Why this? </b><span>Because it shares the {video.category} frequency.</span></div>
        </div>
      </aside>
    </div>
  );
}
