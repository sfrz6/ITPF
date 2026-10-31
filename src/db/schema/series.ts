import { relations } from "drizzle-orm";
import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { championships } from "./championships";
import { users } from "./identity";

/**
 * A "season": a named group of championships whose points combine into one
 * public leaderboard. Creating or editing a series is restricted to system
 * administrators (checked via `principal.isAdmin`, not a grantable
 * permission — see `requirePageAdmin`/`requireAdmin`), but a published
 * series' rankings are public, same as results.
 */
export const qualificationSeries = pgTable(
  "qualification_series",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    /** Shown instead of `name` on an Arabic-locale page when set. */
    nameAr: text("name_ar"),
    /** Public URL segment. Stable once the series is published. */
    slug: text("slug").notNull(),
    /** Controls whether the public rankings page shows this series. */
    isPublished: boolean("is_published").notNull().default(false),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("qualification_series_slug_idx").on(table.slug)],
);

/** A championship's membership in a series. Only published championships should be added. */
export const qualificationSeriesChampionships = pgTable(
  "qualification_series_championships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    seriesId: uuid("series_id")
      .notNull()
      .references(() => qualificationSeries.id, { onDelete: "cascade" }),
    championshipId: uuid("championship_id")
      .notNull()
      .references(() => championships.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("qualification_series_championships_unique_idx").on(
      table.seriesId,
      table.championshipId,
    ),
  ],
);

export const qualificationSeriesRelations = relations(qualificationSeries, ({ many }) => ({
  championships: many(qualificationSeriesChampionships),
}));

export const qualificationSeriesChampionshipsRelations = relations(
  qualificationSeriesChampionships,
  ({ one }) => ({
    series: one(qualificationSeries, {
      fields: [qualificationSeriesChampionships.seriesId],
      references: [qualificationSeries.id],
    }),
    championship: one(championships, {
      fields: [qualificationSeriesChampionships.championshipId],
      references: [championships.id],
    }),
  }),
);
