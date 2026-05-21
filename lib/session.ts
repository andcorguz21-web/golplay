// lib/session.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { parse, serialize } from "cookie";

export const SESSION_COOKIE = "gp_player_session";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function readSessionToken(req: NextApiRequest): string | null {
  const cookies = parse(req.headers.cookie || "");
  return cookies[SESSION_COOKIE] || null;
}

export function setSessionCookie(res: NextApiResponse, token: string) {
  res.setHeader(
    "Set-Cookie",
    serialize(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ONE_YEAR_SECONDS,
    }),
  );
}

export function clearSessionCookie(res: NextApiResponse) {
  res.setHeader(
    "Set-Cookie",
    serialize(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    }),
  );
}