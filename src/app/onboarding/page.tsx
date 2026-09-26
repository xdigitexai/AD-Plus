import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { OnboardingForm } from "@/components/onboarding-form";
import { requireUser } from "@/lib/auth";
export const dynamic="force-dynamic";export const metadata={title:"Configuration"};
export default async function Onboarding(){const user=await requireUser();if(user.onboardingCompletedAt)redirect("/app");return <main className="onboarding-page"><div className="onboarding-wrap"><Brand/><div className="onboarding-progress"><span>1</span><i/><span className="active">2</span><i/><span>3</span></div><header><span>BIENVENUE SUR ADPULSE</span><h1>Configurons votre espace.</h1><p>Quelques informations nous aideront à adapter votre expérience. Vous pourrez les modifier à tout moment.</p></header><OnboardingForm name={user.name}/></div></main>}
