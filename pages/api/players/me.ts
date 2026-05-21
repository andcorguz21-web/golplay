// pages/api/players/me.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { invokeManagePlayer } from "@/lib/playerSupabase";
import { readSessionToken, clearSessionCookie } from "@/lib/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido" });
  const token = readSessionToken(req);
  if (!token) return res.status(401).json({ error: "Sin sesión" });
  const { data, error } = await invokeManagePlayer({ action: "me", sessionToken: token });
  if (error) {
    clearSessionCookie(res);
    return res.status(401).json({ error });
  }
  return res.status(200).json({ player: data.player });
}