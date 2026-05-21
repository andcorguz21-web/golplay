// lib/teamSupabase.ts
// Cliente admin para edge function manage-team.
// IMPORTANTE: importar solo desde pages/api/** — usa service_role.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const teamAdminSupabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/manage-team`;

type InvokeOptions = {
  body?: Record<string, unknown>;
  formData?: FormData;
};

export async function invokeManageTeam(opts: InvokeOptions) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    apikey: SUPABASE_SERVICE_ROLE_KEY,
  };

  let body: BodyInit;
  if (opts.formData) {
    body = opts.formData;
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body ?? {});
  }

  const res = await fetch(FUNCTION_URL, {
    method: "POST",
    headers,
    body,
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}