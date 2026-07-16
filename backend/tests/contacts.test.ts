// GET /users/contacts — derived "people you've worked with" list.
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { signIn } from "./helpers.js";

const app = createApp();

const ANA = { name: "Ana", email: "ana@team.com", password: "password123" } as const;
const BEN = { name: "Ben", email: "ben@team.com", password: "password123" } as const;
const CLEO = { name: "Cleo", email: "cleo@team.com", password: "password123" } as const;

type Contact = { id: string; name: string; email: string; sharedProjects: Array<{ name: string }> };

describe("GET /users/contacts", () => {
  it("requires authentication (401)", async () => {
    const res = await request(app).get("/users/contacts");
    expect(res.status).toBe(401);
  });

  it("lists co-members of shared projects, excluding self", async () => {
    const ana = await signIn(app, ANA);
    await signIn(app, BEN); // both auto-enrolled in the default project
    const { contacts } = (await ana.get("/users/contacts")).body.data;
    const names = (contacts as Contact[]).map((c) => c.name);
    expect(names).toContain("Ben");
    expect(names).not.toContain("Ana");
  });

  it("dedupes a contact shared across several projects and lists each shared project once", async () => {
    const ana = await signIn(app, ANA);
    await signIn(app, BEN);
    const p = (await ana.post("/projects").send({ name: "Apollo" })).body.data.project.id;
    await ana.post(`/projects/${p}/members`).send({ email: BEN.email }); // founder SM invites

    const { contacts } = (await ana.get("/users/contacts")).body.data;
    const ben = (contacts as Contact[]).find((c) => c.name === "Ben");
    expect(contacts).toHaveLength(1); // still one row for Ben
    expect(ben?.sharedProjects.map((x) => x.name).sort()).toEqual(["Apollo", "Team Project"]);
  });

  it("does not surface users from projects the caller is not in", async () => {
    const ana = await signIn(app, ANA);
    const ben = await signIn(app, BEN);
    await signIn(app, CLEO);
    // Ben founds a private project with Cleo; Ana is not in it.
    const p = (await ben.post("/projects").send({ name: "Private" })).body.data.project.id;
    await ben.post(`/projects/${p}/members`).send({ email: CLEO.email });

    const { contacts } = (await ana.get("/users/contacts")).body.data;
    const cleo = (contacts as Contact[]).find((c) => c.name === "Cleo");
    // Cleo IS a contact (both in default project) but Private must not leak.
    expect(cleo?.sharedProjects.map((x) => x.name)).toEqual(["Team Project"]);
  });
});
