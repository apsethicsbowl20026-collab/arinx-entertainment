import catalog from '../../web/catalog.json';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers}});
const fail = (message, status = 400) => json({error: message}, status);
const hex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
const hash = async text => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
// Cloudflare Workers caps PBKDF2 at 100,000 iterations.
const passwordHash = async (password, salt) => {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2', hash:'SHA-256', salt:new TextEncoder().encode(salt), iterations:100000}, key, 256));
};
const cookie = (token, age) => `arinx_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const publicUser = u => u ? {id:u.id, name:u.name, role:u.role || 'user'} : null;
const isAdmin = u => !!u && (u.role === 'admin' || u.role === 'owner');
const CATEGORIES = ['Entertainment','Animation','Movies','Science','Gaming','Music','Sports','Education','Technology','Coding'];
const R2_UPLOAD_LIMIT = 50 * 1024 * 1024;
const D1_UPLOAD_LIMIT = 16 * 1024 * 1024;
const CHUNK_SIZE = 512 * 1024;
const POSTER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v']);
const CLEAN = value => String(value ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim();

async function currentUser(req, db) {
  const token = req.headers.get('Cookie')?.match(/(?:^|;\s*)arinx_session=([a-f0-9]+)/)?.[1];
  if (!token) return null;
  return db.prepare('SELECT u.id, u.name, u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(await hash(token), Date.now()).first();
}
async function session(db, user) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  await db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,?)').bind(await hash(token), user.id, Date.now()+30*86400000).run();
  return token;
}
async function videoExists(db, id) {
  if (catalog.some(v => v.id === id)) return true;
  return !!await db.prepare('SELECT id FROM videos WHERE id=?').bind(id).first();
}

function safeUrl(value) {
  if (!value) return '';
  try {
    const u = new URL(String(value));
    return ['http:', 'https:'].includes(u.protocol) ? u.toString() : '';
  } catch { return ''; }
}
function normalizeUrl(value) {
  const text = String(value || '').trim();
  if (!text || text.length > 2048) return null;
  try {
    const u = new URL(text);
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return null;
    u.hash = '';
    return u;
  } catch { return null; }
}
function youtubeId(value) {
  return String(value || '').match(/(?:youtube\.com\/(?:watch\?[^#]*v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1] || '';
}
function vimeoId(value) {
  return String(value || '').match(/vimeo\.com\/(?:video\/)?(\d+)/)?.[1] || '';
}
function archiveId(value) {
  return String(value || '').match(/archive\.org\/(?:details|embed)\/([^/?#]+)/)?.[1] || '';
}
function embedInfo(v) {
  if (!['youtube', 'vimeo', 'archive'].includes(v.embed_type)) return null;
  const id = v.embed_type === 'youtube' ? youtubeId(v.source_url) : v.embed_type === 'vimeo' ? vimeoId(v.source_url) : archiveId(v.source_url);
  if (!id) return null;
  const url = v.embed_type === 'youtube'
    ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
    : v.embed_type === 'vimeo'
      ? `https://player.vimeo.com/video/${id}?autoplay=1`
      : `https://archive.org/embed/${id}`;
  return {type: v.embed_type, id, url};
}
function mapManagedVideo(v) {
  const embed = embedInfo(v);
  const hasThumb = !!(v.hasThumb ?? v.has_thumb);
  const provider = v.provider || (v.object_key ? 'r2' : 'd1');
  return {
    id: v.id,
    title: v.title,
    description: v.description,
    category: v.category,
    createdAt: v.createdAt,
    creatorId: v.creatorId,
    author: v.author,
    url: embed ? '' : `/api/media/${v.id}`,
    embed,
    thumb: v.thumb_url || (hasThumb ? `/api/thumb/${v.id}` : ''),
    durationSec: v.duration_sec || 0,
    sourceUrl: v.source_url || '',
    provider,
    license: provider === 'external' ? 'Published from an external source' : 'Uploaded by creator'
  };
}

async function oembed(url) {
  try {
    const response = await fetch(url, {headers: {Accept: 'application/json'}, signal: AbortSignal.timeout(4000)});
    if (!response.ok) return null;
    return await response.json();
  } catch { return null; }
}
function fileTitle(url) {
  const name = decodeURIComponent(url.pathname.split('/').pop() || 'Video');
  return CLEAN(name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')).slice(0, 120) || 'Untitled video';
}
async function parseVideoLink(url) {
  const raw = url.toString();
  let id = youtubeId(raw);
  if (id) {
    const canonical = `https://www.youtube.com/watch?v=${id}`;
    const meta = await oembed(`https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`);
    return {
      embedType: 'youtube',
      sourceUrl: canonical,
      thumbUrl: safeUrl(meta?.thumbnail_url) || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      title: CLEAN(meta?.title).slice(0, 120),
      author: CLEAN(meta?.author_name).slice(0, 80)
    };
  }
  id = vimeoId(raw);
  if (id) {
    const canonical = `https://vimeo.com/${id}`;
    const meta = await oembed(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(canonical)}`);
    return {
      embedType: 'vimeo',
      sourceUrl: canonical,
      thumbUrl: safeUrl(meta?.thumbnail_url),
      title: CLEAN(meta?.title).slice(0, 120),
      author: CLEAN(meta?.author_name).slice(0, 80)
    };
  }
  id = archiveId(raw);
  if (id) {
    return {
      embedType: 'archive',
      sourceUrl: `https://archive.org/details/${id}`,
      thumbUrl: `https://archive.org/services/img/${id}`,
      title: `Internet Archive · ${CLEAN(id).slice(0, 80)}`,
      author: 'Internet Archive'
    };
  }
  if (/\.(mp4|webm|mov|m4v|ogv)$/i.test(url.pathname)) {
    return {embedType: 'direct', sourceUrl: url.toString(), thumbUrl: '', title: fileTitle(url), author: ''};
  }
  return null;
}
function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(header || ''));
  if (!match || (!match[1] && !match[2])) return null;
  let start, end;
  if (!match[1]) {
    const suffix = Math.min(Number(match[2]) || 0, size);
    start = size - suffix;
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return {invalid: true};
  return {start, end};
}

async function storeChunks(db, id, file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  for (let offset = 0, index = 0; offset < bytes.length; offset += CHUNK_SIZE, index++) {
    const slice = bytes.subarray(offset, Math.min(offset + CHUNK_SIZE, bytes.length));
    await db.prepare('INSERT INTO media_chunks (video_id,idx,bytes) VALUES (?,?,?)').bind(id, index, slice).run();
  }
  return bytes.length;
}

async function deleteVideoCascade(db, env, id) {
  const video = await db.prepare('SELECT id,object_key FROM videos WHERE id=?').bind(id).first();
  if (!video) return false;
  if (env.MEDIA && video.object_key) {
    try { await env.MEDIA.delete(video.object_key); }
    catch (error) { console.error('R2 delete failed for', video.object_key, error); }
  }
  await db.prepare('DELETE FROM media_chunks WHERE video_id=?').bind(id).run();
  await db.prepare('DELETE FROM video_thumbs WHERE video_id=?').bind(id).run();
  await db.prepare('DELETE FROM likes WHERE video_id=?').bind(id).run();
  await db.prepare('DELETE FROM comments WHERE video_id=?').bind(id).run();
  await db.prepare('DELETE FROM videos WHERE id=?').bind(id).run();
  return true;
}

export async function onRequest({request:req, env}) {
  const url = new URL(req.url), path = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, ''), method = req.method;
  if (method !== 'GET' && method !== 'HEAD') {
    const origin = req.headers.get('Origin');
    if (!origin || origin !== url.origin) return fail('Invalid request origin', 403);
  }
  const db = env.DB;
  if (path === 'health' && (method === 'GET' || method === 'HEAD')) {
    const health = {
      ok: true,
      bindings: {db: !!db, media: !!env.MEDIA},
      database: db ? 'ok' : 'not-configured',
      storage: env.MEDIA ? 'r2' : 'd1',
      uploadLimitMB: Math.floor((env.MEDIA ? R2_UPLOAD_LIMIT : D1_UPLOAD_LIMIT) / 1048576)
    };
    if (db) {
      try { await db.prepare('SELECT 1 AS ok').first(); }
      catch (error) { console.error('Health check query failed', error); health.ok = false; health.database = 'error'; }
    } else {
      health.ok = false;
    }
    return json(health, health.ok ? 200 : 503);
  }
  if (!db) return fail('The platform database is not configured. In the Cloudflare dashboard, add a D1 database binding named "DB" (Workers & Pages → your project → Settings → Bindings), then redeploy the project so the binding takes effect. See /api/health.', 503);
  try {
    const user = await currentUser(req, db);

    if (path === 'auth' && method === 'GET') return json({user: publicUser(user)});
    if (path === 'auth' && method === 'POST') {
      const body = await req.json();
      if (body.action === 'logout') {
        const token = req.headers.get('Cookie')?.match(/(?:^|;\s*)arinx_session=([a-f0-9]+)/)?.[1];
        if (token) await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(token)).run();
        return json({ok: true}, 200, {'Set-Cookie': cookie('', 0)});
      }
      const email = String(body.email || '').trim().toLowerCase(), password = String(body.password || '');
      if (body.action === 'register') {
        const name = String(body.name || '').trim();
        if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || name.length < 2 || name.length > 60 || password.length < 8 || password.length > 200) return fail('Enter a valid name, email, and password of at least 8 characters.');
        if (await db.prepare('SELECT id FROM users WHERE email=?').bind(email).first()) return fail('An account already exists for this email.', 409);
        const id = crypto.randomUUID(), salt = hex(crypto.getRandomValues(new Uint8Array(16)));
        await db.prepare('INSERT INTO users (id,email,name,password,salt,created_at) VALUES (?,?,?,?,?,?)').bind(id, email, name, await passwordHash(password, salt), salt, Date.now()).run();
        const account = {id, name};
        return json({user: account}, 201, {'Set-Cookie': cookie(await session(db, account), 2592000)});
      }
      if (body.action === 'login') {
        const account = await db.prepare('SELECT * FROM users WHERE email=?').bind(email).first();
        if (!account || (await passwordHash(password, account.salt)) !== account.password) return fail('Incorrect email or password.', 401);
        return json({user: publicUser(account)}, 200, {'Set-Cookie': cookie(await session(db, account), 2592000)});
      }
      return fail('Unknown action');
    }

    if (path === 'videos' && method === 'GET') {
      const rows = await db.prepare(`SELECT v.id,v.title,v.description,v.category,v.created_at AS createdAt,v.object_key,v.source_url,v.embed_type,v.provider,v.duration_sec,v.thumb_url,u.id AS creatorId,u.name AS author,
        EXISTS(SELECT 1 FROM video_thumbs t WHERE t.video_id=v.id) AS hasThumb
        FROM videos v JOIN users u ON u.id=v.user_id ORDER BY v.created_at DESC LIMIT 200`).all();
      return json({videos: rows.results.map(mapManagedVideo)});
    }

    if (path === 'videos' && method === 'POST') {
      if (!user) return fail('Sign in to publish a video.', 401);
      const body = await req.json();
      const target = normalizeUrl(body.url);
      if (!target) return fail('Enter a valid http(s) video link.');
      const parsed = await parseVideoLink(target);
      if (!parsed) return fail('Unsupported link. Use YouTube, Vimeo, Internet Archive, or a direct MP4, WebM or MOV URL.');
      if (await db.prepare('SELECT id FROM videos WHERE source_url=?').bind(parsed.sourceUrl).first()) return fail('That video has already been added.', 409);
      const title = (CLEAN(body.title) || parsed.title || 'Untitled video').slice(0, 120);
      const description = CLEAN(body.description).slice(0, 5000);
      const category = CATEGORIES.includes(body.category) ? body.category : 'Entertainment';
      const id = crypto.randomUUID();
      await db.prepare('INSERT INTO videos (id,user_id,title,description,category,object_key,content_type,created_at,source_url,embed_type,provider,duration_sec,thumb_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id, user.id, title, description, category, '', 'video/' + parsed.embedType, Date.now(), parsed.sourceUrl, parsed.embedType, 'external', 0, parsed.thumbUrl || '')
        .run();
      return json({id, provider: parsed.embedType, author: parsed.author}, 201);
    }

    if (path.startsWith('thumb/') && method === 'GET') {
      const id = path.slice(6);
      const row = await db.prepare('SELECT content_type,bytes FROM video_thumbs WHERE video_id=?').bind(id).first();
      if (!row) return fail('Thumbnail not found.', 404);
      const bytes = new Uint8Array(row.bytes);
      return new Response(bytes, {headers: {'Content-Type': row.content_type, 'Content-Length': String(bytes.byteLength), 'Cache-Control': 'public, max-age=31536000, immutable'}});
    }

    if (path.startsWith('media/') && method === 'GET') {
      const id = path.slice(6);
      const v = await db.prepare('SELECT id,object_key,content_type,source_url,embed_type,provider FROM videos WHERE id=?').bind(id).first();
      if (!v) return fail('Video not found.', 404);
      if (v.provider === 'external' || (!v.object_key && v.source_url)) {
        if (v.embed_type === 'direct') return Response.redirect(safeUrl(v.source_url) || v.source_url, 302);
        return fail('This video plays from its original host.', 400);
      }
      if (env.MEDIA && v.object_key) {
        const object = await env.MEDIA.get(v.object_key, {range: req.headers});
        if (!object) return fail('Media not found.', 404);
        const headers = new Headers({'Content-Type': v.content_type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=3600'});
        if (object.range) {
          const start = object.range.offset ?? 0, length = object.range.length ?? (object.size - start);
          headers.set('Content-Range', `bytes ${start}-${start + length - 1}/${object.size}`);
          headers.set('Content-Length', String(length));
          return new Response(object.body, {status: 206, headers});
        }
        headers.set('Content-Length', String(object.size));
        return new Response(object.body, {headers});
      }
      const parts = (await db.prepare('SELECT idx,length(bytes) AS len FROM media_chunks WHERE video_id=? ORDER BY idx').bind(id).all()).results;
      if (!parts.length) {
        return fail(env.MEDIA
          ? 'Media not found. The R2 object for this video is missing.'
          : 'Media not found. This video has no stored file.', 404);
      }
      const total = parts.reduce((sum, part) => sum + (part.len || 0), 0);
      let start = 0, end = total - 1, status = 200;
      const range = parseRange(req.headers.get('Range'), total);
      if (range?.invalid) return new Response(null, {status: 416, headers: {'Content-Range': `bytes */${total}`}});
      if (range) { start = range.start; end = range.end; status = 206; }
      const headers = new Headers({
        'Content-Type': v.content_type || 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Content-Length': String(end - start + 1),
        'Cache-Control': 'public, max-age=3600'
      });
      if (status === 206) headers.set('Content-Range', `bytes ${start}-${end}/${total}`);
      const first = Math.floor(start / CHUNK_SIZE), last = Math.floor(end / CHUNK_SIZE);
      let index = first;
      const body = new ReadableStream({
        async pull(controller) {
          if (index > last) { controller.close(); return; }
          try {
            const row = await db.prepare('SELECT bytes FROM media_chunks WHERE video_id=? AND idx=?').bind(id, index).first();
            if (!row) { controller.error(new Error('Missing media chunk')); return; }
            const chunk = new Uint8Array(row.bytes);
            const from = index === first ? start - first * CHUNK_SIZE : 0;
            const to = index === last ? end - last * CHUNK_SIZE + 1 : chunk.length;
            controller.enqueue(chunk.subarray(from, to));
            index++;
          } catch (error) { controller.error(error); }
        }
      });
      return new Response(body, {status, headers});
    }

    if (path === 'upload' && method === 'POST') {
      if (!user) return fail('Sign in to upload.', 401);
      const limit = env.MEDIA ? R2_UPLOAD_LIMIT : D1_UPLOAD_LIMIT;
      const limitMb = Math.floor(limit / 1048576);
      const declared = Number(req.headers.get('Content-Length') || 0);
      if (declared > limit + 2 * 1024 * 1024) return fail(`Videos must be ${limitMb} MB or smaller.`, 413);
      let form;
      try { form = await req.formData(); }
      catch { return fail(`Could not read the upload. Videos must be ${limitMb} MB or smaller.`, 413); }
      const file = form.get('file');
      const title = CLEAN(form.get('title')).slice(0, 120);
      const description = CLEAN(form.get('description')).slice(0, 5000);
      const category = String(form.get('category') || 'Entertainment');
      if (!(file instanceof File) || !VIDEO_TYPES.has(file.type) || file.size === 0 || file.size > limit || !title || !CATEGORIES.includes(category)) {
        return fail(`Provide a title and an MP4, WebM or MOV video up to ${limitMb} MB.`, 400);
      }
      const id = crypto.randomUUID();
      const provider = env.MEDIA ? 'r2' : 'd1';
      const key = provider === 'r2' ? `videos/${id}` : '';
      const duration = Math.min(Math.max(Number(form.get('duration')) || 0, 0), 86400);
      await db.prepare('INSERT INTO videos (id,user_id,title,description,category,object_key,content_type,created_at,source_url,embed_type,provider,duration_sec,thumb_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .bind(id, user.id, title, description, category, key, file.type, Date.now(), '', '', provider, duration, '')
        .run();
      try {
        if (provider === 'r2') {
          await env.MEDIA.put(key, await file.arrayBuffer(), {httpMetadata: {contentType: file.type}});
        } else {
          await storeChunks(db, id, file);
        }
        const poster = form.get('poster');
        if (poster instanceof File && poster.size > 0 && poster.size <= 1_500_000 && POSTER_TYPES.has(poster.type)) {
          try {
            await db.prepare('INSERT OR REPLACE INTO video_thumbs (video_id,content_type,bytes) VALUES (?,?,?)')
              .bind(id, poster.type, new Uint8Array(await poster.arrayBuffer())).run();
          } catch (error) { console.error('Poster store failed', error); }
        }
      } catch (error) {
        await deleteVideoCascade(db, env, id);
        throw error;
      }
      return json({id, storage: provider}, 201);
    }

    const match = path.match(/^videos\/([^/]+)\/(comments|likes)$/);
    if (match) {
      const [, id, kind] = match;
      if (!(await videoExists(db, id))) return fail('Video not found.', 404);
      if (kind === 'comments' && method === 'GET') {
        const rows = await db.prepare('SELECT c.id,c.body,c.created_at AS createdAt,u.name FROM comments c JOIN users u ON u.id=c.user_id WHERE c.video_id=? ORDER BY c.created_at DESC LIMIT 100').bind(id).all();
        return json({comments: rows.results});
      }
      if (kind === 'likes' && method === 'GET') {
        const count = await db.prepare('SELECT COUNT(*) AS count FROM likes WHERE video_id=?').bind(id).first();
        const liked = user && await db.prepare('SELECT 1 AS yes FROM likes WHERE video_id=? AND user_id=?').bind(id, user.id).first();
        return json({count: count.count, liked: !!liked});
      }
      if (method === 'POST') {
        if (!user) return fail('Sign in to continue.', 401);
        if (kind === 'comments') {
          const body = String((await req.json()).body || '').trim();
          if (!body || body.length > 2000) return fail('Comment must be between 1 and 2,000 characters.');
          await db.prepare('INSERT INTO comments (id,video_id,user_id,body,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(), id, user.id, body, Date.now()).run();
        } else {
          const exists = await db.prepare('SELECT 1 AS yes FROM likes WHERE video_id=? AND user_id=?').bind(id, user.id).first();
          if (exists) await db.prepare('DELETE FROM likes WHERE video_id=? AND user_id=?').bind(id, user.id).run();
          else await db.prepare('INSERT OR IGNORE INTO likes (video_id,user_id) VALUES (?,?)').bind(id, user.id).run();
        }
        return json({ok: true});
      }
    }

    if (path.startsWith('subscriptions/') && ['GET', 'POST'].includes(method)) {
      const creator = path.slice('subscriptions/'.length);
      if (!await db.prepare('SELECT id FROM users WHERE id=?').bind(creator).first()) return fail('Creator not found.', 404);
      const subscribed = user && await db.prepare('SELECT 1 AS yes FROM subscriptions WHERE creator_id=? AND user_id=?').bind(creator, user.id).first();
      if (method === 'POST') {
        if (!user) return fail('Sign in to subscribe.', 401);
        if (user.id === creator) return fail('You cannot subscribe to yourself.');
        if (subscribed) await db.prepare('DELETE FROM subscriptions WHERE creator_id=? AND user_id=?').bind(creator, user.id).run();
        else await db.prepare('INSERT OR IGNORE INTO subscriptions (creator_id,user_id) VALUES (?,?)').bind(creator, user.id).run();
        return json({subscribed: !subscribed});
      }
      return json({subscribed: !!subscribed});
    }
    if (path === 'subscriptions' && method === 'GET') {
      if (!user) return fail('Sign in to see subscriptions.', 401);
      const rows = await db.prepare('SELECT creator_id FROM subscriptions WHERE user_id=?').bind(user.id).all();
      return json({creators: rows.results.map(r => r.creator_id)});
    }

    if (path.startsWith('admin')) {
      if (!isAdmin(user)) return fail('Admin access required.', 403);
      const count = async sql => (await db.prepare(sql).first()).count;
      if (path === 'admin/overview' && method === 'GET') {
        const counts = {
          users: await count('SELECT COUNT(*) AS count FROM users'),
          videos: await count('SELECT COUNT(*) AS count FROM videos'),
          comments: await count('SELECT COUNT(*) AS count FROM comments'),
          likes: await count('SELECT COUNT(*) AS count FROM likes'),
          subscriptions: await count('SELECT COUNT(*) AS count FROM subscriptions')
        };
        const storage = await db.prepare('SELECT COUNT(*) AS chunks, COALESCE(SUM(length(bytes)),0) AS bytes FROM media_chunks').first();
        const recentUsers = (await db.prepare('SELECT id,name,email,role,created_at AS createdAt FROM users ORDER BY created_at DESC LIMIT 5').all()).results;
        const recentVideos = (await db.prepare('SELECT v.id,v.title,v.created_at AS createdAt,u.name FROM videos v JOIN users u ON u.id=v.user_id ORDER BY v.created_at DESC LIMIT 5').all()).results;
        return json({counts, storage, recentUsers, recentVideos});
      }
      if (path === 'admin/users' && method === 'GET') {
        const q = (url.searchParams.get('q') || '').trim().toLowerCase();
        const esc = s => s.replace(/[\\%_]/g, c => '\\' + c);
        const rows = q
          ? await db.prepare("SELECT id,name,email,role,created_at AS createdAt FROM users WHERE lower(name) LIKE ? ESCAPE '\\' OR lower(email) LIKE ? ESCAPE '\\' ORDER BY created_at DESC LIMIT 100").bind(`%${esc(q)}%`, `%${esc(q)}%`).all()
          : await db.prepare('SELECT id,name,email,role,created_at AS createdAt FROM users ORDER BY created_at DESC LIMIT 100').all();
        return json({users: rows.results});
      }
      let m = path.match(/^admin\/users\/([^/]+)\/role$/);
      if (m && method === 'POST') {
        const id = m[1], body = await req.json();
        const role = String(body.role || '');
        if (!['user', 'admin'].includes(role)) return fail('Role must be "user" or "admin".');
        const target = await db.prepare('SELECT id,role FROM users WHERE id=?').bind(id).first();
        if (!target) return fail('User not found.', 404);
        if (target.id === user.id) return fail('You cannot change your own role.');
        if (target.role === 'owner') return fail('The owner account cannot be changed.');
        if (user.role !== 'owner' && role === 'admin') return fail('Only the owner can grant admin.');
        await db.prepare('UPDATE users SET role=? WHERE id=?').bind(role, id).run();
        return json({ok: true, id, role});
      }
      m = path.match(/^admin\/users\/([^/]+)$/);
      if (m && method === 'DELETE') {
        const id = m[1];
        if (id === user.id) return fail('You cannot delete your own account.');
        const target = await db.prepare('SELECT id,role FROM users WHERE id=?').bind(id).first();
        if (!target) return fail('User not found.', 404);
        if (target.role === 'owner') return fail('The owner account cannot be deleted.');
        const videos = (await db.prepare('SELECT id FROM videos WHERE user_id=?').bind(id).all()).results;
        for (const video of videos) await deleteVideoCascade(db, env, video.id);
        await db.prepare('DELETE FROM likes WHERE user_id=?').bind(id).run();
        await db.prepare('DELETE FROM comments WHERE user_id=?').bind(id).run();
        await db.prepare('DELETE FROM subscriptions WHERE user_id=? OR creator_id=?').bind(id, id).run();
        await db.prepare('DELETE FROM sessions WHERE user_id=?').bind(id).run();
        await db.prepare('DELETE FROM users WHERE id=?').bind(id).run();
        return json({ok: true});
      }
      if (path === 'admin/comments' && method === 'GET') {
        const rows = (await db.prepare('SELECT c.id,c.body,c.created_at AS createdAt,c.video_id AS videoId,u.name,u.email FROM comments c JOIN users u ON u.id=c.user_id ORDER BY c.created_at DESC LIMIT 100').all()).results;
        return json({comments: rows});
      }
      m = path.match(/^admin\/comments\/([^/]+)$/);
      if (m && method === 'DELETE') {
        const result = await db.prepare('DELETE FROM comments WHERE id=?').bind(m[1]).run();
        if (result.meta && result.meta.changes === 0) return fail('Comment not found.', 404);
        return json({ok: true});
      }
      if (path === 'admin/videos' && method === 'GET') {
        const rows = (await db.prepare('SELECT v.id,v.title,v.category,v.created_at AS createdAt,v.provider,v.source_url AS sourceUrl,u.name,u.email FROM videos v JOIN users u ON u.id=v.user_id ORDER BY v.created_at DESC LIMIT 100').all()).results;
        return json({videos: rows});
      }
      m = path.match(/^admin\/videos\/([^/]+)$/);
      if (m && method === 'DELETE') {
        const deleted = await deleteVideoCascade(db, env, m[1]);
        if (!deleted) return fail('Video not found.', 404);
        return json({ok: true});
      }
      return fail('Not found.', 404);
    }
    return fail('Not found.', 404);
  } catch (error) {
    console.error('API error', error);
    return fail('Something went wrong. Please try again.', 500);
  }
}
