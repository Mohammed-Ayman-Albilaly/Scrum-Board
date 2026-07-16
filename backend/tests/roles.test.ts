// Per-project role model: founder bootstrap, SM-only member management,
// role-set validation, union permissions, cross-project isolation.
import { describe, it, expect } from "vitest";
import { createApp } from "../src/app.js";
import { signIn, grantProjectRoles } from "./helpers.js";

const app = createApp();

const FOUNDER = { name: "Fay Founder", email: "fay@team.com", password: "password123" } as const;
const INVITEE = { name: "Ivy Invitee", email: "ivy@team.com", password: "password123" } as const;
const OUTSIDER = { name: "Oz Outsider", email: "oz@team.com", password: "password123" } as const;

type Agent = Awaited<ReturnType<typeof signIn>>;
type Member = { id: string; name: string; roles: string[] };

async function createProject(agent: Agent, name = "Apollo"): Promise<string> {
  return (await agent.post("/projects").send({ name })).body.data.project.id as string;
}

async function memberId(agent: Agent, projectId: string, name: string): Promise<string> {
  const members = (await agent.get("/users").query({ projectId })).body.data.members as Member[];
  const m = members.find((x) => x.name === name);
  if (!m) throw new Error(`no member named ${name}`);
  return m.id;
}

describe("founder bootstrap", () => {
  it("grants the project creator SCRUM_MASTER in the new project", async () => {
    const fay = await signIn(app, FOUNDER);
    const p = await createProject(fay);
    const { projects } = (await fay.get("/projects")).body.data;
    const apollo = projects.find((x: { id: string }) => x.id === p);
    expect(apollo.roles).toEqual(["SCRUM_MASTER"]);
  });

  it("lists roles per project on GET /projects (default = TEAM_MEMBER)", async () => {
    const fay = await signIn(app, FOUNDER);
    const { projects } = (await fay.get("/projects")).body.data;
    expect(projects[0].roles).toEqual(["TEAM_MEMBER"]); // default project enrollment
  });
});

describe("SM-only member management", () => {
  it("lets the founding SM invite with explicit roles", async () => {
    const fay = await signIn(app, FOUNDER);
    await signIn(app, INVITEE);
    const p = await createProject(fay);
    const res = await fay
      .post(`/projects/${p}/members`)
      .send({ email: INVITEE.email, roles: ["PRODUCT_OWNER", "TEAM_MEMBER"] });
    expect(res.status).toBe(201);
    const ivyId = await memberId(fay, p, INVITEE.name);
    const members = (await fay.get("/users").query({ projectId: p })).body.data.members as Member[];
    const ivy = members.find((m) => m.id === ivyId);
    expect(ivy?.roles?.slice().sort()).toEqual(["PRODUCT_OWNER", "TEAM_MEMBER"]);
  });

  it("forbids a non-SM member from inviting (403)", async () => {
    const fay = await signIn(app, FOUNDER);
    const ivy = await signIn(app, INVITEE);
    await signIn(app, OUTSIDER);
    const p = await createProject(fay);
    await fay.post(`/projects/${p}/members`).send({ email: INVITEE.email }); // Ivy joins as TM
    const res = await ivy.post(`/projects/${p}/members`).send({ email: OUTSIDER.email });
    expect(res.status).toBe(403);
  });

  it("forbids an SM of another project from inviting (403)", async () => {
    const fay = await signIn(app, FOUNDER);
    const oz = await signIn(app, OUTSIDER);
    const p = await createProject(fay);
    await createProject(oz, "OzWorld"); // Oz is SM of OzWorld, not of Apollo
    const res = await oz.post(`/projects/${p}/members`).send({ email: OUTSIDER.email });
    expect(res.status).toBe(403);
  });

  it("replaces a member's role set via PATCH (SM only)", async () => {
    const fay = await signIn(app, FOUNDER);
    await signIn(app, INVITEE);
    const p = await createProject(fay);
    await fay.post(`/projects/${p}/members`).send({ email: INVITEE.email });
    const ivyId = await memberId(fay, p, INVITEE.name);

    const ok = await fay
      .patch(`/projects/${p}/members/${ivyId}/roles`)
      .send({ roles: ["SCRUM_MASTER", "PRODUCT_OWNER"] });
    expect(ok.status).toBe(200);
    const members = (await fay.get("/users").query({ projectId: p })).body.data.members as Member[];
    expect(members.find((m) => m.id === ivyId)?.roles?.slice().sort()).toEqual([
      "PRODUCT_OWNER",
      "SCRUM_MASTER",
    ]);
  });

  it("validates the role set: empty 400, unknown role 400, non-member target 404, non-SM caller 403", async () => {
    const fay = await signIn(app, FOUNDER);
    const ivy = await signIn(app, INVITEE);
    const p = await createProject(fay);
    await fay.post(`/projects/${p}/members`).send({ email: INVITEE.email });
    const ivyId = await memberId(fay, p, INVITEE.name);

    expect((await fay.patch(`/projects/${p}/members/${ivyId}/roles`).send({ roles: [] })).status).toBe(400);
    expect((await fay.patch(`/projects/${p}/members/${ivyId}/roles`).send({ roles: ["ADMIN"] })).status).toBe(400);
    expect((await fay.patch(`/projects/${p}/members/ghost-user/roles`).send({ roles: ["TEAM_MEMBER"] })).status).toBe(404);
    expect((await ivy.patch(`/projects/${p}/members/${ivyId}/roles`).send({ roles: ["SCRUM_MASTER"] })).status).toBe(403);
  });
});

describe("union permissions", () => {
  it("lets a PO+SM member both create stories and create sprints in one project", async () => {
    const fay = await signIn(app, FOUNDER);
    const p = await createProject(fay);
    await grantProjectRoles(FOUNDER.email, ["PRODUCT_OWNER", "SCRUM_MASTER"], p);

    expect((await fay.post("/stories").query({ projectId: p }).send({ title: "Story" })).status).toBe(201);
    expect((await fay.post("/sprints").query({ projectId: p }).send({ name: "Sprint 1" })).status).toBe(201);
  });

  it("scopes roles to their project: PO in Apollo is still TM-only in the default project", async () => {
    const fay = await signIn(app, FOUNDER);
    const p = await createProject(fay);
    await grantProjectRoles(FOUNDER.email, ["PRODUCT_OWNER"], p);

    expect((await fay.post("/stories").query({ projectId: p }).send({ title: "In Apollo" })).status).toBe(201);
    // No projectId → default project, where Fay is only TEAM_MEMBER.
    expect((await fay.post("/stories").send({ title: "In default" })).status).toBe(403);
  });
});
