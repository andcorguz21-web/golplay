import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOGO_URL =
  "https://ofypdowhedbbfzkoxeul.supabase.co/storage/v1/object/public/assets/logo-golplay.svg";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, field_id, date, hour } = await req.json();

    if (!email || !field_id || !date || !hour) {
      return new Response(
        JSON.stringify({ ok: false, error: "Datos incompletos" }),
        { status: 400, headers: corsHeaders }
      );
    }

    /* ===================== */
    /* VERIFICAR DISPONIBILIDAD */
    /* ===================== */
    const { data: existing } = await supabase
      .from("bookings")
      .select("id")
      .eq("field_id", field_id)
      .eq("date", date)
      .eq("hour", hour)
      .eq("status", "active")
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ ok: false, error: "Horario no disponible" }),
        { status: 409, headers: corsHeaders }
      );
    }

    /* ===================== */
    /* OBTENER CANCHA */
    /* ===================== */
    const { data: field } = await supabase
      .from("fields")
      .select("name, price, owner_email")
      .eq("id", field_id)
      .single();

    const fieldName = field?.name ?? `Cancha ${field_id}`;
    const priceCRC = field?.price
      ? `₡${Number(field.price).toLocaleString("es-CR")}`
      : "—";
    const ownerEmail = field?.owner_email;

    /* ===================== */
    /* CREAR RESERVA */
    /* ===================== */
    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        field_id,
        date,
        hour,
        email,
        status: "active",
      })
      .select()
      .single();

    if (error) throw error;

    /* ===================== */
    /* ENVIAR CORREOS (NO BLOQUEANTE) */
    /* ===================== */
    try {
      const transporter = nodemailer.createTransport({
        host: Deno.env.get("SMTP_HOST"),
        port: Number(Deno.env.get("SMTP_PORT")),
        secure: false,
        auth: {
          user: Deno.env.get("SMTP_USER"),
          pass: Deno.env.get("SMTP_PASS"),
        },
      });

      /* ===== CLIENTE ===== */
      await transporter.sendMail({
        from: `"GolPlay ⚽" <${Deno.env.get("SMTP_USER")}>`,
        to: email,
        subject: "✅ Reserva confirmada - GolPlay",
        html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:20px;padding:32px;box-shadow:0 12px 30px rgba(0,0,0,0.08)">

    <div style="text-align:center;margin-bottom:24px">
      <img src="${LOGO_URL}" alt="GolPlay" style="height:56px" />
    </div>

    <h2 style="margin:0 0 6px;color:#111827;font-size:24px">
      ⚽ Reserva confirmada
    </h2>

    <p style="margin:0 0 24px;color:#6b7280;font-size:15px">
      Tu cancha ya está reservada. Estos son los detalles:
    </p>

    <div style="background:#f9fafb;border-radius:16px;padding:20px">
      <p><strong>🏟️ Cancha:</strong> ${fieldName}</p>
      <p><strong>📅 Fecha:</strong> ${date}</p>
      <p><strong>⏰ Hora:</strong> ${hour}</p>
      <p><strong>💳 Total:</strong> ${priceCRC}</p>
    </div>

    <p style="margin-top:24px;color:#6b7280;font-size:14px">
      Llegá al menos 10 minutos antes para disfrutar sin contratiempos.
    </p>

    <div style="margin-top:32px;text-align:center;color:#9ca3af;font-size:13px">
      GolPlay © ${new Date().getFullYear()}
    </div>

  </div>
</body>
</html>
        `,
      });

      /* ===== ADMIN ===== */
      await transporter.sendMail({
        from: `"GolPlay ⚽" <${Deno.env.get("SMTP_USER")}>`,
        to: Deno.env.get("ADMIN_EMAIL")!,
        subject: "📢 Nueva reserva recibida",
        html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:20px;padding:32px;box-shadow:0 12px 30px rgba(0,0,0,0.08)">

    <div style="text-align:center;margin-bottom:24px">
      <img src="${LOGO_URL}" alt="GolPlay" style="height:48px" />
    </div>

    <h2 style="margin:0 0 6px;color:#111827;font-size:22px">
      📢 Nueva reserva
    </h2>

    <div style="background:#f9fafb;border-radius:16px;padding:20px">
      <p><strong>👤 Cliente:</strong> ${email}</p>
      <p><strong>🏟️ Cancha:</strong> ${fieldName}</p>
      <p><strong>📅 Fecha:</strong> ${date}</p>
      <p><strong>⏰ Hora:</strong> ${hour}</p>
      <p><strong>💳 Total:</strong> ${priceCRC}</p>
    </div>
  </div>
</body>
</html>
        `,
      });

      /* ===== OWNER ===== */
      if (ownerEmail) {
        await transporter.sendMail({
          from: `"GolPlay ⚽" <${Deno.env.get("SMTP_USER")}>`,
          to: ownerEmail,
          subject: "📢 Nueva reserva en tu cancha - GolPlay",
          html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:20px;padding:32px;box-shadow:0 12px 30px rgba(0,0,0,0.08)">

    <div style="text-align:center;margin-bottom:24px">
      <img src="${LOGO_URL}" alt="GolPlay" style="height:48px" />
    </div>

    <h2 style="color:#111827;font-size:22px">
      ⚽ Nueva reserva en tu cancha
    </h2>

    <div style="background:#f9fafb;border-radius:16px;padding:20px">
      <p><strong>🏟️ Cancha:</strong> ${fieldName}</p>
      <p><strong>👤 Cliente:</strong> ${email}</p>
      <p><strong>📅 Fecha:</strong> ${date}</p>
      <p><strong>⏰ Hora:</strong> ${hour}</p>
      <p><strong>💳 Total:</strong> ${priceCRC}</p>
    </div>

    <p style="margin-top:24px;color:#6b7280;font-size:14px">
      Ingresá a GolPlay para administrar tus reservas.
    </p>
  </div>
</body>
</html>
          `,
        });
      }
    } catch (mailError) {
      console.error("EMAIL ERROR (NO BLOCKING):", mailError);
    }

    /* ===================== */
    /* RESPUESTA OK */
    /* ===================== */
    return new Response(
      JSON.stringify({ ok: true, booking_id: booking.id }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    console.error("CREATE BOOKING ERROR:", err);
    return new Response(
      JSON.stringify({ ok: false, error: "Error interno" }),
      { status: 500, headers: corsHeaders }
    );
  }
});
