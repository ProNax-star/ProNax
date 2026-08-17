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
  name: "post_comment",
  title: "Post a comment",
  description: "Post a comment on a Pro Nax video as the signed-in user.",
  inputSchema: {
    video_id: z.string().uuid().describe("Target video UUID."),
    text: z.string().trim().min(1).max(2000).describe("Comment text."),
    parent_id: z.string().uuid().nullable().optional().describe("Optional parent comment id for a reply."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ video_id, text, parent_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { error } = await supa(ctx).rpc("post_comment", {
      p_video: video_id,
      p_text: text,
      p_parent: parent_id ?? null,
      p_creator: null,
    });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return { content: [{ type: "text", text: "Comment posted." }] };
  },
});
