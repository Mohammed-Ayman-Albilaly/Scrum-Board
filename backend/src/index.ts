// App entry — seeds the shared project, builds the app, binds the network port.
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { ensureDefaultProject } from "./features/projects/seed.js";

await ensureDefaultProject();

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`ScrumBoard API listening on http://localhost:${env.PORT}`);
});
