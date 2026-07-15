// Aggregate the whole board in two queries (no N+1): product backlog, each
// sprint with its four sub-columns, and the global deployed list.
import { asc, eq } from "drizzle-orm";
import { db } from "../../config/db.js";
import { story } from "../stories/schema.js";
import { sprint } from "../sprints/schema.js";
import { serializeStory } from "../stories/logic.js";
import { serializeSprint } from "../sprints/logic.js";
import { SPRINT_COLUMN_VALUES, SPRINT_COLUMNS } from "../../config/constants.js";

type StoryDto = ReturnType<typeof serializeStory>;

function groupColumns(stories: StoryDto[]): Record<string, StoryDto[]> {
  const columns: Record<string, StoryDto[]> = {};
  for (const column of SPRINT_COLUMN_VALUES) columns[column] = [];
  for (const s of stories) if (s.column) columns[s.column]?.push(s);
  return columns;
}

export async function getBoard(projectId: string) {
  const [storyRows, sprintRows] = await Promise.all([
    db
      .select()
      .from(story)
      .where(eq(story.projectId, projectId))
      .orderBy(asc(story.priority), asc(story.createdAt)),
    db
      .select()
      .from(sprint)
      .where(eq(sprint.projectId, projectId))
      .orderBy(asc(sprint.createdAt)),
  ]);

  const stories = storyRows.map(serializeStory);
  return {
    backlog: stories.filter((s) => s.sprintId === null),
    sprints: sprintRows.map((sp) => ({
      ...serializeSprint(sp),
      columns: groupColumns(stories.filter((s) => s.sprintId === sp.id)),
    })),
    deployed: stories.filter((s) => s.column === SPRINT_COLUMNS.DEPLOYED),
  };
}
