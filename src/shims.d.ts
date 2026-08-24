// Ambient shims for build-time-injected globals and optional packages.

declare const __LICENSE_ENABLED__: boolean;
declare const __HWID_BINDING__: boolean;
declare const __DOMAIN_RESTRICTION__: boolean;

declare module "@pronax.dev/mcp-js" {
  export type ToolContext = any;
  export type McpTool = any;
  export const auth: any;
  export const defineMcp: any;
  export const defineTool: any;
  export const createTool: any;
  const mcp: any;
  export default mcp;
}
