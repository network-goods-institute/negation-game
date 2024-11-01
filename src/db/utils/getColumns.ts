import {
  Subquery,
  Table,
  View,
  ViewBaseConfig,
  is,
  type ColumnsSelection,
  type WithSubquery,
} from "drizzle-orm";
import type { AnyMySqlSelect } from "drizzle-orm/mysql-core";
import type { AnyPgSelect } from "drizzle-orm/pg-core";
import type { AnySQLiteSelect } from "drizzle-orm/sqlite-core";
import type { SetOptional } from "type-fest";

/**
 * Dialect agnostic AnySelect.
 *
 * @see AnyPgSelect
 * @see AnyMySqlSelect
 * @see AnySQLiteSelect
 */
export type AnySelect = SetOptional<
  AnyPgSelect | AnyMySqlSelect | AnySQLiteSelect,
  "where"
>;

/**
 * Infer table columns or (sub)query fields.
 */
export type InferColumns<
  T extends Table | View | Subquery | WithSubquery | AnySelect,
> = T extends Table
  ? T["_"]["columns"]
  : T extends View | Subquery | WithSubquery | AnySelect
    ? T["_"]["selectedFields"]
    : never;

/**
 * Should replace `getTableColumns` to allow for more input versatility.
 *
 * @see https://github.com/drizzle-team/drizzle-orm/pull/1789
 */
export function getColumns<
  T extends
    | Table
    | View
    | Subquery<string, ColumnsSelection>
    | WithSubquery<string, ColumnsSelection>
    | AnySelect,
>(table: T): InferColumns<T> {
  return is(table, Table)
    ? (table as any)[(Table as any).Symbol.Columns]
    : is(table, View)
      ? (table as any)[ViewBaseConfig].selectedFields
      : table._.selectedFields;
}
