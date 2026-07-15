import { describe, it, expect } from "vitest";
import { createApp } from "../src/app.js";
import { SCRUM_MASTER, signIn } from "./helpers.js";

const app = createApp();

describe("sprint dates", () => {
  it("stores and serializes start/end dates", async () => {
    const sm = await signIn(app, SCRUM_MASTER);
    const res = await sm.post("/sprints").send({
      name: "Sprint 1",
      goal: "Ship auth",
      startDate: "2026-07-01",
      endDate: "2026-07-14",
    });
    expect(res.status).toBe(201);
    const sprint = res.body.data.sprint;
    expect(sprint.goal).toBe("Ship auth");
    expect(sprint.startDate).toContain("2026-07-01");
    expect(sprint.endDate).toContain("2026-07-14");
  });

  it("defaults dates to null when omitted", async () => {
    const sm = await signIn(app, SCRUM_MASTER);
    const res = await sm.post("/sprints").send({ name: "Sprint 2" });
    expect(res.status).toBe(201);
    expect(res.body.data.sprint.startDate).toBeNull();
    expect(res.body.data.sprint.endDate).toBeNull();
  });

  it("rejects an end date before the start date (400)", async () => {
    const sm = await signIn(app, SCRUM_MASTER);
    const res = await sm.post("/sprints").send({
      name: "Backwards",
      startDate: "2026-07-14",
      endDate: "2026-07-01",
    });
    expect(res.status).toBe(400);
  });

  it("rejects an unparseable date (400)", async () => {
    const sm = await signIn(app, SCRUM_MASTER);
    const res = await sm.post("/sprints").send({ name: "Bad", startDate: "not-a-date" });
    expect(res.status).toBe(400);
  });
});
