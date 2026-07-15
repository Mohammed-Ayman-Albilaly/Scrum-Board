import { describe, it, expect } from "vitest";
import { createApp } from "../src/app.js";
import { PRODUCT_OWNER, SCRUM_MASTER, TEAM_MEMBER, signIn } from "./helpers.js";

const app = createApp();

async function backlogIds(agent: Awaited<ReturnType<typeof signIn>>) {
  const board = (await agent.get("/board")).body.data;
  return board.backlog.map((s: { id: string }) => s.id) as string[];
}

describe("PATCH /stories/:id/reorder", () => {
  it("moves a backlog story up and down, keeping order stable", async () => {
    const po = await signIn(app, PRODUCT_OWNER);
    const s1 = (await po.post("/stories").send({ title: "One" })).body.data.story.id;
    const s2 = (await po.post("/stories").send({ title: "Two" })).body.data.story.id;
    const s3 = (await po.post("/stories").send({ title: "Three" })).body.data.story.id;
    expect(await backlogIds(po)).toEqual([s1, s2, s3]);

    await po.patch(`/stories/${s3}/reorder`).send({ direction: "UP" });
    expect(await backlogIds(po)).toEqual([s1, s3, s2]);

    await po.patch(`/stories/${s1}/reorder`).send({ direction: "DOWN" });
    expect(await backlogIds(po)).toEqual([s3, s1, s2]);
  });

  it("is a no-op at the top of the list", async () => {
    const po = await signIn(app, PRODUCT_OWNER);
    const s1 = (await po.post("/stories").send({ title: "First" })).body.data.story.id;
    const s2 = (await po.post("/stories").send({ title: "Second" })).body.data.story.id;
    const res = await po.patch(`/stories/${s1}/reorder`).send({ direction: "UP" });
    expect(res.status).toBe(200);
    expect(await backlogIds(po)).toEqual([s1, s2]);
  });

  it("rejects an invalid direction (400)", async () => {
    const po = await signIn(app, PRODUCT_OWNER);
    const s1 = (await po.post("/stories").send({ title: "X" })).body.data.story.id;
    const res = await po.patch(`/stories/${s1}/reorder`).send({ direction: "SIDEWAYS" });
    expect(res.status).toBe(400);
  });

  it("refuses to reorder a story that is in a sprint (400)", async () => {
    const po = await signIn(app, PRODUCT_OWNER);
    const sm = await signIn(app, SCRUM_MASTER);
    const sprintId = (await sm.post("/sprints").send({ name: "S1" })).body.data.sprint.id;
    const sid = (await po.post("/stories").send({ title: "In sprint" })).body.data.story.id;
    await po.patch(`/stories/${sid}/sprint`).send({ sprintId });
    const res = await po.patch(`/stories/${sid}/reorder`).send({ direction: "UP" });
    expect(res.status).toBe(400);
  });

  it("forbids a Team Member from reordering (403)", async () => {
    const po = await signIn(app, PRODUCT_OWNER);
    const tm = await signIn(app, TEAM_MEMBER);
    const sid = (await po.post("/stories").send({ title: "Y" })).body.data.story.id;
    const res = await tm.patch(`/stories/${sid}/reorder`).send({ direction: "UP" });
    expect(res.status).toBe(403);
  });
});
