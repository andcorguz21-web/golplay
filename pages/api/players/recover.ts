// pages/api/players/recover.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { invokeManagePlayer } from "@/lib/playerSupabase";
import { setSessionCookie } from "@/lib/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  const { cedula, pin } = req.body || {};
  const { data, error } = await invokeManagePlayer({ action: "recover", cedula, pin });
  if (error) return res.status(401).json({ error });
  setSessionCookie(res, data.sessionToken);
  return res.status(200).json({ player: data.player });
}