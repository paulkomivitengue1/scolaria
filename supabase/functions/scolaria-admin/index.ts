import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const DEV_CODE = Deno.env.get("ADMIN_DEV_CODE") ?? "gestilys-admin-2026";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface AuthBody {
  code?: string;
}

interface ActionBody {
  code?: string;
  action: "list_schools" | "list_payments" | "validate_payment" | "reject_payment";
  paymentId?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: ActionBody = await req.json();
    const { code, action, paymentId } = body;

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

      default:
        return new Response(
          JSON.stringify({ error: "Action inconnue" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
