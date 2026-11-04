import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db"; import { comments, users, commentLikes, videos, adminLogs } from "@/db/schema"; import { eq, desc, count } from "drizzle-orm"; import { currentUser } from "@/lib/auth";
export async function GET(req:NextRequest){
  const videoId=req.nextUrl.searchParams.get("videoId")||""; const postId=req.nextUrl.searchParams.get("postId")||"";
  let rows=await db.select({c:comments,u:users}).from(comments).innerJoin(users,eq(comments.userId,users.id)).orderBy(desc(comments.createdAt));
  if(videoId) rows=rows.filter(r=>r.c.videoId===videoId); if(postId) rows=rows.filter(r=>r.c.postId===postId);
  const me=await currentUser(); const likes=await db.select().from(commentLikes);
  const map=(r:any)=>({...r.c,user:{id:r.u.id,displayName:r.u.displayName,username:r.u.username,avatarUrl:r.u.avatarUrl},likes:likes.filter(l=>l.commentId===r.c.id).length,myLike:me?likes.some(l=>l.commentId===r.c.id&&l.userId===me.id):false});
  const tops=rows.filter(r=>!r.c.parentId).map(r=>({...map(r),replies:rows.filter(x=>x.c.parentId===r.c.id).map(map)}));
  return NextResponse.json({comments:tops,total:rows.length});
}
export async function POST(req:NextRequest){
  const me=await currentUser(); if(!me) return NextResponse.json({error:"Sign in required"},{status:401});
  const b=await req.json(); const id=b.id;
  const [c]=await db.select().from(comments).where(eq(comments.id,id)); if(!c) return NextResponse.json({error:"Comment not found"},{status:404});
  if(b.action==="like"){ const all=await db.select().from(commentLikes).where(eq(commentLikes.commentId,id)); const mine=all.find(l=>l.userId===me.id); if(mine) await db.delete(commentLikes).where(eq(commentLikes.id,mine.id)); else await db.insert(commentLikes).values({userId:me.id,commentId:id}); const after=await db.select().from(commentLikes).where(eq(commentLikes.commentId,id)); return NextResponse.json({likes:after.length,myLike:!mine}); }
  if(b.action==="edit"){ if(c.userId!==me.id) return NextResponse.json({error:"You can only edit your own comments"},{status:403}); const [u]=await db.update(comments).set({content:(b.content||"").trim().slice(0,1000)}).where(eq(comments.id,id)).returning(); return NextResponse.json({comment:u}); }
  if(b.action==="delete"){
    let allowed=c.userId===me.id||me.role==="admin"||me.role==="owner";
    if(!allowed&&c.videoId){ const [v]=await db.select().from(videos).where(eq(videos.id,c.videoId)); if(v&&v.userId===me.id) allowed=true; }
    if(!allowed) return NextResponse.json({error:"Not allowed to delete this comment"},{status:403});
    await db.delete(comments).where(eq(comments.parentId,id));
    await db.delete(comments).where(eq(comments.id,id));
    if(c.userId!==me.id&&(me.role==="admin"||me.role==="owner")){ try{ await db.insert(adminLogs).values({actorId:me.id,action:"deleteComment",targetType:"comment",targetId:id,detail:c.content.slice(0,120)}); }catch{} }
    return NextResponse.json({ok:true});
  }
  return NextResponse.json({error:"Unknown"},{status:400});
}
