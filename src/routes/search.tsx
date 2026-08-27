/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute } from "@tanstack/react-router";
import SearchResults from "@/features/pages/SearchResults";

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      q: typeof search.q === "string" ? search.q : "",
      category: typeof search.category === "string" ? search.category : undefined,
      uploadDate: typeof search.uploadDate === "string" ? search.uploadDate : undefined,
      duration: typeof search.duration === "string" ? search.duration : undefined,
      type: typeof search.type === "string" ? search.type : undefined,
      sort: typeof search.sort === "string" ? search.sort : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Search — ProNax" },
      { name: "description", content: "Search for videos, channels, and more on ProNax." },
      { property: "og:title", content: "Search — ProNax" },
      { property: "og:description", content: "Search for videos, channels, and more on ProNax." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SearchResults,
});