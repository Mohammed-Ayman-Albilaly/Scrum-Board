import { describe, it, expect } from "vitest";
import { createApp } from "../src/app.js";
import { signIn } from "./helpers.js";

const app = createApp();

const userA = { name: "Alice PO", email: "alice@team.com", password: "password123", role: "PRODUCT_OWNER" } as const;
const userB = { name: "Bob TM", email: "bob@team.com", password: "password123", role: "TEAM_MEMBER", specialization: "BACKEND" } as const;
const userC = { name: "Cara PO", email: "cara@team.com", password: "password123", role: "PRODUCT_OWNER" } as const;

describe("projects & membership", () => {
  it("auto-enrolls a new signup in the shared default project", async () => {
    const a = await signIn(app, userA);
    const { projects } = (await a.get("/projects")).body.data;
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe("Team Project");
  });

  it("creates a project and lists it for the creator", async () => {
    const a = await signIn(app, userA);
    const created = (await a.post("/projects").send({ name: "Apollo" })).body.data.project;
    expect(created.name).toBe("Apollo");
    const { projects } = (await a.get("/projects")).body.data;
    expect(projects.map((p: { name: string }) => p.name)).toContain("Apollo");
  });
});

describe("cross-project isolation", () => {
  it("blocks a non-member from reading or writing another project's board", async () => {
    const a = await signIn(app, userA);
    const b = await signIn(app, userB);
    const p = (await a.post("/projects").send({ name: "Apollo" })).body.data.project.id;
    await a.post("/stories").query({ projectId: p }).send({ title: "Secret" });

    expect((await b.get("/board").query({ projectId: p })).status).toBe(403);
    expect((await b.get("/stories").query({ projectId: p })).status).toBe(403);
    expect((await b.post("/stories").query({ projectId: p }).send({ title: "Sneaky" })).status).toBe(403);
  });

  it("does not leak a project's stories into another project's board", async () => {
    const a = await signIn(app, userA);
    const p = (await a.post("/projects").send({ name: "Apollo" })).body.data.project.id;
    await a.post("/stories").query({ projectId: p }).send({ title: "Only in Apollo" });

    // Default project board (no projectId) must not contain Apollo's story.
    const def = (await a.get("/board")).body.data;
    expect(def.backlog.map((s: { title: string }) => s.title)).not.toContain("Only in Apollo");
    // Apollo's board does.
    const apollo = (await a.get("/board").query({ projectId: p })).body.data;
    expect(apollo.backlog.map((s: { title: string }) => s.title)).toContain("Only in Apollo");
  });
});

describe("invitations", () => {
  it("lets a member invite an existing user, who then gains access", async () => {
    const a = await signIn(app, userA);
    const b = await signIn(app, userB);
    const p = (await a.post("/projects").send({ name: "Apollo" })).body.data.project.id;

    expect((await b.get("/board").query({ projectId: p })).status).toBe(403);
    const invite = await a.post(`/projects/${p}/members`).send({ email: userB.email });
    expect(invite.status).toBe(201);
    expect((await b.get("/board").query({ projectId: p })).status).toBe(200);
    expect((await b.get("/projects")).body.data.projects.map((x: { id: string }) => x.id)).toContain(p);
  });

  it("rejects inviting an unknown email (404)", async () => {
    const a = await signIn(app, userA);
    const p = (await a.post("/projects").send({ name: "Apollo" })).body.data.project.id;
    const res = await a.post(`/projects/${p}/members`).send({ email: "nobody@team.com" });
    expect(res.status).toBe(404);
  });

  it("forbids a non-member from inviting into a project (403)", async () => {
    const a = await signIn(app, userA);
    const c = await signIn(app, userC);
    const p = (await a.post("/projects").send({ name: "Apollo" })).body.data.project.id;
    const res = await c.post(`/projects/${p}/members`).send({ email: userA.email });
    expect(res.status).toBe(403);
  });
});

describe("assignee must be a project member", () => {
  it("rejects assigning a story to a user outside its project (404)", async () => {
    const a = await signIn(app, userA);
    await signIn(app, userB); // exists, member of default only
    const p = (await a.post("/projects").send({ name: "Apollo" })).body.data.project.id;
    const storyId = (await a.post("/stories").query({ projectId: p }).send({ title: "Task" })).body.data.story.id;

    // Bob's id (from the default project directory, where both A and B are members).
    const members = (await a.get("/users")).body.data.members;
    const bob = members.find((m: { name: string }) => m.name === "Bob TM");
    const res = await a.patch(`/stories/${storyId}/assign`).query({ projectId: p }).send({ assigneeId: bob.id });
    expect(res.status).toBe(404);
  });
});
