// KATL Cricket — send-push Edge Function (Supabase / Deno)
// Reads all saved push subscriptions and sends a web-push notification to each.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { title, body, url, adminSecret } = await req.json();

    // Only the team admin (who knows the secret) may broadcast.
    if (adminSecret !== Deno.env.get("ADMIN_SEND_SECRET")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: cors });
    }

    webpush.setVapidDetails(
      "mailto:katl@example.com",
      Deno.env.get("VAPID_PUBLIC_KEY")!,
      Deno.env.get("VAPID_PRIVATE_KEY")!,
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: subs, error } = await supabase.from("push_subs").select("id, sub");
    if (error) throw error;

    const payload = JSON.stringify({ title: title || "KATL Cricket", body: body || "", url: url || "." });
    let sent = 0, removed = 0;

    await Promise.all((subs || []).map(async (row) => {
      try {
        await webpush.sendNotification(row.sub, payload);
        sent++;
      } catch (err) {
        // 404/410 = subscription expired; clean it up.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await supabase.from("push_subs").delete().eq("id", row.id);
          removed++;
        }
      }
    }));

    return new Response(JSON.stringify({ sent, removed, total: subs?.length || 0 }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: cors });
  }
});
