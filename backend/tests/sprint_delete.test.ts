// DELETE /sprints/:id — Scrum-Master-only sprint deletion, used e.g. to
// remove an accidental duplicate. Refuses deletion while stories remain.
import { describe, it, expect } from "vitest";
import { createApp } from "../src/app.js";
import { PRODUCT_OWNER, SCRUM_MASTER, TEAM_MEMBER, signIn } from "./helpers.js";

const app = createApp();

describe("DELETE /sprints/:id", () => {
  it("lets a Scrum Master delete an empty sprint", async () => {
    const sm = await signIn(app, SCRUM_MASTER);
    const created = (await sm.post("/sprints").send({ name: "Duplicate" })).body.data.sprint;

    const res = await sm.delete(`/sprints/${created.id}`);
    expect(res.status).toBe(200);

    const { sprints } = (await sm.get("/sprints")).body.data;
    expect(sprints.map((s: { id: string }) => s.id)).not.toContain(created.id);
  });

  it("also removes ceremony logs tied to the deleted sprint", async () => {
    const sm = await signIn(app, SCRUM_MASTER);
    const sprint = (await sm.post("/sprints").send({ name: "Sprint 1" })).body.data.sprint;
    await sm.post("/ceremonies").send({ type: "STANDUP", sprintId: sprint.id, blockers: "none" });

    await sm.delete(`/sprints/${sprint.id}`);

    const { ceremonies } = (await sm.get("/ceremonies")).body.data;
    expect(ceremonies.find((c: { sprintId: string | null }) => c.sprintId === sprint.id)).toBeUndefined();
  });

  it("refuses to delete a sprint that still has stories (409)", async () => {
    const po = await signIn(app, PRODUCT_OWNER);
    const sm = await signIn(app, SCRUM_MASTER);
    const sprint = (await sm.post("/sprints").send({ name: "Busy sprint" })).body.data.sprint;
    const story = (await po.post("/stories").send({ title: "In the sprint" })).body.data.story;
    await po.patch(`/stories/${story.id}/sprint`).send({ sprintId: sprint.id });

    const res = await sm.delete(`/sprints/${sprint.id}`);
    expect(res.status).toBe(409);

    // The sprint (and its story) must still be there afterward.
    const { sprints } = (await sm.get("/sprints")).body.data;
    expect(sprints.map((s: { id: string }) => s.id)).toContain(sprint.id);
  });

  it("forbids a Team Member from deleting a sprint (403)", async () => {
    const sm = await signIn(app, SCRUM_MASTER);
    const tm = await signIn(app, TEAM_MEMBER);
    const sprint = (await sm.post("/sprints").send({ name: "Sprint" })).body.data.sprint;
    const res = await tm.delete(`/sprints/${sprint.id}`);
    expect(res.status).toBe(403);
  });

  it("forbids a Product Owner from deleting a sprint (403)", async () => {
    const sm = await signIn(app, SCRUM_MASTER);
    const po = await signIn(app, PRODUCT_OWNER);
    const sprint = (await sm.post("/sprints").send({ name: "Sprint" })).body.data.sprint;
    const res = await po.delete(`/sprints/${sprint.id}`);
    expect(res.status).toBe(403);
  });

  it("404s for a sprint that does not exist", async () => {
    const sm = await signIn(app, SCRUM_MASTER);
    const res = await sm.delete("/sprints/ghost-sprint");
    expect(res.status).toBe(404);
  });

  it("allows deleting a CLOSED sprint too, once it has no stories", async () => {
    const sm = await signIn(app, SCRUM_MASTER);
    const sprint = (await sm.post("/sprints").send({ name: "Sprint" })).body.data.sprint;
    await sm.patch(`/sprints/${sprint.id}/close`);
    const res = await sm.delete(`/sprints/${sprint.id}`);
    expect(res.status).toBe(200);
  });
});
