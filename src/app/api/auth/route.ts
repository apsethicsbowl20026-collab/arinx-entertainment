import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db"; import { users } from "@/db/schema"; import { eq, count } from "drizzle-orm";
import { hashPw, verifyPw, createSession, destroySession, currentUser, publicUser } from "@/lib/auth";
import { isOwnerEmail, roleForEmail } from "@/lib/admin";
export async function GET(){
  const u=await currentUser();
  if(u && isOwnerEmail(u.email) && u.role!=="owner"){
    const [upd]=await db.update(users).set({role:"owner",status:"active"}).where(eq(users.id,u.id)).returning();
    return NextResponse.json({user:publicUser(upd)});
  }
  return NextResponse.json({user:publicUser(u)});
}
export async function POST(req:NextRequest){
  const body=await req.json(); const action=body.action;
  if(action==="logout"){ await destroySession(); return NextResponse.json({ok:true}); }
  if(action==="register"){
    const email=(body.email||"").trim().toLowerCase(), password=body.password||"", displayName=(body.displayName||"").trim(), username=(body.username||"").trim().toLowerCase().replace(/[^a-z0-9_]/g,"");
    if(!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({error:"Enter a valid email address"},{status:400});
    if(password.length<8) return NextResponse.json({error:"Password must be at least 8 characters"},{status:400});
    if(displayName.length<2||username.length<3) return NextResponse.json({error:"Display name (2+) and username (3+, letters/numbers/_) required"},{status:400});
    const exists=await db.select().from(users).where(eq(users.email,email)); if(exists.length) return NextResponse.json({error:"Email already registered. Sign in instead."},{status:409});
    const un=await db.select().from(users).where(eq(users.username,username)); if(un.length) return NextResponse.json({error:"Username already taken"},{status:409});
    const total=await db.select({c:count()}).from(users); const role=roleForEmail(email, total[0].c===0?"admin":"user");
    const [u]=await db.insert(users).values({email,passwordHash:await hashPw(password),displayName,username,role,status:"active",bio:""}).returning();
    await createSession(u.id); return NextResponse.json({user:publicUser(u)});
  }
  if(action==="login"){
    const email=(body.email||"").trim().toLowerCase(), password=body.password||"";
    const [u]=await db.select().from(users).where(eq(users.email,email));
    if(!u||!(await verifyPw(password,u.passwordHash))) return NextResponse.json({error:"Invalid email or password"},{status:401});
    if(u.status==="suspended") return NextResponse.json({error:"This account is suspended. Contact ARINX support if you believe this is a mistake."},{status:403});
    let account=u;
    if(isOwnerEmail(email) && u.role!=="owner"){
      const [upd]=await db.update(users).set({role:"owner",status:"active"}).where(eq(users.id,u.id)).returning();
      account=upd;
    }
    await createSession(account.id); return NextResponse.json({user:publicUser(account)});
  }
  if(action==="updateProfile"){
    const u=await currentUser(); if(!u) return NextResponse.json({error:"Sign in required"},{status:401});
    const displayName=(body.displayName??u.displayName).trim(), username=(body.username??u.username).trim().toLowerCase().replace(/[^a-z0-9_]/g,""), bio=(body.bio??u.bio).slice(0,500);
    if(username!==u.username){ const ex=await db.select().from(users).where(eq(users.username,username)); if(ex.length) return NextResponse.json({error:"Username taken"},{status:409}); }
    const [upd]=await db.update(users).set({displayName,username,bio,avatarUrl:body.avatarUrl??u.avatarUrl,notifyLikes:body.notifyLikes??u.notifyLikes,notifyComments:body.notifyComments??u.notifyComments}).where(eq(users.id,u.id)).returning();
    return NextResponse.json({user:publicUser(upd)});
  }
  if(action==="changePassword"){
    const u=await currentUser(); if(!u) return NextResponse.json({error:"Sign in required"},{status:401});
    if(!(await verifyPw(body.currentPassword||"",u.passwordHash))) return NextResponse.json({error:"Current password is incorrect"},{status:400});
    if((body.newPassword||"").length<8) return NextResponse.json({error:"New password must be at least 8 characters"},{status:400});
    await db.update(users).set({passwordHash:await hashPw(body.newPassword)}).where(eq(users.id,u.id)); return NextResponse.json({ok:true,message:"Password updated. Note: email verification & password-reset email require an email provider (SMTP/Resend) — add credentials to enable those flows."});
  }
  if(action==="resetRequest"){
    // Honest boundary: no email provider configured in this environment
    return NextResponse.json({error:"Password-reset email is not configured yet. Add an email provider (e.g. Resend/SMTP keys in .env) to enable reset emails. Your account password was not changed."},{status:501});
  }
  if(action==="deleteAccount"){
    const u=await currentUser(); if(!u) return NextResponse.json({error:"Sign in required"},{status:401});
    if(!(await verifyPw(body.password||"",u.passwordHash))) return NextResponse.json({error:"Password incorrect — account not deleted"},{status:400});
    if(isOwnerEmail(u.email) || u.role==="owner") return NextResponse.json({error:"The ARINX owner account cannot be deleted."},{status:403});
    await db.delete(users).where(eq(users.id,u.id)); await destroySession(); return NextResponse.json({ok:true});
  }
  return NextResponse.json({error:"Unknown action"},{status:400});
}
