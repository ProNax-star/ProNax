import { auth, defineMcp } from "@pronax.dev/mcp-js";
import searchVideos from "./tools/search-videos";
import listMyVideos from "./tools/list-my-videos";
import getMyWallet from "./tools/get-my-wallet";
import postComment from "./tools/post-comment";
import toggleLike from "./tools/toggle-like";
import listNotifications from "./tools/list-notifications";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "pro-nax-mcp",
  title: "Pro Nax Video",
  version: "0.1.0",
  instructions:
    "Tools for Pro Nax Video, a 3D video hosting platform. Use `search_videos` to find videos by title. Use `list_my_videos`, `get_my_wallet`, and `list_notifications` for the signed-in user's own data. Use `post_comment` and `toggle_like` to act on videos as the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchVideos, listMyVideos, getMyWallet, postComment, toggleLike, listNotifications],
});
