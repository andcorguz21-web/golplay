// pages/api/players/update.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { invokeManagePlayer } from "@/lib/playerSupabase";
import { readSessionToken } from "@/lib/session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });
  const token = readSessionToken(req);
  if (!token) return res.status(401).json({ error: "Sin sesión" });
  const { displayName, alias, position } = req.body || {};
  const { data, error } = await invokeManagePlayer({
    action: "update", sessionToken: token, displayName, alias, position,
  });
  if (error) return res.status(400).json({ error });
  return res.status(200).json({ player: data.player });
}