import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function validateAdmin(supabase: any, token: string) {
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("token", token)
    .eq("user_type", "admin")
    .gt("expires_at", new Date().toISOString())
    .single();
  return session;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { action, token, ...params } = await req.json();

    const session = await validateAdmin(supabase, token);
    if (!session) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Election Config ---
    if (action === "get-config") {
      const { data } = await supabase.from("election_config").select("*").single();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle-election") {
      const { is_open } = params;
      const { data } = await supabase
        .from("election_config")
        .update({ is_open })
        .select()
        .single();
      // If closing, we need to select the first row
      const { data: config } = await supabase.from("election_config").select("*").single();
      await supabase.from("election_config").update({ is_open }).eq("id", config.id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reveal-results") {
      const { data: config } = await supabase.from("election_config").select("*").single();
      await supabase.from("election_config").update({ results_revealed: true }).eq("id", config.id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "hide-results") {
      const { data: config } = await supabase.from("election_config").select("*").single();
      await supabase.from("election_config").update({ results_revealed: false }).eq("id", config.id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Candidates ---
    if (action === "get-candidates") {
      const { data } = await supabase.from("candidates").select("*").order("name");
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "add-candidate") {
      const { name, bio, photo_url } = params;
      const { data, error } = await supabase
        .from("candidates")
        .insert({ name, bio, photo_url })
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update-candidate") {
      const { id, name, bio, photo_url } = params;
      const { data, error } = await supabase
        .from("candidates")
        .update({ name, bio, photo_url })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete-candidate") {
      const { id } = params;
      await supabase.from("candidates").delete().eq("id", id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Members ---
    if (action === "get-members") {
      const { data } = await supabase.from("members").select("id, member_number, name, fee_status, has_voted, ethics_accepted").order("name");
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "import-members") {
      const { members } = params;
      if (!Array.isArray(members)) {
        return new Response(JSON.stringify({ error: "Formato inválido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const encoder = new TextEncoder();
      const results = { imported: 0, errors: [] as string[] };

      for (const m of members) {
        try {
          const idCard = String(m.id_card || m.carnet || m.carné || "").trim();
          const memberNumber = String(m.member_number || m.numero_miembro || m.número_miembro || "").trim();
          const name = String(m.name || m.nombre || "").trim();
          const feeStatus = (m.fee_status || m.estado || m.cuota || "").toString().toLowerCase();

          if (!idCard || !memberNumber || !name) {
            results.errors.push(`Fila con datos incompletos: ${memberNumber || "sin número"}`);
            continue;
          }

          const data = encoder.encode(idCard);
          const hashBuffer = await crypto.subtle.digest("SHA-256", data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const idCardHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

          const status = ["paid", "pagado", "al día", "al dia", "si", "sí", "yes", "1", "true"].includes(feeStatus) ? "paid" : "pending";

          const { error } = await supabase.from("members").upsert({
            member_number: memberNumber,
            id_card_hash: idCardHash,
            name,
            fee_status: status,
          }, { onConflict: "member_number" });

          if (error) {
            results.errors.push(`Error con miembro ${memberNumber}: ${error.message}`);
          } else {
            results.imported++;
          }
        } catch (e) {
          results.errors.push(`Error procesando fila: ${e.message}`);
        }
      }

      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete-members") {
      const { member_ids } = params;
      if (!Array.isArray(member_ids) || member_ids.length === 0) {
        return new Response(JSON.stringify({ error: "Debe seleccionar al menos un miembro" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("members").delete().in("id", member_ids);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, deleted: member_ids.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Stats ---
    if (action === "get-stats") {
      const { data: members } = await supabase.from("members").select("id, has_voted, fee_status");
      const total = members?.length || 0;
      const eligible = members?.filter((m: any) => m.fee_status === "paid").length || 0;
      const voted = members?.filter((m: any) => m.has_voted).length || 0;

      const { data: config } = await supabase.from("election_config").select("*").single();

      return new Response(JSON.stringify({ total, eligible, voted, config }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Results ---
    if (action === "get-results") {
      const { data: config } = await supabase.from("election_config").select("*").single();
      if (!config?.results_revealed) {
        return new Response(JSON.stringify({ error: "Los resultados aún no han sido revelados" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: candidates } = await supabase
        .from("candidates")
        .select("id, name, photo_url, president_votes, member_votes")
        .order("president_votes", { ascending: false });
      return new Response(JSON.stringify(candidates), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Reset election ---
    if (action === "reset-votes") {
      await supabase.from("candidates").update({ president_votes: 0, member_votes: 0 }).gte("id", "00000000-0000-0000-0000-000000000000");
      await supabase.from("members").update({ has_voted: false, ethics_accepted: null }).gte("id", "00000000-0000-0000-0000-000000000000");
      const { data: config } = await supabase.from("election_config").select("*").single();
      await supabase.from("election_config").update({ results_revealed: false }).eq("id", config.id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Acción no válida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Admin error:", err);
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
