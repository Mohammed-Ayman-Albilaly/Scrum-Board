import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PRODUCT_OWNER, TEAM_MEMBER, signIn, grantProjectRoles } from "./helpers.js";

const app = createApp();

describe("per-project RBAC", () => {
  it("gives a fresh signup only Team Member permissions in the default project", async () => {
    const { roles, ...body } = TEAM_MEMBER;
    void roles;
    const agent = request.agent(app);
    await agent.post("/auth/signup").send(body);
    const res = await agent.post("/stories").send({ title: "Nope" });
    expect(res.status).toBe(403); // TM cannot create stories
  });

  it("grants Product Owner permissions only via a project role", async () => {
    const agent = await signIn(app, TEAM_MEMBER);
    expect((await agent.post("/stories").send({ title: "Blocked" })).status).toBe(403);
    await grantProjectRoles(TEAM_MEMBER.email, ["PRODUCT_OWNER"]);
    expect((await agent.post("/stories").send({ title: "Allowed" })).status).toBe(201);
  });
});

describe("CSRF same-origin guard on /auth mutations", () => {
  it("blocks a cross-origin signup with 403", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .set("Origin", "http://evil.example")
      .send(PRODUCT_OWNER);
    expect(res.status).toBe(403);
  });

  it("blocks a cross-origin login with 403", async () => {
    const res = await request(app)
      .post("/auth/login")
      .set("Origin", "http://evil.example")
      .send({ email: PRODUCT_OWNER.email, password: PRODUCT_OWNER.password });
    expect(res.status).toBe(403);
  });

  it("allows a request whose Origin matches the Host", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .set("Host", "app.example")
      .set("Origin", "http://app.example")
      .send(PRODUCT_OWNER);
    expect(res.status).toBe(201);
  });

  it("allows requests with no Origin (server-to-server)", async () => {
    const res = await request(app).post("/auth/signup").send(PRODUCT_OWNER);
    expect(res.status).toBe(201);
  });
});
