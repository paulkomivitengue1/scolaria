import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const DEV_CODE = Deno.env.get("ADMIN_DEV_CODE");
const ADMIN_EMAIL = "paulkomivitengue@gmail.com";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
type Plan = "Essentiel" | "Premium" | "Élite";
type Period = "mensuel" | "annuel";
interface VisitInput { id?: string; visitor_id?: string; session_id?: string; page_path?: string; referrer_origin?: string | null; utm_source?: string | null; utm_medium?: string | null; utm_campaign?: string | null; device_type?: string; operating_system?: string; browser?: string; screen_size?: string | null; language?: string | null; timezone?: string | null; }
interface Body { code?: string; action: string; paymentId?: string; schoolId?: string; status?: "suspend"|"restore"; paid?: boolean; plan?: Plan; billingPeriod?: Period; trialDays?: number; plans?: {name: Plan; monthly: number}[]; visit?: VisitInput; visit_id?: string; duration_seconds?: number; }
const prices: Record<Plan, number> = {Essentiel:10000, Premium:20000, "Élite":30000};
Deno.serve(async (req: Request) => {
 if(req.method==="OPTIONS") return new Response(null,{status:200,headers:corsHeaders});
 const respond=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
 try {
  const b:Body=await req.json();
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (b.action === "record_visit") {
   const v = b.visit;
   if (!v || !uuidPattern.test(v.id || "") || !uuidPattern.test(v.visitor_id || "") || !uuidPattern.test(v.session_id || "")) return respond({error:"Visite invalide"},400);
   if (!["/","/auth","/app"].includes(v.page_path || "")) return respond({error:"Page invalide"},400);
   const allowedDevices = ["Téléphone","Tablette","Ordinateur","Autre / non identifié"];
   const clean = (value: unknown, max = 120): string | null => typeof value === "string" ? value.replace(/[<>\u0000-\u001f]/g,"").slice(0,max) || null : null;
   const {error}=await supabase.from("visitor_visits").insert({
    id:v.id, visitor_id:v.visitor_id, session_id:v.session_id, page_path:v.page_path,
    referrer_origin:clean(v.referrer_origin,200), utm_source:clean(v.utm_source), utm_medium:clean(v.utm_medium), utm_campaign:clean(v.utm_campaign),
    device_type:allowedDevices.includes(v.device_type || "") ? v.device_type : "Autre / non identifié",
    operating_system:clean(v.operating_system) || "Autre / non identifié", browser:clean(v.browser) || "Autre / non identifié",
    screen_size:clean(v.screen_size,24), language:clean(v.language,24), timezone:clean(v.timezone,80)
   });
   if(error) throw error;
   return respond({ok:true});
  }
  if (b.action === "finish_visit") {
   if (!uuidPattern.test(b.visit_id || "") || !Number.isInteger(b.duration_seconds) || b.duration_seconds! < 0 || b.duration_seconds! > 86400) return respond({error:"Durée de visite invalide"},400);
   const {error}=await supabase.from("visitor_visits").update({duration_seconds:b.duration_seconds}).eq("id",b.visit_id).is("duration_seconds",null);
   if(error) throw error;
   return respond({ok:true});
  }
  if(!DEV_CODE) return respond({error:"Configuration administrateur manquante"},500);
  if(b.action==="get_public_pricing") {
   const {data,error}=await supabase.from("gestilys_public_settings").select("plans,updated_at").eq("id",1).single();
   if(error)throw error;
   return respond({data});
  }
  if(b.action==="get_public_trial_days") {
   const {data,error}=await supabase.from("gestilys_public_settings").select("trial_days").eq("id",1).single();
   if(error)throw error;
   const days=Number(data.trial_days);return respond({data:{trial_days:Number.isInteger(days)&&days>=0&&days<=365?days:14}});
  }
  const authHeader = req.headers.get("Authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const { data: authData, error: authError } = await supabase.auth.getUser(bearerToken);
  // Le gateway vérifie déjà la signature du JWT (verify_jwt=true). En cas
  // d'échec transitoire de getUser, utiliser uniquement l'e-mail du JWT vérifié.
  let tokenEmail = "";
  try {
   const payload = bearerToken.split(".")[1];
   if (payload) {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")));
    tokenEmail = String(decoded.email || "").trim().toLowerCase();
   }
  } catch { tokenEmail = ""; }
  const verifiedEmail = String(authData.user?.email || tokenEmail).trim().toLowerCase();
  // L'accès reste limité au compte administrateur et au code développeur.
  if (!bearerToken || (authError && !tokenEmail) || verifiedEmail !== ADMIN_EMAIL) {
   return respond({error:"Accès administrateur réservé au compte autorisé."},403);
  }
  if(String(b.code ?? '').trim() !== String(DEV_CODE ?? '').trim()) return respond({error:"Code développeur invalide"},401);
  const {action,paymentId,schoolId}=b;
  switch(action) {
   case "save_trial_days": {
    if(!Number.isInteger(b.trialDays)||b.trialDays!<0||b.trialDays!>365)throw new Error("Durée d’essai invalide (0 à 365 jours).");
    const {data:current,error:readError}=await supabase.from("gestilys_public_settings").select("plans").eq("id",1).maybeSingle();
    if(readError)throw readError;
    const currentPlans=current?.plans ?? Object.entries(prices).map(([name,monthly])=>({name,monthly}));
    const {error}=await supabase.from("gestilys_public_settings").upsert({id:1,plans:currentPlans,trial_days:b.trialDays,updated_at:new Date().toISOString()});
    if(error)throw error;
    return respond({ok:true,trial_days:b.trialDays});
   }
   case "save_public_pricing": {
    if(!Array.isArray(b.plans)||b.plans.length!==3)throw new Error("Les trois formules sont obligatoires.");
    const expected:Plan[]=["Essentiel","Premium","Élite"];
    const normalized=b.plans.map((p,i)=>{
     if(!p||p.name!==expected[i]||!Number.isInteger(p.monthly)||p.monthly<1000||p.monthly>1000000)throw new Error("Vérifiez les trois tarifs : chaque prix doit être un nombre entier entre 1 000 et 1 000 000 FCFA.");
     return {name:p.name,monthly:p.monthly};
    });
    const {error}=await supabase.from("gestilys_public_settings").upsert({id:1,plans:normalized,updated_at:new Date().toISOString()});
    if(error)throw error;
    return respond({ok:true,plans:normalized});
   }
   case "get_visitor_analytics": {
    const {data,error}=await supabase.rpc("admin_get_visitor_analytics",{p_days:0,p_limit:1000});
    if(error)throw error;
    return respond({data});
   }
   case "get_subscription_churn_stats": {
    const {data,error}=await supabase.rpc("admin_subscription_churn_stats");
    if(error)throw error;
    return respond({data});
   }
   case "get_login_stats": {
    const {data,error}=await supabase.rpc("admin_login_stats");
    if(error)throw error;
    return respond({data});
   }
   case "list_schools": {const {data,error}=await supabase.rpc("admin_list_schools");if(error)throw error;return respond({data});}
   case "delete_school": {
    if(!schoolId)throw new Error("Identifiant de l’école requis.");
    const {data:profiles,error:profileError}=await supabase.from("users").select("auth_uid").eq("school_id",schoolId);
    if(profileError)throw profileError;
    const {error:deleteError}=await supabase.rpc("admin_delete_school",{p_school_id:schoolId});
    if(deleteError)throw deleteError;
    const authDeleteErrors:string[]=[];
    for(const profile of (profiles||[])) {
     const {error}=await supabase.auth.admin.deleteUser(profile.auth_uid);
     if(error) { console.error("Suppression auth user échouée",error.message); authDeleteErrors.push(error.message); }
    }
    return respond({ok:true,auth_cleanup_warnings:authDeleteErrors.length});
   }
   case "list_payments": {const {data,error}=await supabase.rpc("admin_list_manual_payments");if(error)throw error;return respond({data});}
   case "validate_payment": {if(!paymentId)throw new Error("Identifiant de paiement requis");const {error}=await supabase.rpc("admin_validate_payment",{p_payment_id:paymentId});if(error)throw error;return respond({ok:true});}
   case "reject_payment": {if(!paymentId)throw new Error("Identifiant de paiement requis");const {error}=await supabase.rpc("admin_reject_payment",{p_payment_id:paymentId});if(error)throw error;return respond({ok:true});}
   case "set_school_status": {if(!schoolId||!["suspend","restore"].includes(b.status||""))throw new Error("École et statut requis");const {error}=await supabase.rpc("admin_set_school_status",{p_school_id:schoolId,p_status:b.status});if(error)throw error;return respond({ok:true});}
   case "set_school_paid_status": {
    if(!schoolId||typeof b.paid!=="boolean")throw new Error("École et statut requis");
    if(!b.paid){const {error}=await supabase.from("schools").update({subscription_status:"expired"}).eq("id",schoolId);if(error)throw error;return respond({ok:true});}
    if(!b.plan||!prices[b.plan]||!["mensuel","annuel"].includes(b.billingPeriod||""))throw new Error("Choisissez le forfait réellement payé et sa période.");
    const amount=b.billingPeriod==="annuel"?prices[b.plan]*10:prices[b.plan];
    const {data:school,error:schoolError}=await supabase.from("schools").select("name").eq("id",schoolId).single();if(schoolError)throw schoolError;
    const now=new Date();const end=new Date(now);if(b.billingPeriod==="annuel")end.setFullYear(end.getFullYear()+1);else end.setMonth(end.getMonth()+1);end.setDate(end.getDate()-1);
    const {error:paymentError}=await supabase.from("manual_payments").insert({school_id:schoolId,school_name:school.name,provider:"Paiement manuel",sender:"Confirmé par administrateur",amount,status:"valide",received_at:now.toISOString(),billing_period:b.billingPeriod,plan:b.plan,payment_period_start:now.toISOString().slice(0,10),payment_period_end:end.toISOString().slice(0,10)});
    if(paymentError)throw paymentError;
    const {error}=await supabase.from("schools").update({subscription_status:"active",plan:b.plan,billing_period:b.billingPeriod,subscription_amount:amount,last_paid_at:now.toISOString(),subscription_started_at:now.toISOString(),trial_ends_at:end.toISOString()}).eq("id",schoolId);if(error)throw error;
    return respond({ok:true,amount});
   }
   case "set_school_plan": {
    if(!schoolId||!b.plan||!prices[b.plan]||!["mensuel","annuel"].includes(b.billingPeriod||""))throw new Error("École, forfait et période requis");
    const amount=b.billingPeriod==="annuel"?prices[b.plan]*10:prices[b.plan];
    const {error}=await supabase.from("schools").update({plan:b.plan,billing_period:b.billingPeriod,subscription_amount:amount}).eq("id",schoolId);if(error)throw error;return respond({ok:true,amount});
   }
   case "set_trial_end": {
    if(!schoolId||!Number.isInteger(b.trialDays)||b.trialDays!<0||b.trialDays!>365)throw new Error("Durée d’essai invalide (0 à 365 jours)");
    const end=new Date(Date.now()+b.trialDays!*86400000).toISOString();
    const {error}=await supabase.from("schools").update({trial_ends_at:end,subscription_status:"trial"}).eq("id",schoolId);if(error)throw error;return respond({ok:true,trial_ends_at:end});
   }
   default:return respond({error:"Action inconnue"},400);
  }
 } catch(err) {return respond({error:err instanceof Error?err.message:"Erreur interne"},500);}
});