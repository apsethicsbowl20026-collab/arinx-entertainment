import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db"; import * as s from "@/db/schema"; import { eq, desc, count } from "drizzle-orm"; import { currentUser, notify } from "@/lib/auth";

export async function GET(req:NextRequest){
  const me=await currentUser(); const what=req.nextUrl.searchParams.get("what");
  if(what==="notifications"){ if(!me) return NextResponse.json({error:"Sign in"},{status:401}); const rows=await db.select({n:s.notifications,u:s.users}).from(s.notifications).leftJoin(s.users,eq(s.notifications.actorId,s.users.id)).where(eq(s.notifications.userId,me.id)).orderBy(desc(s.notifications.createdAt)).limit(50); return NextResponse.json({notifications:rows.map(r=>({...r.n,actor:r.u?{displayName:r.u.displayName,avatarUrl:r.u.avatarUrl,username:r.u.username}:null})),unread:rows.filter(r=>!r.n.isRead).length}); }
  if(what==="playlists"){ if(!me) return NextResponse.json({playlists:[]}); const pls=await db.select().from(s.playlists).where(eq(s.playlists.userId,me.id)).orderBy(desc(s.playlists.createdAt)); const pvs=await db.select().from(s.playlistVideos); return NextResponse.json({playlists:pls.map(p=>({...p,items:pvs.filter(x=>x.playlistId===p.id).sort((a,b)=>a.position-b.position)}))}); }
  if(what==="playlist"){ const id=req.nextUrl.searchParams.get("id")||""; const [p]=await db.select().from(s.playlists).where(eq(s.playlists.id,id)); if(!p) return NextResponse.json({error:"Not found"},{status:404}); if(p.visibility==="private"&&(!me||me.id!==p.userId)) return NextResponse.json({error:"Private playlist"},{status:403}); const items=await db.select().from(s.playlistVideos).where(eq(s.playlistVideos.playlistId,id)); const vids=await db.select({v:s.videos,u:s.users}).from(s.videos).leftJoin(s.users,eq(s.videos.userId,s.users.id)); const videos=items.sort((a,b)=>a.position-b.position).map(it=>{const r=vids.find(x=>x.v.id===it.videoId); return r?{...r.v,creator:r.u?{id:r.u.id,displayName:r.u.displayName,username:r.u.username,avatarUrl:r.u.avatarUrl}:null}:null}).filter(Boolean); return NextResponse.json({playlist:p,videos}); }
  if(what==="history"){ if(!me) return NextResponse.json({videos:[]}); const h=await db.select().from(s.history).where(eq(s.history.userId,me.id)).orderBy(desc(s.history.watchedAt)); const vids=await db.select({v:s.videos,u:s.users}).from(s.videos).leftJoin(s.users,eq(s.videos.userId,s.users.id)); return NextResponse.json({videos:h.map(x=>vids.find(r=>r.v.id===x.videoId)).filter(Boolean).map((r:any)=>({...r.v,creator:r.u?{id:r.u.id,displayName:r.u.displayName,username:r.u.username,avatarUrl:r.u.avatarUrl}:null}))}); }
  if(what==="liked"){ if(!me) return NextResponse.json({videos:[]}); const r=await db.select().from(s.reactions).where(eq(s.reactions.userId,me.id)); const ids=r.filter(x=>x.type==="like").map(x=>x.videoId); const vids=await db.select({v:s.videos,u:s.users}).from(s.videos).leftJoin(s.users,eq(s.videos.userId,s.users.id)); return NextResponse.json({videos:vids.filter(x=>ids.includes(x.v.id)).map((r:any)=>({...r.v,creator:r.u?{id:r.u.id,displayName:r.u.displayName,username:r.u.username,avatarUrl:r.u.avatarUrl}:null}))}); }
  if(what==="channel"){
    const username=req.nextUrl.searchParams.get("username")||""; const userId=req.nextUrl.searchParams.get("userId")||"";
    let user:any; if(userId) [user]=await db.select().from(s.users).where(eq(s.users.id,userId)); else [user]=await db.select().from(s.users).where(eq(s.users.username,username));
    if(!user) return NextResponse.json({error:"Channel not found"},{status:404});
    const subs=await db.select().from(s.subscriptions).where(eq(s.subscriptions.creatorId,user.id));
    const subs2=await db.select().from(s.subscriptions).where(eq(s.subscriptions.followerId,user.id));
    const vids=await db.select().from(s.videos).where(eq(s.videos.userId,user.id)).orderBy(desc(s.videos.createdAt));
    const visible=vids.filter(v=>v.visibility==="public"||(me&&me.id===user.id));
    const pls=await db.select().from(s.playlists).where(eq(s.playlists.userId,user.id));
    const postsRows=await db.select().from(s.posts).where(eq(s.posts.userId,user.id)).orderBy(desc(s.posts.createdAt));
    // Never expose email, password hash, role or account status to visitors of a
    // public channel page. Only the account owner or staff may see privileged fields.
    const privileged = !!me && (me.id===user.id || me.role==="admin" || me.role==="owner");
    const pub = {
      id: user.id,
      displayName: user.displayName,
      username: user.username,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
      // The owner's crown is a deliberate public badge, so expose "owner" and nothing
      // else. Admin/staff roles stay hidden to keep staff accounts unenumerable.
      ...(user.role === "owner" ? { role: "owner" } : {}),
      ...(privileged ? { email: user.email, role: user.role, status: user.status, notifyLikes: user.notifyLikes, notifyComments: user.notifyComments } : {}),
    };
    return NextResponse.json({channel:pub,subscriberCount:subs.length,subscriptionCount:subs2.length,isSubscribed:me?subs.some(x=>x.followerId===me.id):false,videos:visible,playlists:pls.filter(p=>p.visibility==="public"||(me&&me.id===user.id)),posts:postsRows});
  }
  if(what==="channels"){ const q=(req.nextUrl.searchParams.get("q")||"").toLowerCase(); let us=await db.select().from(s.users); if(q) us=us.filter(u=>u.displayName.toLowerCase().includes(q)||u.username.toLowerCase().includes(q)); const subs=await db.select().from(s.subscriptions); return NextResponse.json({channels:us.map(u=>({id:u.id,displayName:u.displayName,username:u.username,avatarUrl:u.avatarUrl,bio:u.bio,createdAt:u.createdAt,subscribers:subs.filter(x=>x.creatorId===u.id).length}))}); }
  if(what==="dashboard"){ if(!me) return NextResponse.json({error:"Sign in"},{status:401}); const vids=await db.select().from(s.videos).where(eq(s.videos.userId,me.id)); const subs=await db.select().from(s.subscriptions).where(eq(s.subscriptions.creatorId,me.id)); const cms=await db.select({c:s.comments,u:s.users}).from(s.comments).innerJoin(s.users,eq(s.comments.userId,s.users.id)).orderBy(desc(s.comments.createdAt)); const myCms=cms.filter(r=>vids.some(v=>v.id===r.c.videoId)).slice(0,10); const reacts=await db.select().from(s.reactions); return NextResponse.json({stats:{videos:vids.filter(v=>!v.isShort).length,shorts:vids.filter(v=>v.isShort).length,subscribers:subs.length,views:vids.reduce((a,v)=>a+v.views,0),likes:reacts.filter(r=>r.type==="like"&&vids.some(v=>v.id===r.videoId)).length},videos:vids,recentComments:myCms.map(r=>({...r.c,user:{displayName:r.u.displayName,username:r.u.username,avatarUrl:r.u.avatarUrl}}))}); }
  if(what==="reports"){ const me2=await currentUser(); if(!me2||(me2.role!=="admin"&&me2.role!=="owner")) return NextResponse.json({error:"Admin only"},{status:403}); const rows=await db.select().from(s.reports).orderBy(desc(s.reports.createdAt)); return NextResponse.json({reports:rows}); }
  if(what==="live"){ const rows=await db.select({l:s.liveStreams,u:s.users}).from(s.liveStreams).innerJoin(s.users,eq(s.liveStreams.userId,s.users.id)).orderBy(desc(s.liveStreams.createdAt)); return NextResponse.json({streams:rows.map(r=>({...r.l,creator:{id:r.u.id,displayName:r.u.displayName,username:r.u.username,avatarUrl:r.u.avatarUrl}}))}); }
  if(what==="liveMessages"){ const streamId=req.nextUrl.searchParams.get("streamId")||""; const rows=await db.select({m:s.liveMessages,u:s.users}).from(s.liveMessages).innerJoin(s.users,eq(s.liveMessages.userId,s.users.id)).where(eq(s.liveMessages.streamId,streamId)).orderBy(s.liveMessages.createdAt); return NextResponse.json({messages:rows.map(r=>({...r.m,user:{displayName:r.u.displayName,username:r.u.username,avatarUrl:r.u.avatarUrl}}))}); }
  if(what==="posts"){
    const rows=await db.select({p:s.posts,u:s.users}).from(s.posts).innerJoin(s.users,eq(s.posts.userId,s.users.id)).orderBy(desc(s.posts.createdAt)).limit(50);
    const likes=await db.select().from(s.postLikes); const votes=await db.select().from(s.pollVotes); const cms=await db.select().from(s.comments);
    return NextResponse.json({posts:rows.map(r=>({...r.p,user:{id:r.u.id,displayName:r.u.displayName,username:r.u.username,avatarUrl:r.u.avatarUrl},likes:likes.filter(l=>l.postId===r.p.id).length,myLike:me?likes.some(l=>l.postId===r.p.id&&l.userId===me.id):false,commentCount:cms.filter(c=>c.postId===r.p.id).length,myVote:me?(votes.find(v=>v.postId===r.p.id&&v.userId===me.id)?.optionIndex??null):null,voteCounts:(Array.isArray(r.p.pollOptions)?r.p.pollOptions:[]).map((_:any,i:number)=>votes.filter(v=>v.postId===r.p.id&&v.optionIndex===i).length)}))});
  }
  return NextResponse.json({error:"Unknown query"},{status:400});
}

export async function POST(req:NextRequest){
  const me=await currentUser(); if(!me) return NextResponse.json({error:"Sign in required"},{status:401});
  const b=await req.json();
  if(b.action==="subscribe"){
    if(b.creatorId===me.id) return NextResponse.json({error:"You cannot subscribe to yourself"},{status:400});
    const all=await db.select().from(s.subscriptions).where(eq(s.subscriptions.creatorId,b.creatorId)); const mine=all.find(x=>x.followerId===me.id);
    if(mine){ await db.delete(s.subscriptions).where(eq(s.subscriptions.id,mine.id)); return NextResponse.json({isSubscribed:false,count:all.length-1}); }
    await db.insert(s.subscriptions).values({followerId:me.id,creatorId:b.creatorId}); await notify(b.creatorId,me.id,"subscribe",`${me.displayName} subscribed to your channel`); return NextResponse.json({isSubscribed:true,count:all.length+1});
  }
  if(b.action==="createPlaylist"){ if(!(b.title||"").trim()) return NextResponse.json({error:"Playlist title required"},{status:400}); const [p]=await db.insert(s.playlists).values({userId:me.id,title:b.title.trim(),visibility:b.visibility||"public"}).returning(); return NextResponse.json({playlist:p}); }
  if(b.action==="renamePlaylist"){ const [p]=await db.select().from(s.playlists).where(eq(s.playlists.id,b.playlistId)); if(!p||p.userId!==me.id) return NextResponse.json({error:"Not your playlist"},{status:403}); const [u]=await db.update(s.playlists).set({title:b.title,visibility:b.visibility||p.visibility}).where(eq(s.playlists.id,b.playlistId)).returning(); return NextResponse.json({playlist:u}); }
  if(b.action==="deletePlaylist"){ const [p]=await db.select().from(s.playlists).where(eq(s.playlists.id,b.playlistId)); if(!p||(p.userId!==me.id&&me.role!=="admin"&&me.role!=="owner")) return NextResponse.json({error:"Not your playlist"},{status:403}); await db.delete(s.playlists).where(eq(s.playlists.id,b.playlistId)); return NextResponse.json({ok:true}); }
  if(b.action==="togglePlaylistVideo"){
    const [p]=await db.select().from(s.playlists).where(eq(s.playlists.id,b.playlistId)); if(!p||p.userId!==me.id) return NextResponse.json({error:"Not your playlist"},{status:403});
    const items=await db.select().from(s.playlistVideos).where(eq(s.playlistVideos.playlistId,b.playlistId)); const ex=items.find(i=>i.videoId===b.videoId);
    if(ex){ await db.delete(s.playlistVideos).where(eq(s.playlistVideos.id,ex.id)); return NextResponse.json({added:false}); }
    await db.insert(s.playlistVideos).values({playlistId:b.playlistId,videoId:b.videoId,position:items.length}); return NextResponse.json({added:true});
  }
  if(b.action==="clearHistory"){ await db.delete(s.history).where(eq(s.history.userId,me.id)); return NextResponse.json({ok:true}); }
  if(b.action==="readNotifications"){ await db.update(s.notifications).set({isRead:true}).where(eq(s.notifications.userId,me.id)); return NextResponse.json({ok:true}); }
  if(b.action==="createPost"){
    if(!(b.content||"").trim()&&!b.pollQuestion) return NextResponse.json({error:"Write something first"},{status:400});
    const opts=b.pollQuestion? (b.pollOptions||[]).filter((x:string)=>x.trim()).slice(0,4):[]; if(b.pollQuestion&&opts.length<2) return NextResponse.json({error:"Polls need at least 2 options"},{status:400});
    const [p]=await db.insert(s.posts).values({userId:me.id,content:(b.content||"").trim().slice(0,2000),imageUrl:b.imageUrl||"",pollQuestion:b.pollQuestion||"",pollOptions:opts}).returning();
    const subs=await db.select().from(s.subscriptions).where(eq(s.subscriptions.creatorId,me.id)); // not notifying for posts to avoid spam, posts appear in channel
    return NextResponse.json({post:p});
  }
  if(b.action==="likePost"){ const all=await db.select().from(s.postLikes).where(eq(s.postLikes.postId,b.postId)); const mine=all.find(x=>x.userId===me.id); if(mine) await db.delete(s.postLikes).where(eq(s.postLikes.id,mine.id)); else await db.insert(s.postLikes).values({userId:me.id,postId:b.postId}); const after=await db.select().from(s.postLikes).where(eq(s.postLikes.postId,b.postId)); return NextResponse.json({likes:after.length,myLike:!mine}); }
  if(b.action==="deletePost"){ const [p]=await db.select().from(s.posts).where(eq(s.posts.id,b.postId)); if(!p||(p.userId!==me.id&&me.role!=="admin"&&me.role!=="owner")) return NextResponse.json({error:"Not allowed"},{status:403}); await db.delete(s.comments).where(eq(s.comments.postId,b.postId)); await db.delete(s.posts).where(eq(s.posts.id,b.postId)); return NextResponse.json({ok:true}); }
  if(b.action==="editPost"){ const [p]=await db.select().from(s.posts).where(eq(s.posts.id,b.postId)); if(!p||p.userId!==me.id) return NextResponse.json({error:"Not allowed"},{status:403}); const [u]=await db.update(s.posts).set({content:(b.content||"").slice(0,2000)}).where(eq(s.posts.id,b.postId)).returning(); return NextResponse.json({post:u}); }
  if(b.action==="votePoll"){ const ex=await db.select().from(s.pollVotes).where(eq(s.pollVotes.postId,b.postId)); const mine=ex.find(v=>v.userId===me.id); if(mine) await db.update(s.pollVotes).set({optionIndex:b.optionIndex}).where(eq(s.pollVotes.id,mine.id)); else await db.insert(s.pollVotes).values({userId:me.id,postId:b.postId,optionIndex:b.optionIndex}); return NextResponse.json({ok:true}); }
  if(b.action==="commentPost"){ const content=(b.content||"").trim(); if(!content) return NextResponse.json({error:"Empty comment"},{status:400}); const [c]=await db.insert(s.comments).values({userId:me.id,postId:b.postId,parentId:b.parentId||undefined,content}).returning(); const [p]=await db.select().from(s.posts).where(eq(s.posts.id,b.postId)); if(p&&p.userId!==me.id) await notify(p.userId,me.id,"post_comment",`${me.displayName} commented on your post`); return NextResponse.json({comment:c}); }
  if(b.action==="report"){ if(!(b.reason||"").trim()) return NextResponse.json({error:"Give a reason"},{status:400}); const [r]=await db.insert(s.reports).values({reporterId:me.id,targetType:b.targetType,targetId:String(b.targetId),reason:b.reason.trim().slice(0,500)}).returning(); return NextResponse.json({report:r,message:"Report submitted. Our moderation team (admins) can review it in the Admin queue."}); }
  if(b.action==="resolveReport"){ if(me.role!=="admin"&&me.role!=="owner") return NextResponse.json({error:"Admin only"},{status:403}); await db.update(s.reports).set({status:b.status||"reviewed"}).where(eq(s.reports.id,b.reportId)); return NextResponse.json({ok:true}); }
  if(b.action==="block"){ if(b.userId===me.id) return NextResponse.json({error:"Cannot block yourself"},{status:400}); const all=await db.select().from(s.blocks); const ex=all.find(x=>x.blockerId===me.id&&x.blockedId===b.userId); if(ex){await db.delete(s.blocks).where(eq(s.blocks.id,ex.id)); return NextResponse.json({blocked:false});} await db.insert(s.blocks).values({blockerId:me.id,blockedId:b.userId}); return NextResponse.json({blocked:true}); }
  if(b.action==="createLive"){ if(!(b.title||"").trim()) return NextResponse.json({error:"Stream title required"},{status:400}); const [l]=await db.insert(s.liveStreams).values({userId:me.id,title:b.title.trim(),description:b.description||"",visibility:b.visibility||"public",status:"scheduled",scheduledAt:b.scheduledAt?new Date(b.scheduledAt):undefined}).returning(); return NextResponse.json({stream:l,note:"Scheduling & chat are live in ARINX. Camera ingest (RTMP/WebRTC) needs a media server (e.g. Mux/Livepeer/ovenmedia) — add its API keys to go fully live."}); }
  if(b.action==="liveStatus"){ const [l]=await db.select().from(s.liveStreams).where(eq(s.liveStreams.id,b.streamId)); const staffAct=me.role==="admin"||me.role==="owner"; if(!l||(l.userId!==me.id&&!(staffAct&&b.status==="ended"))) return NextResponse.json({error:"Only the streamer (or an admin ending it) can change status"},{status:403}); const [u]=await db.update(s.liveStreams).set({status:b.status}).where(eq(s.liveStreams.id,b.streamId)).returning(); if(b.status==="live"){ const subs=await db.select().from(s.subscriptions).where(eq(s.subscriptions.creatorId,me.id)); for(const sub of subs) await notify(sub.followerId,me.id,"live",`${me.displayName} scheduled/started a stream: ${l.title}`);} return NextResponse.json({stream:u}); }
  if(b.action==="liveMessage"){ if(!(b.content||"").trim()) return NextResponse.json({error:"Empty message"},{status:400}); const [m]=await db.insert(s.liveMessages).values({streamId:b.streamId,userId:me.id,content:b.content.trim().slice(0,300)}).returning(); return NextResponse.json({message:m}); }
  return NextResponse.json({error:"Unknown action"},{status:400});
}
