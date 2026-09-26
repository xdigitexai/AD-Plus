import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { assertSameOrigin } from "@/lib/security";
import { getWorkspaceForUser } from "@/lib/workspace";
const schema=z.object({name:z.string().min(2).max(100),company:z.string().min(2).max(120),country:z.string().min(2).max(80),objective:z.string().min(2).max(80),spend:z.string().min(1).max(40),channels:z.array(z.string().max(30)).max(10)});
export async function POST(req:NextRequest){try{assertSameOrigin(req);const user=await getCurrentUser();if(!user)return NextResponse.json({error:"Non authentifié."},{status:401});const input=schema.parse(await req.json());const {workspace}=await getWorkspaceForUser(user.id);await db.$transaction([db.user.update({where:{id:user.id},data:{name:input.name,company:input.company,country:input.country,advertisingObjective:input.objective,monthlyAdSpend:input.spend,preferredChannels:input.channels,onboardingCompletedAt:new Date()}}),db.workspace.update({where:{id:workspace.id},data:{name:input.company}}),db.auditLog.create({data:{actorId:user.id,workspaceId:workspace.id,action:"ONBOARDING_COMPLETED",entityType:"Workspace",entityId:workspace.id}})]);return NextResponse.json({ok:true})}catch(error){if(error instanceof z.ZodError)return NextResponse.json({error:"Vérifiez les informations saisies."},{status:400});return NextResponse.json({error:"Configuration impossible."},{status:500})}}
