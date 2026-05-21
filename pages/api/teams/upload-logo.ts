// pages/api/teams/upload-logo.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { invokeManageTeam } from "@/lib/teamSupabase";
import formidable from "formidable";
import { promises as fsp } from "fs";

export const config = {
  api: { bodyParser: false },
};

function extractSessionToken(rawCookie: string | undefined): string | null {
  if (!rawCookie) return null;
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

  const session_token = extractSessionToken(req.cookies.gp_player_session);
  if (!session_token) {
    return res.status(401).json({ error: "No autenticado" });
  }

  try {
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024,
      keepExtensions: true,
    });
    const [fields, files] = await form.parse(req);

    const team_id = Array.isArray(fields.team_id)
      ? fields.team_id[0]
      : fields.team_id;
    const fileField = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!team_id || !fileField) {
      return res
        .status(400)
        .json({ error: "Faltan campos (team_id, file)" });
    }

    const fileBuffer = await fsp.readFile(fileField.filepath);
    const formData = new FormData();
    formData.append("session_token", session_token);
    formData.append("team_id", team_id);
    formData.append(
      "file",
      new Blob([fileBuffer], { type: fileField.mimetype || "image/png" }),
      fileField.originalFilename || "logo.png"
    );

    const { status, data } = await invokeManageTeam({ formData });
    return res.status(status).json(data);
  } catch (e: any) {
    return res
      .status(500)
      .json({ error: e?.message ?? "Error al procesar logo" });
  }
}