// lib/playerSupabase.ts
// Cliente server-only con service_role + helper para invocar la edge function.
// NUNCA importar este archivo desde un componente client-side.
// Solo importar desde API routes (pages/api/**).
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export async function invokeManagePlayer(payload: Record<string, any>) {
  const { data, error } = await supabaseAdmin.functions.invoke("manage-player", {
    body: payload,
  });
  if (error) {
    const ctx: any = (error as any).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const body = await ctx.json();
        return { data: null, error: body.error || error.message };
      } catch { /* ignore */ }
    }
    return { data: null, error: error.message };
  }
  if (data?.error) return { data: null, error: data.error };
  return { data, error: null };
}