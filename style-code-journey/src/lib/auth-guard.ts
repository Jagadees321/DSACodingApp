import { redirect } from "@tanstack/react-router";
import { isAuthenticated, userIsAdmin } from "@/lib/api";

/** Client-only: redirect guests to login with return path. SSR skips check (no localStorage). */
export function requireAuthBeforeLoad() {
  if (typeof window === "undefined") return;
  if (isAuthenticated()) return;
  const next = `${window.location.pathname}${window.location.search}`;
  throw redirect({
    to: "/login",
    search: { next, mode: "login" },
  });
}

/** Client-only: signed-in admins only (redirect others to problems). */
export function requireAdminBeforeLoad() {
  if (typeof window === "undefined") return;
  if (!isAuthenticated()) {
    const next = `${window.location.pathname}${window.location.search}`;
    throw redirect({
      to: "/login",
      search: { next, mode: "login" },
    });
  }
  if (!userIsAdmin()) {
    throw redirect({ to: "/problems" });
  }
}
