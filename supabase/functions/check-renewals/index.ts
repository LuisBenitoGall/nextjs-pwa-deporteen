// supabase/functions/check-renewals/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { Resend } from "npm:resend@3";

// Vars de entorno (las que no empiezan por SUPABASE_ las pones tú en Settings de la función)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;            // inyectada por Supabase
const SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY")!;    // tu secret
const CRON_BEARER = Deno.env.get("CRON_BEARER")!;              // tu secret
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;        // tu secret (re_...)
const RESEND_FROM = Deno.env.get("RESEND_FROM") ?? "Deporteen <no-reply@tudominio.com>";

const resend = new Resend(RESEND_API_KEY);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

  // Bearer privado para cron
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== CRON_BEARER) return json({ error: "Forbidden" }, 403);

  // Parámetro opcional: ventana de aviso en días
  let windowDays = 7;
  try {
    const body = (await req.json().catch(() => ({}))) as { windowDays?: number };
    if (typeof body.windowDays === "number" && body.windowDays > 0 && body.windowDays <= 90) {
      windowDays = Math.floor(body.windowDays);
    }
  } catch {}

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const now = new Date();
  const horizon = new Date(Date.now() + windowDays * 24 * 3600 * 1000);

  // 1) Suscripciones activas que vencen en la ventana y NO notificadas aún
  const { data: expiring, error: e1 } = await supabase
    .from("subscriptions")
    .select("id, user_id, current_period_end")
    .eq("status", true)
    .is("notified_expiry_7d_at", null)
    .gte("current_period_end", now.toISOString())
    .lte("current_period_end", horizon.toISOString());

  if (e1) return json({ ok: false, step: "select-expiring", error: e1.message }, 500);

  // 2) Traer emails de usuarios afectados
  const userIds = (expiring ?? []).map((s) => s.user_id);
  let usersById: Record<string, { email: string; name: string | null }> = {};
  if (userIds.length) {
    const { data: users, error: uErr } = await supabase
      .from("users")
      .select("id, email, name")
      .in("id", userIds);
    if (uErr) return json({ ok: false, step: "select-users", error: uErr.message }, 500);
    usersById = Object.fromEntries(
      (users || []).map((u: any) => [u.id, { email: String(u.email || ""), name: u.name ?? null }])
    );
  }

  // 3) Enviar email y marcar como notificado
  let sent = 0;
  for (const s of expiring ?? []) {
    const user = usersById[s.user_id];
    if (!user?.email) continue;

    const endsAt = new Date(s.current_period_end as string);
    const pretty = endsAt.toLocaleString("es-ES", { dateStyle: "long" });

    try {
      await resend.emails.send({
        from: RESEND_FROM,
        to: user.email,
        subject: "Tu suscripción vence en 7 días",
        html: `
          <p>Hola${user.name ? " " + user.name : ""},</p>
          <p>Tu suscripción finalizará el <b>${pretty}</b>.</p>
          <p>Puedes renovarla desde tu cuenta para no perder acceso.</p>
          <p>— Deporteen</p>
        `,
      });
      sent++;

      // marcar notificado para no re-enviar cada día
      await supabase
        .from("subscriptions")
        .update({ notified_expiry_7d_at: now.toISOString() })
        .eq("id", s.id);
    } catch {
      // si falla el envío, no marcamos la notificación; se intentará al día siguiente
    }
  }

  // 4) Desactivar las ya caducadas (opcional)
  await supabase
    .from("subscriptions")
    .update({ status: false })
    .lt("current_period_end", now.toISOString())
    .eq("status", true);

  return json({
    ok: true,
    windowDays,
    sent,
    expiringCount: expiring?.length ?? 0,
    now: now.toISOString(),
    horizon: horizon.toISOString(),
  });
});
