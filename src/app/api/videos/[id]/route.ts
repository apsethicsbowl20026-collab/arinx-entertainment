import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db"; import { videos, users, reactions, comments, history, viewEvents, subscriptions, adminLogs } from "@/db/schema";
import { eq, count, desc } from "drizzle-orm";
import { currentUser, notify } from "@/lib/auth"; import { isStaff } from "@/lib/admin"; import { deleteMedia, isRemoteStorage } from "@/lib/storage"; import fs from "fs"; import path from "path";
async function load(id:string){ const rows=await db.select({v:videos,u:users}).from(videos).leftJoin(users,eq(videos.userId,users.id)).where(eq(videos.id,id)); if(!rows.length) return null; const r=rows[0]; return {...r.v, creator:r.u?{id:r.u.id,displayName:r.u.displayName,username:r.u.username,avatarUrl:r.u.avatarUrl,bio:r.u.bio,createdAt:r.u.createdAt,role:r.u.role}:null}; }
export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const me=await currentUser(); const v:any=await load(id); if(!v) return NextResponse.json({error:"Video not found or unavailable"},{status:404});
  if(v.visibility==="private" && (!me|| (me.id!==v.userId && !isStaff(me)))) return NextResponse.json({error:"This video is private"},{status:403});
  if(v.status!=="ready" && (!me || (me.id!==v.userId && !isStaff(me)))) return NextResponse.json({error:"This video is still processing or its upload did not complete, so it is not available yet."},{status:404});
  const reacts=await db.select().from(reactions).where(eq(reactions.videoId,id));
  const subs=v.userId?await db.select().from(subscriptions).where(eq(subscriptions.creatorId,v.userId)):[];
  return NextResponse.json({video:{...v,likes:reacts.filter(r=>r.type==="like").length,dislikes:reacts.filter(r=>r.type==="dislike").length,myReaction:me?(reacts.find(r=>r.userId===me.id)?.type||null):null,creatorSubscribers:subs.length,isSubscribed:me?subs.some(s=>s.followerId===me.id):false}});
}
export async function PATCH(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const me=await currentUser(); if(!me) return NextResponse.json({error:"Sign in required"},{status:401});
  const v:any=await load(id); if(!v||(v.userId!==me.id && !isStaff(me))) return NextResponse.json({error:"Only the owner or an ARINX admin can edit this video"},{status:403});
  const b=await req.json(); const [upd]=await db.update(videos).set({title:(b.title??v.title).trim(),description:b.description??v.description,category:b.category??v.category,visibility:b.visibility??v.visibility,allowDownload:b.allowDownload??v.allowDownload,thumbnailUrl:b.thumbnailUrl??v.thumbnailUrl}).where(eq(videos.id,id)).returning(); return NextResponse.json({video:upd});
}
export async function DELETE(_:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const me=await currentUser(); if(!me) return NextResponse.json({error:"Sign in required"},{status:401});
  const v:any=await load(id); if(!v) return NextResponse.json({error:"Not found"},{status:404}); if(v.userId!==me.id && !isStaff(me)) return NextResponse.json({error:"Only owner/admin can delete"},{status:403});
  if(v.fileName){ if(isRemoteStorage()) await deleteMedia(v.fileName); else { try{fs.unlinkSync(path.join(process.cwd(),"uploads",v.fileName))}catch{} } }
  await db.delete(videos).where(eq(videos.id,id));
  if(v.userId!==me.id){ try{ await db.insert(adminLogs).values({actorId:me.id,action:"deleteVideo",targetType:"video",targetId:id,detail:`${v.title} (owner ${v.userId||"external"}) via video route`}); }catch{} }
  return NextResponse.json({ok:true});
}
export async function POST(req:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params; const me=await currentUser(); const b=await req.json(); const v:any=await load(id); if(!v) return NextResponse.json({error:"Not found"},{status:404});
  if(b.action==="view"){
    // Count a view only on explicit play event; dedupe same user/anon within 30 min handled client-side + check recent
    const anon=b.anonId||"anon"; const recent=await db.select().from(viewEvents).where(eq(viewEvents.videoId,id));
    const cutoff=Date.now()-30*60*1000; const dup=recent.some(r=> (me?r.userId===me.id:r.anonId===anon) && new Date(r.createdAt).getTime()>cutoff);
    if(!dup){ await db.insert(viewEvents).values({videoId:id,userId:me?.id,anonId:anon}); await db.update(videos).set({views:v.views+1}).where(eq(videos.id,id)); }
    if(me){ const h=await db.select().from(history).where(eq(history.userId,me.id)); const ex=h.find(x=>x.videoId===id); if(ex) await db.update(history).set({watchedAt:new Date()}).where(eq(history.id,ex.id)); else await db.insert(history).values({userId:me.id,videoId:id}); }
    return NextResponse.json({ok:true,counted:!dup});
  }
  if(!me) return NextResponse.json({error:"Sign in required"},{status:401});
  if(b.action==="reaction"){
    const type=b.type; // like|dislike|null
    const ex=await db.select().from(reactions).where(eq(reactions.videoId,id)); const mine=ex.find(r=>r.userId===me.id);
    if(mine) await db.delete(reactions).where(eq(reactions.id,mine.id));
    if(type && (!mine||mine.type!==type)){ await db.insert(reactions).values({userId:me.id,videoId:id,type}); if(type==="like"&&v.userId) { const owner=await db.select().from(users).where(eq(users.id,v.userId)); if(owner[0]?.notifyLikes) await notify(v.userId,me.id,"like",`${me.displayName} liked your video “${v.title}”`,id);} }
    const all=await db.select().from(reactions).where(eq(reactions.videoId,id));
    return NextResponse.json({likes:all.filter(r=>r.type==="like").length,dislikes:all.filter(r=>r.type==="dislike").length,myReaction:type&&(!mine||mine.type!==type)?type:null});
  }
  if(b.action==="comment"){
    const content=(b.content||"").trim(); if(!content) return NextResponse.json({error:"Comment cannot be empty"},{status:400}); if(content.length>1000) return NextResponse.json({error:"Comment too long (max 1000)"},{status:400});
    const [c]=await db.insert(comments).values({userId:me.id,videoId:id,parentId:b.parentId||undefined,content}).returning();
    if(b.parentId){ const parent=await db.select().from(comments).where(eq(comments.id,b.parentId)); if(parent[0]&&parent[0].userId!==me.id) await notify(parent[0].userId,me.id,"reply",`${me.displayName} replied to your comment`,id); }
    else if(v.userId&&v.userId!==me.id){ const owner=await db.select().from(users).where(eq(users.id,v.userId)); if(owner[0]?.notifyComments) await notify(v.userId,me.id,"comment",`${me.displayName} commented on “${v.title}”`,id); }
    return NextResponse.json({comment:{...c,user:{id:me.id,displayName:me.displayName,username:me.username,avatarUrl:me.avatarUrl},likes:0,myLike:false,replies:[]}});
  }
  return NextResponse.json({error:"Unknown action"},{status:400});
}
