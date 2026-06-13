import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

import { user } from "./auth.schema";

export const matchStageEnum = pgEnum("match_stage", [
  "GROUP",
  "LAST_16",
  "QUARTER",
  "SEMI",
  "THIRD_PLACE",
  "FINAL",
]);

export const matchStatusEnum = pgEnum("match_status", [
  "SCHEDULED",
  "LIVE",
  "FINISHED",
  "POSTPONED",
]);

export const matches = pgTable(
  "matches",
  {
    externalId: integer("external_id").primaryKey(),
    homeTeam: text("home_team").notNull(),
    awayTeam: text("away_team").notNull(),
    homeCrest: text("home_crest"),
    awayCrest: text("away_crest"),
    kickoffAt: timestamp("kickoff_at", { withTimezone: true }).notNull(),
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    status: matchStatusEnum("status").notNull().default("SCHEDULED"),
    stage: matchStageEnum("stage").notNull(),
    groupName: text("group_name"),
    manualOverride: boolean("manual_override").default(false).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index("matches_stage_group_idx").on(table.stage, table.groupName),
    index("matches_kickoff_idx").on(table.kickoffAt),
  ],
);

export const predictions = pgTable(
  "predictions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.externalId, { onDelete: "cascade" }),
    homeScore: integer("home_score").notNull(),
    awayScore: integer("away_score").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    unique("predictions_user_match_unique").on(table.userId, table.matchId),
    index("predictions_user_id_idx").on(table.userId),
    index("predictions_match_id_idx").on(table.matchId),
  ],
);

export const syncMeta = pgTable("sync_meta", {
  id: integer("id").primaryKey().default(1),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
  syncing: boolean("syncing").default(false).notNull(),
  lastSyncError: text("last_sync_error"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const predictionsRelations = relations(predictions, ({ one }) => ({
  user: one(user, { fields: [predictions.userId], references: [user.id] }),
  match: one(matches, { fields: [predictions.matchId], references: [matches.externalId] }),
}));
