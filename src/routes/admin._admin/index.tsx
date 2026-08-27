import { createFileRoute } from "@tanstack/react-router";
import Admin from "@/features/pages/Admin";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const Route = createFileRoute("/admin/_admin/")({
  head: () => ({
    meta: [
      { title: "Admin — ProNax" },
      { name: "description", content: "ProNax platform administration console." },
      { property: "og:title", content: "Admin — ProNax" },
      { property: "og:description", content: "ProNax platform administration console." },
    ],
  }),
  component: () => (
    <ErrorBoundary>
      <Admin />
    </ErrorBoundary>
  ),
});