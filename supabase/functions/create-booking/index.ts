import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// =====================
// INIT SUPABASE CLIENT (SERVICE ROLE)
// =====================
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// =====================
// HELPERS
// =====================
function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// =====================
// EDGE FUNCTION
// =====================
serve(async (req) => {
  try {
    // 🔹 SOLO POST
    if (req.method !== "POST") {
      return json({ ok: false, error: "Method not allowed" }, 405);
    }

    const { email, field_id, date, hour } = await req.json();

    // =====================
    // 1️⃣ VALIDACIÓN BÁSICA
    // =====================
    if (!email || !field_id || !date || !hour) {
      return json(
        { ok: false, error: "Missing required fields" },
        400
      );
    }

    // =====================
    // 2️⃣ VERIFICAR DISPONIBILIDAD
    // =====================
    const { data: existingBooking } = await supabase
      .from("bookings")
      .select("id")
      .eq("field_id", field_id)
      .eq("date", date)
      .eq("hour", hour)
      .eq("status", "active")
      .maybeSingle();

    if (existingBooking) {
      return json(
        { ok: false, error: "Horario no disponible" },
        409
      );
    }

    // =====================
    // 3️⃣ BUSCAR O CREAR USUARIO
    // =====================
    let userId: string;

    // Buscar usuario por email
    const { data: userList } =
      await supabase.auth.admin.listUsers({
        email,
      });

    if (userList.users.length > 0) {
      // Usuario existe
      userId = userList.users[0].id;
    } else {
      // Crear usuario SIN password
      const { data: newUser, error: createError } =
        await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
        });

      if (createError || !newUser.user) {
        throw createError;
      }

      userId = newUser.user.id;

      // Crear profile
      await supabase.from("profiles").insert({
        id: userId,
        role: "user",
      });
    }

    // =====================
    // 4️⃣ CREAR RESERVA
    // =====================
    const { data: booking, error: bookingError } =
      await supabase
        .from("bookings")
        .insert({
          field_id,
          date,
          hour,
          user_id: userId,
          status: "active",
        })
        .select()
        .single();

    if (bookingError) {
      throw bookingError;
    }

    // =====================
    // 5️⃣ RESPUESTA OK
    // =====================
    return json({
      ok: true,
      booking_id: booking.id,
      message: "Reserva creada correctamente",
    });
  } catch (err: any) {
    console.error(err);
    return json(
      { ok: false, error: "Error interno" },
      500
    );
  }
});
