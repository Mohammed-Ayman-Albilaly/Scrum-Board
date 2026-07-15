import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PRODUCT_OWNER, SCRUM_MASTER, TEAM_MEMBER, signIn } from "./helpers.js";

const app = createApp();

async function makeSprint(agent: Awaited<ReturnType<typeof signIn>>, name = "Sprint 1") {
  const res = await agent.post("/sprints").send({ name });
  return res.body.data.sprint.id as string;
}

async function makeStory(agent: Awaited<ReturnType<typeof signIn>>, title = "Story") {
  const res = await agent.post("/stories").send({ title });
  return res.body.data.story.id as string;
}

describe("stories RBAC", () => {
  it("lets a Product Owner create a story", async () => {
    const po = await signIn(app, PRODUCT_OWNER);
    const res = await po.post("/stories").send({ title: "Backlog item", storyPoints: 3 });
    expect(res.status).toBe(201);
    expect(res.body.data.story).toMatchObject({ title: "Backlog item", storyPoints: 3 });
  });

  it("forbids a Team Member from creating a story (403)", async () => {
    const tm = await signIn(app, TEAM_MEMBER);
    const res = await tm.post("/stories").send({ title: "nope" });
    expect(res.status).toBe(403);
  });

  it("forbids a Scrum Master from creating a story (403)", async () => {
    const sm = await signIn(app, SCRUM_MASTER);
    const res = await sm.post("/stories").send({ title: "nope" });
    expect(res.status).toBe(403);
  });

  it("requires authentication to read the board (401)", async () => {
    const res = await request(app).get("/board");
    expect(res.status).toBe(401);
  });

  it("strips HTML from a story description", async () => {
    const po = await signIn(app, PRODUCT_OWNER);
    const res = await po
      .post("/stories")
      .send({ title: "XSS", description: "<script>alert(1)</script>hello" });
    expect(res.body.data.story.description).toBe("hello");
  });
});

describe("sprints RBAC", () => {
  it("lets a Scrum Master create and close a sprint", async () => {
    const sm = await signIn(app, SCRUM_MASTER);
    const created = await sm.post("/sprints").send({ name: "Sprint A", goal: "Ship" });
    expect(created.status).toBe(201);
    const closed = await sm.patch(`/sprints/${created.body.data.sprint.id}/close`);
    expect(closed.status).toBe(200);
    expect(closed.body.data.sprint.status).toBe("CLOSED");
  });

  it("forbids a Product Owner from creating a sprint (403)", async () => {
    const po = await signIn(app, PRODUCT_OWNER);
    const res = await po.post("/sprints").send({ name: "nope" });
    expect(res.status).toBe(403);
  });
});

describe("sprint workflow + locking", () => {
  it("runs a story from backlog to deployed and surfaces it on the board", async () => {
    const sm = await signIn(app, SCRUM_MASTER);
    const po = await signIn(app, PRODUCT_OWNER);
    const tm = await signIn(app, TEAM_MEMBER);
    const sprintId = await makeSprint(sm);
    const storyId = await makeStory(po, "Login");

    expect((await po.patch(`/stories/${storyId}/sprint`).send({ sprintId })).status).toBe(200);
    for (const column of ["UNDER_DEVELOPMENT", "UNDER_TESTING", "DEPLOYED"]) {
      expect((await tm.patch(`/stories/${storyId}/move`).send({ column })).status).toBe(200);
    }

    const board = (await tm.get("/board")).body.data;
    expect(board.deployed.map((s: { title: string }) => s.title)).toContain("Login");
    expect(board.sprints[0].columns.DEPLOYED).toHaveLength(1);
  });

  it("locks a closed sprint against moves and assignment (403)", async () => {
    const sm = await signIn(app, SCRUM_MASTER);
    const po = await signIn(app, PRODUCT_OWNER);
    const tm = await signIn(app, TEAM_MEMBER);
    const sprintId = await makeSprint(sm);
    const storyId = await makeStory(po);
    await po.patch(`/stories/${storyId}/sprint`).send({ sprintId });
    await sm.patch(`/sprints/${sprintId}/close`);

    expect((await tm.patch(`/stories/${storyId}/move`).send({ column: "UNDER_DEVELOPMENT" })).status).toBe(403);
    expect((await po.patch(`/stories/${storyId}/sprint`).send({ sprintId })).status).toBe(403);
  });
});

describe("ceremonies RBAC", () => {
  it("lets a Scrum Master log a ceremony", async () => {
    const sm = await signIn(app, SCRUM_MASTER);
    const res = await sm.post("/ceremonies").send({ type: "STANDUP", notes: "No blockers" });
    expect(res.status).toBe(201);
    expect(res.body.data.ceremony.type).toBe("STANDUP");
  });

  it("forbids a Team Member from logging a ceremony (403)", async () => {
    const tm = await signIn(app, TEAM_MEMBER);
    const res = await tm.post("/ceremonies").send({ type: "STANDUP" });
    expect(res.status).toBe(403);
  });

  it("rejects an invalid ceremony type (400)", async () => {
    const sm = await signIn(app, SCRUM_MASTER);
    const res = await sm.post("/ceremonies").send({ type: "INVALID" });
    expect(res.status).toBe(400);
  });
});
