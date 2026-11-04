import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db"; import { videos, users, reactions, subscriptions, comments } from "@/db/schema";
import { eq, desc, ilike, or, and, count, inArray } from "drizzle-orm";
import { ensureSeed, currentUser } from "@/lib/auth";

async function enrich(list:any[], me:any){
  if(!list.length) return [];
  const ids=list.map(v=>v.id);
  const reacts=await db.select().from(reactions).where(inArray(reactions.videoId,ids));
  const cms=await db.select({videoId:comments.videoId,c:count()}).from(comments).where(inArray(comments.videoId,ids)).groupBy(comments.videoId);
  const creators=list.filter(v=>v.userId).map(v=>v.userId);
  const subs = creators.length? await db.select().from(subscriptions).where(inArray(subscriptions.creatorId,creators as string[])) : [];
  return list.map(v=>({
    ...v,
    likes:reacts.filter(r=>r.videoId===v.id&&r.type==="like").length,
    dislikes:reacts.filter(r=>r.videoId===v.id&&r.type==="dislike").length,
    myReaction: me? (reacts.find(r=>r.videoId===v.id&&r.userId===me.id)?.type||null):null,
    commentCount: Number(cms.find(c=>c.videoId===v.id)?.c||0),
    creatorSubscribers: subs.filter(s=>s.creatorId===v.userId).length,
    isSubscribed: me? subs.some(s=>s.creatorId===v.userId&&s.followerId===me.id):false,
  }));
}
export async function GET(req:NextRequest){
  await ensureSeed();
  const sp=req.nextUrl.searchParams; const q=sp.get("q")||""; const category=sp.get("category")||"All"; const type=sp.get("type")||"all"; const sort=sp.get("sort")||"new"; const channelId=sp.get("channelId")||""; const country=(sp.get("country")||"").toUpperCase(); const page=Math.max(1,Number.parseInt(sp.get("page")||"1",10)||1); const pageSize=Math.min(48,Math.max(1,Number.parseInt(sp.get("limit")||"36",10)||36)); const me=await currentUser();
  let rows=await db.select({v:videos,u:users}).from(videos).leftJoin(users,eq(videos.userId,users.id)).orderBy(desc(videos.createdAt));
  // `role` is exposed so the owner's crown badge can render publicly; email is never included.
  let list=rows.map(r=>({...r.v, creator:r.u?{id:r.u.id,displayName:r.u.displayName,username:r.u.username,avatarUrl:r.u.avatarUrl,role:r.u.role}:null}));
  // visibility: public always; unlisted only via direct id; private only owner
  // Never surface a video that has not finished uploading as though it were published.
  const isStaff=me&&(me.role==="admin"||me.role==="owner");
  list=list.filter(v=>{
    const ownerView = me && v.userId===me.id;
    if(v.status!=="ready" && !ownerView && !isStaff) return false;
    return v.visibility==="public" || ownerView || !!isStaff;
  });
  if(channelId) list=list.filter(v=>v.userId===channelId);
  if(category!=="All") list=list.filter(v=>v.category===category);
  if(country) list=list.filter(v=>v.creatorCountry===country);
  if(type==="shorts") list=list.filter(v=>v.isShort); if(type==="videos") list=list.filter(v=>!v.isShort);
  if(q){ const s=q.toLowerCase(); list=list.filter(v=> v.title.toLowerCase().includes(s)||v.description.toLowerCase().includes(s)||v.category.toLowerCase().includes(s)||(v.creator?.displayName||"").toLowerCase().includes(s)||(v.creator?.username||"").toLowerCase().includes(s)||(v.youtubeChannel||"").toLowerCase().includes(s)); }
  if(sort==="views") list.sort((a,b)=>b.views-a.views); if(sort==="old") list.reverse();
  // subscriptions feed
  if(sp.get("feed")==="subscriptions"){ if(!me) return NextResponse.json({videos:[],total:0,page,limit:pageSize,hasMore:false}); const mySubs=await db.select().from(subscriptions).where(eq(subscriptions.followerId,me.id)); const cids=mySubs.map(s=>s.creatorId); list=list.filter(v=>v.userId&&cids.includes(v.userId)); }
  const total=list.length;
  const pageItems=list.slice((page-1)*pageSize,page*pageSize);
  return NextResponse.json({videos:await enrich(pageItems,me),total,page,limit:pageSize,hasMore:page*pageSize<total});
}
