import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PRODUCT_OWNER, TEAM_MEMBER } from "./helpers.js";

const app = createApp();

describe("specialization RBAC rule", () => {
  it("requires a specialization for Team Members", async () => {
    const { specialization, ...withoutSpec } = TEAM_MEMBER;
    void specialization;
    const res = await request(app).post("/auth/signup").send(withoutSpec);
    expect(res.status).toBe(400);
  });

  it("forbids a specialization for non-Team-Member roles", async () => {
    const res = await request(app)
      .post("/auth/signup")
      .send({ ...PRODUCT_OWNER, specialization: "QA" });
    expect(res.status).toBe(400);
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
