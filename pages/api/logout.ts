// pages/api/logout.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { clearSessionCookie } from "../../lib/session";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
}