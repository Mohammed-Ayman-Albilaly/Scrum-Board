import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PRODUCT_OWNER, SCRUM_MASTER, TEAM_MEMBER, signIn } from "./helpers.js";

const app = createApp();

describe("POST /auth/signup", () => {
  it("creates a Product Owner and sets a hardened session cookie", async () => {
    const res = await request(app).post("/auth/signup").send(PRODUCT_OWNER);

    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({
      email: PRODUCT_OWNER.email,
      role: "PRODUCT_OWNER",
      specialization: null,
    });
    const cookie = String(res.headers["set-cookie"]?.[0] ?? "");
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
  });

  it("never returns a password hash or token", async () => {
    const res = await request(app).post("/auth/signup").send(SCRUM_MASTER);
    const body = JSON.stringify(res.body);
    expect(res.status).toBe(201);
    expect(body).not.toMatch(/password/i);
    expect(body).not.toMatch(/token/i);
  });

  it("creates a Team Member with a specialization", async () => {
    const res = await request(app).post("/auth/signup").send(TEAM_MEMBER);
    expect(res.status).toBe(201);
    expect(res.body.data.user.specialization).toBe("BACKEND");
  });

  it("rejects a duplicate email with 409", async () => {
    await request(app).post("/auth/signup").send(PRODUCT_OWNER);
    const res = await request(app).post("/auth/signup").send(PRODUCT_OWNER);
    expect(res.status).toBe(409);
  });

  it("rejects an invalid role with 400", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ ...PRODUCT_OWNER, role: "ADMIN" });
    expect(res.status).toBe(400);
  });

  it("rejects a short password with 400", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ ...PRODUCT_OWNER, password: "short" });
    expect(res.status).toBe(400);
  });

  it("rejects a malformed email with 400", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ ...PRODUCT_OWNER, email: "not-an-email" });
    expect(res.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  it("logs in with correct credentials and sets a cookie", async () => {
    await request(app).post("/auth/signup").send(PRODUCT_OWNER);
    const res = await request(app)
      .post("/auth/login")
      .send({ email: PRODUCT_OWNER.email, password: PRODUCT_OWNER.password });
    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]).toBeDefined();
  });

  it("rejects a wrong password with a generic 401", async () => {
    await request(app).post("/auth/signup").send(PRODUCT_OWNER);
    const res = await request(app)
      .post("/auth/login")
      .send({ email: PRODUCT_OWNER.email, password: "wrong-password" });
    expect(res.status).toBe(401);
  });

  it("does not leak whether an email exists (unknown email also 401)", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@team.com", password: "whatever12345" });
    expect(res.status).toBe(401);
  });
});

describe("GET /auth/me + POST /auth/logout", () => {
  it("returns the current user when authenticated", async () => {
    const agent = await signIn(app, PRODUCT_OWNER);
    const res = await agent.get("/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(PRODUCT_OWNER.email);
  });

  it("clears the session on logout", async () => {
    const agent = await signIn(app, PRODUCT_OWNER);
    const out = await agent.post("/auth/logout");
    expect(out.status).toBe(200);
    const after = await agent.get("/auth/me");
    expect(after.status).toBe(401);
  });

  it("rejects /auth/me without a session (401)", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });
});
