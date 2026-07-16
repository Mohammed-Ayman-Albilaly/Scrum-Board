// PATCH /users/me — specialization-only profile update.
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { TEAM_MEMBER, signIn } from "./helpers.js";

const app = createApp();

describe("PATCH /users/me", () => {
  it("requires authentication (401)", async () => {
    const res = await request(app).patch("/users/me").send({ specialization: "QA" });
    expect(res.status).toBe(401);
  });

  it("sets and returns the specialization", async () => {
    const agent = await signIn(app, TEAM_MEMBER);
    const res = await agent.patch("/users/me").send({ specialization: "DEVOPS" });
    expect(res.status).toBe(200);
    expect(res.body.data.user.specialization).toBe("DEVOPS");
    expect((await agent.get("/auth/me")).body.data.user.specialization).toBe("DEVOPS");
  });

  it("clears the specialization with null", async () => {
    const agent = await signIn(app, TEAM_MEMBER);
    await agent.patch("/users/me").send({ specialization: "QA" });
    const res = await agent.patch("/users/me").send({ specialization: null });
    expect(res.status).toBe(200);
    expect(res.body.data.user.specialization).toBeNull();
  });

  it("rejects an unknown specialization (400)", async () => {
    const agent = await signIn(app, TEAM_MEMBER);
    const res = await agent.patch("/users/me").send({ specialization: "WIZARD" });
    expect(res.status).toBe(400);
  });

  it("cannot touch other fields (mass-assignment guard)", async () => {
    const agent = await signIn(app, TEAM_MEMBER);
    const res = await agent
      .patch("/users/me")
      .send({ specialization: "QA", name: "Hacked", email: "hacked@evil.com" });
    expect(res.status).toBe(200);
    const me = (await agent.get("/auth/me")).body.data.user;
    expect(me.name).toBe(TEAM_MEMBER.name);
    expect(me.email).toBe(TEAM_MEMBER.email);
  });
});

describe("GET /users still requires project membership", () => {
  it("403s for a project the caller is not in", async () => {
    const agent = await signIn(app, TEAM_MEMBER);
    const res = await agent.get("/users").query({ projectId: "not-my-project" });
    expect(res.status).toBe(403);
  });
});
