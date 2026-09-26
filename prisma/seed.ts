import "dotenv/config";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString=process.env.DATABASE_URL;if(!connectionString)throw new Error("DATABASE_URL is required");
const db=new PrismaClient({adapter:new PrismaPg({connectionString})});
const plans=[
 {name:"Essai gratuit",slug:"free-trial",description:"Découvrez le tracking et les analyses ADPulse.",price:0,currency:"EUR",billingInterval:"MONTH" as const,trialDays:14,limits:{clicks:1000,workspaces:1,members:1},features:["Campagnes et liens","Analyses essentielles","Conversions"],sortOrder:0},
 {name:"Starter",slug:"starter",description:"Pour les indépendants et petites équipes.",price:29,currency:"EUR",billingInterval:"MONTH" as const,trialDays:14,limits:{clicks:25000,workspaces:1,members:3},features:["25 000 clics par mois","Routage intelligent","Alertes de performance","Support standard"],sortOrder:10},
 {name:"Pro",slug:"pro",description:"Pour les équipes multicanales en croissance.",price:79,currency:"EUR",billingInterval:"MONTH" as const,trialDays:14,limits:{clicks:150000,workspaces:5,members:15},features:["150 000 clics par mois","Intégrations publicitaires","Automatisations avancées","Support prioritaire"],sortOrder:20}
];
async function main(){for(const plan of plans)await db.plan.upsert({where:{slug:plan.slug},update:plan,create:plan});const email=process.env.ADMIN_EMAIL?.toLowerCase();const password=process.env.ADMIN_PASSWORD;if(email&&password){if(password.length<12)throw new Error("ADMIN_PASSWORD must contain at least 12 characters");const user=await db.user.upsert({where:{email},update:{systemRole:"ADMIN",emailVerifiedAt:new Date()},create:{email,name:process.env.ADMIN_NAME??"Administrateur ADPulse",passwordHash:await hash(password,12),systemRole:"ADMIN",emailVerifiedAt:new Date(),onboardingCompletedAt:new Date()}});const membership=await db.workspaceMember.findFirst({where:{userId:user.id}});if(!membership){await db.workspace.create({data:{name:"Administration ADPulse",slug:`admin-${user.id.slice(-6)}`,members:{create:{userId:user.id,role:"OWNER"}}}})}}}
main().finally(()=>db.$disconnect());
