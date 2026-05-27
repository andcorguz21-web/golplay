// pages/api/players/create.ts
import type { NextApiRequest, NextApiResponse } from "next";

export const config = { api: { bodyParser: { sizeLimit: "5mb" } } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

    const envCheck = {
      SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SERVICE_ROLE_KEY_LENGTH: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
    };
    if (!envCheck.SUPABASE_URL || !envCheck.SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: "Env vars faltantes", envCheck });
    }

    const { invokeManagePlayer } = await import("@/lib/playerSupabase");
    const { setSessionCookie } = await import("@/lib/session");

    const { cedula, displayName, alias, position, pin, photoBase64, photoMimeType } = req.body || {};

    const { data, error } = await invokeManagePlayer({
      action: "create",
      cedula, displayName, alias, position, pin, photoBase64, photoMimeType,
    });

    if (error) return res.status(400).json({ error, stage: "edge_function" });
    if (!data?.sessionToken) return res.status(500).json({ error: "Edge function devolvió respuesta vacía", data });

    setSessionCookie(res, data.sessionToken);
    return res.status(200).json({ player: data.player });
  } catch (e: any) {
    return res.status(500).json({
      error: e?.message || "Error desconocido",
      stack: e?.stack?.split("\n").slice(0, 5).join("\n"),
      name: e?.name,
    });
  }
}