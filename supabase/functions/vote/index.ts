import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { token, president_id, member_ids, ethics_accepted } = await req.json();

    // Validate session
    const { data: session } = await supabase
      .from("sessions")
      .select("*")
      .eq("token", token)
      .eq("user_type", "member")
      .gt("expires_at", new Date().toISOString())
      .single();

    if (!session) {
      return new Response(JSON.stringify({ error: "Sesión inválida o expirada" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check election is open
    const { data: config } = await supabase
      .from("election_config")
      .select("*")
      .single();

    if (!config?.is_open) {
      return new Response(JSON.stringify({ error: "La votación no está abierta" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check member hasn't voted
    const { data: member } = await supabase
      .from("members")
      .select("id, has_voted")
      .eq("id", session.user_id)
      .single();

    if (!member || member.has_voted) {
      return new Response(JSON.stringify({ error: "Usted ya ha votado" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate vote structure
    if (!president_id) {
      return new Response(JSON.stringify({ error: "Debe seleccionar un presidente" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(member_ids) || member_ids.length > 10) {
      return new Response(JSON.stringify({ error: "Puede seleccionar hasta 10 miembros adicionales" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof ethics_accepted !== "boolean") {
      return new Response(JSON.stringify({ error: "Debe responder la pregunta del Código de Ética" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate all candidate IDs exist
    const allIds = [president_id, ...member_ids];
    const { data: candidates } = await supabase
      .from("candidates")
      .select("id")
      .in("id", allIds);

    if (!candidates || candidates.length !== new Set(allIds).size) {
      return new Response(JSON.stringify({ error: "Candidatos inválidos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record votes anonymously - increment counts
    // President vote
    await supabase.rpc("increment_president_votes", { candidate_id: president_id });

    // Member votes (president is also a member)
    const allMemberIds = [president_id, ...member_ids.filter((id: string) => id !== president_id)];
    for (const id of allMemberIds) {
      await supabase.rpc("increment_member_votes", { candidate_id: id });
    }

    // Mark member as voted and record ethics response
    await supabase
      .from("members")
      .update({ has_voted: true, ethics_accepted })
      .eq("id", session.user_id);

    return new Response(JSON.stringify({ success: true, message: "Voto registrado exitosamente" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Vote error:", err);
    return new Response(JSON.stringify({ error: "Error al procesar el voto" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
