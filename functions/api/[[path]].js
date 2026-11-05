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
export async function onRequest({request:req, env}) {
  const url = new URL(req.url), path = url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, ''), method = req.method;
  if (method !== 'GET' && method !== 'HEAD') {
    const origin = req.headers.get('Origin');
    if (!origin || origin !== url.origin) return fail('Invalid request origin', 403);
  }
  const db = env.DB;
  if (path === 'health' && (method === 'GET' || method === 'HEAD')) {
    const health = {ok: true, bindings: {db: !!db, media: !!env.MEDIA}, database: db ? 'ok' : 'not-configured'};
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
    if (path === 'auth' && method === 'GET') return json({user:publicUser(user)});
    if (path === 'auth' && method === 'POST') {
      const body = await req.json();
      if (body.action === 'logout') {
        const token = req.headers.get('Cookie')?.match(/(?:^|;\s*)arinx_session=([a-f0-9]+)/)?.[1];
        if(token) await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(token)).run();
        return json({ok:true}, 200, {'Set-Cookie':cookie('', 0)});
      }
      const email = String(body.email || '').trim().toLowerCase(), password = String(body.password || '');
      if (body.action === 'register') {
        const name = String(body.name || '').trim();
        if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || name.length < 2 || name.length > 60 || password.length < 8 || password.length > 200) return fail('Enter a valid name, email, and password of at least 8 characters.');
        if (await db.prepare('SELECT id FROM users WHERE email=?').bind(email).first()) return fail('An account already exists for this email.', 409);
        const id = crypto.randomUUID(), salt = hex(crypto.getRandomValues(new Uint8Array(16)));
        await db.prepare('INSERT INTO users (id,email,name,password,salt,created_at) VALUES (?,?,?,?,?,?)').bind(id,email,name,await passwordHash(password,salt),salt,Date.now()).run();
        const account = {id,name}; return json({user:account}, 201, {'Set-Cookie':cookie(await session(db,account),2592000)});
      }
      if (body.action === 'login') {
        const account = await db.prepare('SELECT * FROM users WHERE email=?').bind(email).first();
        if (!account || (await passwordHash(password,account.salt)) !== account.password) return fail('Incorrect email or password.', 401);
        return json({user:publicUser(account)}, 200, {'Set-Cookie':cookie(await session(db,account),2592000)});
      }
      return fail('Unknown action');
    }
    if (path === 'videos' && method === 'GET') {
      const results = await db.prepare('SELECT v.id,v.title,v.description,v.category,v.created_at AS createdAt,u.id AS creatorId,u.name AS author FROM videos v JOIN users u ON u.id=v.user_id ORDER BY v.created_at DESC LIMIT 200').all();
      return json({videos:results.results.map(v=>({...v,url:`/api/media/${v.id}`,thumb:'', license:'Uploaded by creator'}))});
    }
    if (path.startsWith('media/') && method === 'GET') {
      if (!env.MEDIA) return fail('Media storage is not configured. Bind an R2 bucket named "MEDIA" in Settings → Bindings, then redeploy the project. See /api/health.', 503);
      const id = path.slice(6);
      const v = await db.prepare('SELECT object_key, content_type FROM videos WHERE id=?').bind(id).first();
      if (!v) return fail('Video not found.',404);
      const object = await env.MEDIA.get(v.object_key, {range:req.headers});
      if (!object) return fail('Media not found.',404);
      const headers = new Headers({'Content-Type':v.content_type, 'Accept-Ranges':'bytes', 'Cache-Control':'public, max-age=3600'});
      if (object.range) {
        const start = object.range.offset ?? 0, length = object.range.length ?? (object.size-start);
        headers.set('Content-Range', `bytes ${start}-${start+length-1}/${object.size}`); headers.set('Content-Length', String(length));
        return new Response(object.body,{status:206,headers});
      }
      headers.set('Content-Length',String(object.size)); return new Response(object.body,{headers});
    }
    if (path === 'upload' && method === 'POST') {
      if (!user) return fail('Sign in to upload.',401);
      if (!env.MEDIA) return fail('Media storage is not configured. Bind an R2 bucket named "MEDIA" in Settings → Bindings, then redeploy the project. See /api/health.',503);
      if (Number(req.headers.get('Content-Length') || 0) > 55*1024*1024) return fail('Videos must be 50 MB or smaller.',413);
      const form = await req.formData(), file = form.get('file'), title = String(form.get('title') || '').trim(), description = String(form.get('description') || '').trim(), category = String(form.get('category') || 'Entertainment');
      if (!(file instanceof File) || !['video/mp4','video/webm','video/quicktime'].includes(file.type) || file.size === 0 || file.size > 50*1024*1024 || !title || title.length > 120 || description.length > 5000 || !['Entertainment','Animation','Movies','Science','Gaming','Music','Sports','Education','Technology'].includes(category)) return fail('Provide a title and an MP4, WebM or MOV video up to 50 MB.');
      const id = crypto.randomUUID(), key = `videos/${id}`;
      await env.MEDIA.put(key, await file.arrayBuffer(), {httpMetadata:{contentType:file.type}});
      try { await db.prepare('INSERT INTO videos (id,user_id,title,description,category,object_key,content_type,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(id,user.id,title,description,category,key,file.type,Date.now()).run(); }
      catch(e) { await env.MEDIA.delete(key); throw e; }
      return json({id},201);
    }
    const match = path.match(/^videos\/([^/]+)\/(comments|likes)$/);
    if (match) {
      const [,id,kind] = match;
      if (!(await videoExists(db,id))) return fail('Video not found.',404);
      if (kind === 'comments' && method === 'GET') {
        const rows = await db.prepare('SELECT c.id,c.body,c.created_at AS createdAt,u.name FROM comments c JOIN users u ON u.id=c.user_id WHERE c.video_id=? ORDER BY c.created_at DESC LIMIT 100').bind(id).all();
        return json({comments:rows.results});
      }
      if (kind === 'likes' && method === 'GET') {
        const count = await db.prepare('SELECT COUNT(*) AS count FROM likes WHERE video_id=?').bind(id).first();
        const liked = user && await db.prepare('SELECT 1 AS yes FROM likes WHERE video_id=? AND user_id=?').bind(id,user.id).first();
        return json({count:count.count,liked:!!liked});
      }
      if (method === 'POST') {
        if (!user) return fail('Sign in to continue.',401);
        if (kind === 'comments') {
          const body = String((await req.json()).body || '').trim();
          if (!body || body.length > 2000) return fail('Comment must be between 1 and 2,000 characters.');
          await db.prepare('INSERT INTO comments (id,video_id,user_id,body,created_at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),id,user.id,body,Date.now()).run();
        } else {
          const exists = await db.prepare('SELECT 1 AS yes FROM likes WHERE video_id=? AND user_id=?').bind(id,user.id).first();
          if (exists) await db.prepare('DELETE FROM likes WHERE video_id=? AND user_id=?').bind(id,user.id).run();
          else await db.prepare('INSERT OR IGNORE INTO likes (video_id,user_id) VALUES (?,?)').bind(id,user.id).run();
        }
        return json({ok:true});
      }
    }
    if (path.startsWith('subscriptions/') && ['GET','POST'].includes(method)) {
      const creator = path.slice('subscriptions/'.length);
      if (!await db.prepare('SELECT id FROM users WHERE id=?').bind(creator).first()) return fail('Creator not found.',404);
      const subscribed = user && await db.prepare('SELECT 1 AS yes FROM subscriptions WHERE creator_id=? AND user_id=?').bind(creator,user.id).first();
      if(method === 'POST') {
        if(!user) return fail('Sign in to subscribe.',401);
        if(user.id === creator) return fail('You cannot subscribe to yourself.');
        if(subscribed) await db.prepare('DELETE FROM subscriptions WHERE creator_id=? AND user_id=?').bind(creator,user.id).run();
        else await db.prepare('INSERT OR IGNORE INTO subscriptions (creator_id,user_id) VALUES (?,?)').bind(creator,user.id).run();
        return json({subscribed:!subscribed});
      }
      return json({subscribed:!!subscribed});
    }
    if(path === 'subscriptions' && method === 'GET') {
      if(!user) return fail('Sign in to see subscriptions.',401);
      const rows = await db.prepare('SELECT creator_id FROM subscriptions WHERE user_id=?').bind(user.id).all();
      return json({creators:rows.results.map(r=>r.creator_id)});
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
        const recentUsers = (await db.prepare('SELECT id,name,email,role,created_at AS createdAt FROM users ORDER BY created_at DESC LIMIT 5').all()).results;
        const recentVideos = (await db.prepare('SELECT v.id,v.title,v.created_at AS createdAt,u.name FROM videos v JOIN users u ON u.id=v.user_id ORDER BY v.created_at DESC LIMIT 5').all()).results;
        return json({counts, recentUsers, recentVideos});
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
        const vids = (await db.prepare('SELECT id,object_key FROM videos WHERE user_id=?').bind(id).all()).results;
        if (env.MEDIA) for (const v of vids) { try { await env.MEDIA.delete(v.object_key); } catch (e) { console.error('R2 delete failed for', v.object_key, e); } }
        await db.prepare('DELETE FROM likes WHERE user_id=?').bind(id).run();
        await db.prepare('DELETE FROM comments WHERE user_id=?').bind(id).run();
        await db.prepare('DELETE FROM subscriptions WHERE user_id=? OR creator_id=?').bind(id, id).run();
        await db.prepare('DELETE FROM sessions WHERE user_id=?').bind(id).run();
        for (const v of vids) {
          await db.prepare('DELETE FROM likes WHERE video_id=?').bind(v.id).run();
          await db.prepare('DELETE FROM comments WHERE video_id=?').bind(v.id).run();
          await db.prepare('DELETE FROM videos WHERE id=?').bind(v.id).run();
        }
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
        const rows = (await db.prepare('SELECT v.id,v.title,v.category,v.created_at AS createdAt,u.name,u.email FROM videos v JOIN users u ON u.id=v.user_id ORDER BY v.created_at DESC LIMIT 100').all()).results;
        return json({videos: rows});
      }
      m = path.match(/^admin\/videos\/([^/]+)$/);
      if (m && method === 'DELETE') {
        const id = m[1];
        const v = await db.prepare('SELECT id,object_key FROM videos WHERE id=?').bind(id).first();
        if (!v) return fail('Video not found.', 404);
        if (env.MEDIA) { try { await env.MEDIA.delete(v.object_key); } catch (e) { console.error('R2 delete failed for', v.object_key, e); } }
        await db.prepare('DELETE FROM likes WHERE video_id=?').bind(id).run();
        await db.prepare('DELETE FROM comments WHERE video_id=?').bind(id).run();
        await db.prepare('DELETE FROM videos WHERE id=?').bind(id).run();
        return json({ok: true});
      }
      return fail('Not found.', 404);
    }
    return fail('Not found.',404);
  } catch (error) { console.error('API error',error); return fail('Something went wrong. Please try again.',500); }
}
