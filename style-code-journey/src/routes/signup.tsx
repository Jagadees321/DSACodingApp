import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy URL — unified auth lives at `/login` with Create account toggle. */
export const Route = createFileRoute("/signup")({
  beforeLoad: () => {
    throw redirect({ to: "/login", search: { mode: "signup" } });
  },
  component: () => null,
});
