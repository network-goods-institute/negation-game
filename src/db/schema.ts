import { USERNAME_MAX_LENGHT, USERNAME_MIN_LENGHT } from "@/constants/config";
import { InferColumnsDataTypes, lt, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
  varchar,
  vector,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const usersTable = pgTable(
  "users",
  {
    id: varchar("id").primaryKey(),
    username: varchar("username").notNull(),
    cred: integer("cred").notNull().default(0),
  },
  (table) => ({
    noNegativeCred: check("noNegativeCred", sql`${table.cred} >= 0`),
    usernameUniqueIndex: uniqueIndex("usernameUniqueIndex").on(
      sql`lower(${table.username})`
    ),
    usernameFormatConstraint: check(
      "usernameFormat",
      sql`LENGTH(${table.username}) BETWEEN ${USERNAME_MIN_LENGHT} AND ${USERNAME_MAX_LENGHT}
        AND ${table.username} ~ '/^[a-zA-Z0-9][_a-zA-Z0-9]+[a-zA-Z0-9]$/'` //only letters, numbers and underscores; cannot start or end with an underscore
    ),
  })
);

export const pointsTable = pgTable("points", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const embeddingsTable = pgTable(
  "embeddings",
  {
    id: serial("point_id")
      .primaryKey()
      .references(() => pointsTable.id),
    embedding: vector("embedding", { dimensions: 384 }),
  }
  // (table) => ({
  //   embeddingIndex: index("embeddingIndex").using(
  //     "hnsw",
  //     table.embedding.op("vector_cosine_ops")
  //   ),
  // })
);

export const negationsTable = pgTable(
  "negations",
  {
    id: serial("id").primaryKey(),
    olderPointId: serial("older_point_id").references(() => pointsTable.id),
    newerPointId: serial("newer_point_id").references(() => pointsTable.id),
    createdBy: varchar("created_by").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    olderPointFirstConstraint: check(
      "olderPointFirst",
      lt(table.olderPointId, table.newerPointId)
    ),
    olderPointIndex: index("olderPointIndex").on(table.olderPointId),
    newerPointIndex: index("newerPointIndex").on(table.newerPointId),
    uniqueNegationsConstraint: unique("uniqueNegation").on(
      table.olderPointId,
      table.newerPointId
    ),
  })
);

export const endorsementsTable = pgTable(
  "endorsements",
  {
    id: serial("id").primaryKey(),
    cred: integer("cred").notNull(),
    pointId: serial("point_id").references(() => pointsTable.id),
    userId: varchar("user_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userEndorsementsIndex: index().on(table.userId),
    pointEndorsementsIndex: index().on(table.pointId),
  })
);

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;
export type User = InferColumnsDataTypes<typeof usersTable._.columns>;

export type InsertPoint = Omit<
  typeof pointsTable.$inferInsert,
  "id" | "createdAt"
>;
export type SelectPoint = typeof pointsTable.$inferSelect;
export type Point = InferColumnsDataTypes<typeof pointsTable._.columns>;

export type InsertEmbedding = typeof embeddingsTable.$inferInsert;
export type SelectEmbedding = typeof embeddingsTable.$inferSelect;
export type Embedding = InferColumnsDataTypes<typeof embeddingsTable._.columns>;

export type InsertNegation = typeof negationsTable.$inferInsert;
export type SelectNegation = typeof negationsTable.$inferSelect;
export type Negation = InferColumnsDataTypes<typeof negationsTable._.columns>;

export type InsertEndorsement = typeof endorsementsTable.$inferInsert;
export type SelectEndorsement = typeof endorsementsTable.$inferSelect;
export type Endorsement = InferColumnsDataTypes<
  typeof endorsementsTable._.columns
>;

export const insertPointSchema = createInsertSchema(pointsTable);

export const insertUserSchema = createInsertSchema(usersTable, {
  username: (schema) =>
    schema.username
      .min(
        USERNAME_MIN_LENGHT,
        `must be at least ${USERNAME_MIN_LENGHT} characters long`
      )
      .max(
        USERNAME_MAX_LENGHT,
        `must be at most ${USERNAME_MAX_LENGHT} characters long`
      )
      .regex(
        /[_a-zA-Z0-9]+/,
        "can only contain letters, numbers and underscores"
      )
      .regex(/^(?!_).*(?<!_)$/, "cannot start or end with an underscore"),
});
