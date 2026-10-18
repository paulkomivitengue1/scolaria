import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const DEV_CODE = Deno.env.get("ADMIN_DEV_CODE");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface ActionBody {
  code?: string;
  action: "list_schools" | "list_payments" | "validate_payment" | "reject_payment" | "set_school_status" | "set_school_paid_status";
  paymentId?: string;
  schoolId?: string;
  status?: "suspend" | "restore";
  paid?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (!DEV_CODE) {
    return new Response(
      JSON.stringify({ error: "Configuration administrateur manquante" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const body: ActionBody = await req.json();
    const { code, action, paymentId, schoolId, status, paid } = body;

    if (code !== DEV_CODE) {
      return new Response(
        JSON.stringify({ error: "Code développeur invalide" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    switch (action) {
      case "list_schools": {
        const { data, error } = await supabase.rpc("admin_list_schools");
        if (error) throw error;
        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list_payments": {
        const { data, error } = await supabase.rpc("admin_list_manual_payments");
        if (error) throw error;
        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "validate_payment": {
        if (!paymentId) throw new Error("paymentId requis");
        const { error } = await supabase.rpc("admin_validate_payment", {
          p_payment_id: paymentId,
        });
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "reject_payment": {
        if (!paymentId) throw new Error("paymentId requis");
        const { error } = await supabase.rpc("admin_reject_payment", {
          p_payment_id: paymentId,
        });
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "set_school_status": {
        if (!schoolId) throw new Error("schoolId requis");
        if (status !== "suspend" && status !== "restore") throw new Error("Statut requis invalide");
        const { error } = await supabase.rpc("admin_set_school_status", {
          p_school_id: schoolId,
          p_status: status,
        });
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "set_school_paid_status": {
        if (!schoolId || typeof paid !== "boolean") throw new Error("École et statut de paiement requis");
        const { error } = await supabase.from("schools").update({ subscription_status: paid ? "active" : "expired" }).eq("id", schoolId);
        if (error) throw error;
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(
          JSON.stringify({ error: "Action inconnue" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
