// Better Auth instance: email/password sessions with HttpOnly, SameSite=Strict cookies.
// Password hashing (scrypt) and session storage handled by Better Auth over Drizzle.
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../config/db.js";
import { env, isProd } from "../config/env.js";
import * as schema from "./schema.js";

export const auth = betterAuth({
  secret: env.SESSION_SECRET,
  // Local base URL; a PaaS deploy should set BETTER_AUTH_URL to the public origin.
  baseURL: `http://localhost:${env.PORT}`,
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      role: { type: "string", required: true, input: true },
      specialization: { type: "string", required: false, input: true },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once per day
  },
  advanced: {
    useSecureCookies: isProd, // Secure flag only over HTTPS (production)
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "strict",
    },
  },
});
