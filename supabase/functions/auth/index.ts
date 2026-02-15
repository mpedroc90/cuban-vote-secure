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
    const { action, ...params } = await req.json();

    if (action === "member-login") {
      const { member_number, id_card } = params;
      if (!member_number || !id_card) {
        return new Response(JSON.stringify({ error: "Campos requeridos" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Hash the ID card
      const encoder = new TextEncoder();
      const data = encoder.encode(id_card);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const idCardHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      const { data: member, error } = await supabase
        .from("members")
        .select("*")
        .eq("member_number", member_number)
        .eq("id_card_hash", idCardHash)
        .single();

      if (error || !member) {
        return new Response(JSON.stringify({ error: "Credenciales inválidas" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (member.fee_status !== "paid") {
        return new Response(JSON.stringify({ error: "Su membresía no está al día. Contacte a la sociedad." }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate session token
      const token = crypto.randomUUID() + "-" + crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000); // 4 hours

      await supabase.from("sessions").insert({
        token,
        user_type: "member",
        user_id: member.id,
        expires_at: expiresAt.toISOString(),
      });

      return new Response(JSON.stringify({
        token,
        user: {
          id: member.id,
          name: member.name,
          member_number: member.member_number,
          has_voted: member.has_voted,
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "admin-login") {
      const { username, password } = params;
      if (!username || !password) {
        return new Response(JSON.stringify({ error: "Campos requeridos" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Hash password
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const passwordHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      const { data: admin, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("username", username)
        .eq("password_hash", passwordHash)
        .single();

      if (error || !admin) {
        return new Response(JSON.stringify({ error: "Credenciales de administrador inválidas" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const token = crypto.randomUUID() + "-" + crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

      await supabase.from("sessions").insert({
        token,
        user_type: "admin",
        user_id: admin.id,
        expires_at: expiresAt.toISOString(),
      });

      return new Response(JSON.stringify({
        token,
        user: { id: admin.id, username: admin.username },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "validate-session") {
      const { token } = params;
      if (!token) {
        return new Response(JSON.stringify({ error: "Token requerido" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: session } = await supabase
        .from("sessions")
        .select("*")
        .eq("token", token)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (!session) {
        return new Response(JSON.stringify({ error: "Sesión inválida o expirada" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (session.user_type === "member") {
        const { data: member } = await supabase
          .from("members")
          .select("id, name, member_number, has_voted")
          .eq("id", session.user_id)
          .single();
        return new Response(JSON.stringify({ user_type: "member", user: member }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const { data: admin } = await supabase
          .from("admin_users")
          .select("id, username")
          .eq("id", session.user_id)
          .single();
        return new Response(JSON.stringify({ user_type: "admin", user: admin }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "logout") {
      const { token } = params;
      if (token) {
        await supabase.from("sessions").delete().eq("token", token);
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Acción no válida" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
