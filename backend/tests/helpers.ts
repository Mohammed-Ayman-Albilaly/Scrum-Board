// Shared test fixtures + a signup helper that returns an authenticated agent.
import request from "supertest";
import type { Express } from "express";

export const PRODUCT_OWNER = {
  name: "Pat Owner",
  email: "po@team.com",
  password: "password123",
  role: "PRODUCT_OWNER",
} as const;

export const SCRUM_MASTER = {
  name: "Sam Master",
  email: "sm@team.com",
  password: "password123",
  role: "SCRUM_MASTER",
} as const;

export const TEAM_MEMBER = {
  name: "Tam Member",
  email: "tm@team.com",
  password: "password123",
  role: "TEAM_MEMBER",
  specialization: "BACKEND",
} as const;

/** Sign up and return a supertest agent that carries the session cookie. */
export async function signIn(
  app: Express,
  user: Record<string, unknown>,
): Promise<ReturnType<typeof request.agent>> {
  const agent = request.agent(app);
  const res = await agent.post("/auth/signup").send(user);
  if (res.status !== 201) {
    throw new Error(`signup failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return agent;
}
