/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@pronax.dev/mcp-js";
import { z } from "zod";

function supa(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "search_videos",
  title: "Search videos",
  description: "Search public videos on Pro Nax by title or tags. Returns up to 20 videos with title, description, and video id.",
  inputSchema: {
    query: z.string().trim().min(1).describe("Search text matched against video title."),
    limit: z.number().int().min(1).max(20).optional().describe("Max results, default 10."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    const { data, error } = await supa(ctx)
      .from("videos")
      .select("id, title, description, thumb_url, video_url, owner_id, created_at")
      .ilike("title", `%${query}%`)
      .limit(limit ?? 10);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { videos: data ?? [] },
    };
  },
});
