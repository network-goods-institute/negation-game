DROP VIEW "public"."point_counterpoints_view";--> statement-breakpoint
CREATE VIEW "public"."point_counterpoints_view" AS ((select "newer_point_id", "older_point_id" from "negations") union (select "older_point_id", "newer_point_id" from "negations"));