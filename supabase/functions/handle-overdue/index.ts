import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export const schedule = "0 6 * * *"; // TODOS LOS DÍAS 6:00 AM

serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const today = new Date();

  // 1. Buscar statements pendientes
  const { data: statements, error } = await supabase
    .from("monthly_statements")
    .select("id, field_id, due_date")
    .eq("status", "pending");

  if (error) {
    return new Response(JSON.stringify(error), { status: 500 });
  }

  for (const s of statements ?? []) {
    const dueDate = new Date(s.due_date);
    const diffDays =
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24);

    // 2. Si pasaron más de 5 días
    if (diffDays > 5) {
      // marcar statement como overdue
      await supabase
        .from("monthly_statements")
        .update({ status: "overdue" })
        .eq("id", s.id);

      // desactivar cancha
      await supabase
        .from("fields")
        .update({ active: false })
        .eq("id", s.field_id);
    }
  }

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { "Content-Type": "application/json" } }
  );
});
