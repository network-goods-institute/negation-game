"use client";

import { redirect } from "next/navigation";

export default function LegacyProfileRedirect() {
  redirect("/board/profile");
}
