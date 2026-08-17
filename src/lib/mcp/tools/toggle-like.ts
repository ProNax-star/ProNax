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
  name: "toggle_like",
  title: "Like or unlike a video",
  description: "Toggle the signed-in user's like on a video. Returns the new like state and total likes.",
  inputSchema: {
    video_id: z.string().uuid().describe("Target video UUID."),
  },
  annotations: { readOnlyHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ video_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await supa(ctx).rpc("toggle_like", {
      p_video: video_id,
      p_creator: null,
    });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { result: data },
    };
  },
});
