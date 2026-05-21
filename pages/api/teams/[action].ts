// pages/api/teams/[action].ts
import type { NextApiRequest, NextApiResponse } from "next";
import { invokeManageTeam } from "@/lib/teamSupabase";

const VALID_ACTIONS = new Set([
  "create",
  "get",
  "list_all",
  "my_teams",
  "update",
  "join_via_link",
  "add_member",
  "remove_member",
  "leave",
  "delete",
  "request_challenge",
  "list_pending_requests",
  "respond_request",
]);

const PUBLIC_ACTIONS = new Set(["get"]);


// 👇 Helper: extrae el session_token del cookie. Si el formato cambia, ajustar acá únicamente.
function extractSessionToken(rawCookie: string | undefined): string | null {
  if (!rawCookie) return null;
  // Por ahora pasamos el cookie completo. Si la DB guarda solo una parte, modificar acá.
  return rawCookie;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no soportado" });
  }

  const action = String(req.query.action ?? "");
  if (!VALID_ACTIONS.has(action)) {
    return res.status(400).json({ error: `Acción inválida: ${action}` });
  }

  const session_token = extractSessionToken(req.cookies.gp_player_session);
  if (!PUBLIC_ACTIONS.has(action) && !session_token) {
    return res.status(401).json({ error: "No autenticado" });
  }

  const body = {
    ...(typeof req.body === "object" && req.body !== null ? req.body : {}),
    action,
    session_token,
  };

  const { status, data } = await invokeManageTeam({ body });
  return res.status(status).json(data);
}