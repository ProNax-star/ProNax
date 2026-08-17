import { createFileRoute } from "@tanstack/react-router";
import AdminEngine from "@/features/pages/AdminEngine";

export const Route = createFileRoute("/admin/engine")({
  head: () => ({
    meta: [
      { title: "Admin engine — ProNax" },
      { name: "description", content: "Inspect and tune the ProNax recommendation engine." },
      { property: "og:title", content: "Admin engine — ProNax" },
      { property: "og:description", content: "Inspect and tune the ProNax recommendation engine." },
    ],
  }),
  component: AdminEngine,
});
