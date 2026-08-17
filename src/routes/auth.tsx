import { createFileRoute } from "@tanstack/react-router";
import Auth from "@/features/pages/Auth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — ProNax" },
      { name: "description", content: "Sign in or create your ProNax account." },
      { property: "og:title", content: "Sign in — ProNax" },
      { property: "og:description", content: "Sign in or create your ProNax account." },
    ],
  }),
  component: Auth,
});
