// Standard HTTP response envelope so the frontend can branch on `ok`.
import type { Response } from "express";

export function sendData<T>(res: Response, status: number, data: T): Response {
  return res.status(status).json({ ok: true, data });
}

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
): Response {
  return res.status(status).json({ ok: false, error: { code, message } });
}
