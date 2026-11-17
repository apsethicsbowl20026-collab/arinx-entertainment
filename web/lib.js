export const CATEGORIES = ['All', 'Entertainment', 'Animation', 'Movies', 'Science', 'Gaming', 'Music', 'Sports', 'Education', 'Technology', 'Coding'];

export const CATEGORY_LOOK = {
  Entertainment: 'from #4d8dff to #8b5cf6',
  Animation: 'from #22ccff to #3b82f6',
  Movies: 'from #6366f1 to #22d3ee',
  Science: 'from #0ea5e9 to #22d3ee',
  Gaming: 'from #7c3aed to #2563eb',
  Music: 'from #38bdf8 to #818cf8',
  Sports: 'from #2563eb to #06b6d4',
  Education: 'from #0284c7 to #60a5fa',
  Technology: 'from #3b82f6 to #06b6d4',
  Coding: 'from #1d4ed8 to #22d3ee'
};

export const fmtDuration = seconds => {
  if (!seconds || !Number.isFinite(Number(seconds))) return '';
  const total = Math.max(0, Math.round(Number(seconds)));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

export const fmtCount = n => {
  const value = Number(n) || 0;
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return String(value);
};

export const timeAgo = value => {
  const stamp = Number(value);
  if (!stamp || stamp < 1e12) return '';
  const diff = Math.max(0, Date.now() - stamp);
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
};

export const initials = name => String(name || 'ARINX').trim().split(/\s+/).slice(0, 2).map(word => word[0]).join('').toUpperCase() || 'A';
export const cx = (...values) => values.filter(Boolean).join(' ');
export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const hashString = text => {
  let hash = 0;
  for (let i = 0; i < String(text).length; i++) hash = ((hash << 5) - hash + String(text).charCodeAt(i)) | 0;
  return Math.abs(hash);
};

export function avatarGradient(seed) {
  const palettes = [
    ['#4d8dff', '#22d3ee'], ['#6366f1', '#38bdf8'], ['#0ea5e9', '#818cf8'],
    ['#2563eb', '#06b6d4'], ['#7c3aed', '#3b82f6'], ['#0284c7', '#60a5fa']
  ];
  const pair = palettes[hashString(seed || 'arinx') % palettes.length];
  return `linear-gradient(140deg, ${pair[0]}, ${pair[1]})`;
}

export function wideThumb(video) {
  const src = video?.thumb || '';
  return src.replace(/([?&])width=\d+/, '$1width=1600');
}

export function thumbGradient(seed) {
  const palettes = [
    ['#07162e', '#0d3b7a', '#0a6c9e'], ['#08101f', '#15356b', '#1c6ea8'],
    ['#0a1530', '#2a2f7c', '#0f6f9c'], ['#061325', '#0b4f7a', '#1452a6'],
    ['#0b1224', '#1e3a8a', '#2563eb'], ['#071a2b', '#0e5d8c', '#3b82f6']
  ];
  const n = hashString(seed || 'arinx') % palettes.length;
  const p = palettes[n];
  return `linear-gradient(145deg, ${p[0]} 0%, ${p[1]} 58%, ${p[2]} 100%)`;
}

export function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

export function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage disabled */ }
}

export async function api(path, options = {}) {
  const { body, headers, ...rest } = options;
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const response = await fetch(`/api/${path}`, {
    credentials: 'include',
    ...rest,
    headers: { ...(body && !isForm ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body
  });
  let data = {};
  try { data = await response.json(); } catch { /* empty body */ }
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export const post = (path, body = {}) => api(path, { method: 'POST', body: JSON.stringify(body) });

export function detectProvider(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  let url;
  try { url = new URL(text); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol)) return null;
  const full = url.toString();
  if (/(?:youtube\.com\/(?:watch\?[^#]*v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.test(full)) return { type: 'youtube', label: 'YouTube' };
  if (/vimeo\.com\/(?:video\/)?\d+/.test(full)) return { type: 'vimeo', label: 'Vimeo' };
  if (/archive\.org\/(?:details|embed)\/[^/?#]+/.test(full)) return { type: 'archive', label: 'Internet Archive' };
  if (/\.(mp4|webm|mov|m4v|ogv)$/i.test(url.pathname)) return { type: 'direct', label: 'Direct video' };
  return null;
}

export function providerLabel(video) {
  if (!video) return '';
  if (video.provider === 'external') {
    if (video.embed?.type === 'youtube') return 'YouTube';
    if (video.embed?.type === 'vimeo') return 'Vimeo';
    if (video.embed?.type === 'archive') return 'Archive';
    return video.sourceUrl && /\.(mp4|webm|mov|m4v|ogv)$/i.test(video.sourceUrl) ? 'Direct' : 'External';
  }
  if (video.provider === 'd1' || video.provider === 'r2') return 'ARINX';
  if (video.provider === 'commons' || !video.provider) return 'Commons';
  return video.provider;
}

export function normalizeCatalog(catalog) {
  return (catalog || []).map(item => ({
    id: item.id,
    title: item.title,
    description: '',
    category: item.category,
    createdAt: 0,
    creatorId: '',
    author: item.author,
    url: item.url,
    embed: null,
    thumb: item.thumb || '',
    durationSec: item.durationSec || 0,
    sourceUrl: item.page || item.url,
    provider: 'commons',
    license: item.license || 'Open licensed'
  }));
}

export function mergeVideos(managed, catalog) {
  const seen = new Set();
  const list = [];
  for (const video of [...(managed || []), ...normalizeCatalog(catalog)]) {
    if (!video || !video.id || seen.has(video.id)) continue;
    seen.add(video.id);
    list.push(video);
  }
  return list;
}

/* Captures a JPEG poster and the duration from a local video file. */
export function capturePoster(file) {
  return new Promise(resolve => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    let settled = false;
    const finish = result => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      resolve(result);
    };
    const timeout = setTimeout(() => finish({ duration: 0, poster: null }), 9000);
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.onerror = () => finish({ duration: 0, poster: null });
    video.onloadeddata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const grab = () => {
        try {
          const width = Math.min(960, video.videoWidth || 640);
          const ratio = (video.videoHeight || 360) / (video.videoWidth || 640);
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = Math.max(1, Math.round(width * ratio));
          canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(blob => finish({ duration, poster: blob || null }), 'image/jpeg', 0.82);
        } catch { finish({ duration, poster: null }); }
      };
      try { video.currentTime = clamp(duration * 0.1, 0.15, 3); } catch { grab(); }
      video.onseeked = grab;
      setTimeout(grab, 2200);
    };
    video.src = objectUrl;
  });
}

/* XHR so the upload modal can show real progress. */
export function uploadFile(formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.withCredentials = true;
    xhr.responseType = 'json';
    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = event => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
      };
    }
    xhr.onload = () => {
      const data = xhr.response || {};
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.error || `Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('The upload connection dropped. Check your network and try again.'));
    xhr.onabort = () => reject(new Error('Upload cancelled.'));
    xhr.send(formData);
  });
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Late night watch';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
