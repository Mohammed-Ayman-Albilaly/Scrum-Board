import { describe, it, expect } from "vitest";
import { createApp } from "../src/app.js";
import { SCRUM_MASTER, TEAM_MEMBER, signIn } from "./helpers.js";

const app = createApp();

describe("structured ceremonies", () => {
  it("logs a retrospective with three columns and reads them back", async () => {
    const sm = await signIn(app, SCRUM_MASTER);
    const res = await sm.post("/ceremonies").send({
      type: "RETRO",
      wentWell: "Shipped auth",
      needsImprovement: "Flaky tests",
      actionItems: "Stabilize CI",
    });
    expect(res.status).toBe(201);
    expect(res.body.data.ceremony.details).toEqual({
      wentWell: "Shipped auth",
      needsImprovement: "Flaky tests",
      actionItems: "Stabilize CI",
    });
  });

  it("logs planning with a numeric committedPoints", async () => {
    const sm = await signIn(app, SCRUM_MASTER);
    const res = await sm.post("/ceremonies").send({
      type: "PLANNING",
      goal: "Deliver board",
      committedPoints: 21,
      capacity: "Two devs out Friday",
    });
    expect(res.status).toBe(201);
    const d = res.body.data.ceremony.details;
    expect(d.goal).toBe("Deliver board");
    expect(d.committedPoints).toBe(21);
    expect(d.capacity).toBe("Two devs out Friday");
  });

  it("drops fields that do not belong to the ceremony type", async () => {
    const sm = await signIn(app, SCRUM_MASTER);
    const res = await sm.post("/ceremonies").send({
      type: "STANDUP",
      blockers: "DB down",
      wentWell: "should be ignored",
      committedPoints: 99,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.ceremony.details).toEqual({ blockers: "DB down" });
  });

  it("sanitizes HTML out of ceremony text (stored XSS)", async () => {
    const sm = await signIn(app, SCRUM_MASTER);
    const res = await sm.post("/ceremonies").send({
      type: "STANDUP",
      blockers: "<script>alert(1)</script>network flaky",
    });
    expect(res.status).toBe(201);
    const stored = res.body.data.ceremony.details.blockers as string;
    expect(stored).not.toContain("<script");
    expect(stored).toContain("network flaky");
  });

  it("rejects an out-of-range committedPoints (400)", async () => {
    const sm = await signIn(app, SCRUM_MASTER);
    const res = await sm.post("/ceremonies").send({ type: "PLANNING", committedPoints: -5 });
    expect(res.status).toBe(400);
  });

  it("forbids a Team Member from logging a ceremony (403)", async () => {
    const tm = await signIn(app, TEAM_MEMBER);
    const res = await tm.post("/ceremonies").send({ type: "RETRO", wentWell: "nope" });
    expect(res.status).toBe(403);
  });

  it("returns logged ceremonies with parsed details on GET", async () => {
    const sm = await signIn(app, SCRUM_MASTER);
    await sm.post("/ceremonies").send({ type: "REVIEW", demoSummary: "Demoed login", feedback: "Looks good" });
    const list = (await sm.get("/ceremonies")).body.data.ceremonies;
    expect(list).toHaveLength(1);
    expect(list[0].type).toBe("REVIEW");
    expect(list[0].details.demoSummary).toBe("Demoed login");
  });
});
