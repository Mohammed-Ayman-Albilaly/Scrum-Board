import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { PRODUCT_OWNER, SCRUM_MASTER, TEAM_MEMBER, signIn } from "./helpers.js";

const app = createApp();

type Member = { id: string; name: string; role: string; specialization: string | null };

/** Sign up PO/SM/TM and return them plus the Team Member's directory id. */
async function seedTeam() {
  const po = await signIn(app, PRODUCT_OWNER);
  const sm = await signIn(app, SCRUM_MASTER);
  const tm = await signIn(app, TEAM_MEMBER);
  const members = (await po.get("/users")).body.data.members as Member[];
  const teamMember = members.find((m) => m.role === "TEAM_MEMBER");
  if (!teamMember) throw new Error("seed failed: no team member in directory");
  return { po, sm, tm, teamMemberId: teamMember.id, members };
}

async function makeStory(agent: Awaited<ReturnType<typeof signIn>>, title = "Story") {
  const res = await agent.post("/stories").send({ title });
  return res.body.data.story.id as string;
}

describe("GET /users directory", () => {
  it("requires authentication (401)", async () => {
    const res = await request(app).get("/users");
    expect(res.status).toBe(401);
  });

  it("lists members without leaking email or password hash", async () => {
    const { members } = await seedTeam();
    expect(members).toHaveLength(3);
    for (const m of members) {
      expect(m).toHaveProperty("id");
      expect(m).toHaveProperty("name");
      expect(m).toHaveProperty("role");
      expect(m).not.toHaveProperty("email");
      expect(m).not.toHaveProperty("password");
    }
    const tm = members.find((m) => m.role === "TEAM_MEMBER");
    expect(tm?.specialization).toBe("BACKEND");
  });
});

describe("PATCH /stories/:id/assign", () => {
  it("lets a Product Owner assign a story to a team member", async () => {
    const { po, teamMemberId } = await seedTeam();
    const storyId = await makeStory(po, "Login");
    const res = await po.patch(`/stories/${storyId}/assign`).send({ assigneeId: teamMemberId });
    expect(res.status).toBe(200);
    expect(res.body.data.story.assigneeId).toBe(teamMemberId);

    const board = (await po.get("/board")).body.data;
    expect(board.backlog[0].assigneeId).toBe(teamMemberId);
  });

  it("clears an assignee when given null", async () => {
    const { po, teamMemberId } = await seedTeam();
    const storyId = await makeStory(po);
    await po.patch(`/stories/${storyId}/assign`).send({ assigneeId: teamMemberId });
    const res = await po.patch(`/stories/${storyId}/assign`).send({ assigneeId: null });
    expect(res.status).toBe(200);
    expect(res.body.data.story.assigneeId).toBeNull();
  });

  it("rejects a non-existent assignee with 404", async () => {
    const { po } = await seedTeam();
    const storyId = await makeStory(po);
    const res = await po.patch(`/stories/${storyId}/assign`).send({ assigneeId: "ghost-user" });
    expect(res.status).toBe(404);
  });

  it("forbids a Team Member from assigning (403)", async () => {
    const { po, tm, teamMemberId } = await seedTeam();
    const storyId = await makeStory(po);
    const res = await tm.patch(`/stories/${storyId}/assign`).send({ assigneeId: teamMemberId });
    expect(res.status).toBe(403);
  });

  it("forbids a Scrum Master from assigning (403)", async () => {
    const { po, sm, teamMemberId } = await seedTeam();
    const storyId = await makeStory(po);
    const res = await sm.patch(`/stories/${storyId}/assign`).send({ assigneeId: teamMemberId });
    expect(res.status).toBe(403);
  });

  it("locks assignment on a story in a closed sprint (403)", async () => {
    const { po, sm, teamMemberId } = await seedTeam();
    const sprintId = (await sm.post("/sprints").send({ name: "Sprint 1" })).body.data.sprint.id;
    const storyId = await makeStory(po);
    await po.patch(`/stories/${storyId}/sprint`).send({ sprintId });
    await sm.patch(`/sprints/${sprintId}/close`);
    const res = await po.patch(`/stories/${storyId}/assign`).send({ assigneeId: teamMemberId });
    expect(res.status).toBe(403);
  });
});
