/*
 * ProNax - Server Entry Point
 * Copyright (c) 2026. All rights reserved.
 * 
 * Commercial Single-End Product License.
 * Reselling, distributing, sublicensing, or sharing this codebase 
 * or any portion thereof without explicit written permission is strictly prohibited.
 */

// Server entry disabled - TanStack Start removed for client-side routing only
// This file is only needed for SSR deployments
export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    return new Response("Server-side rendering disabled - using client-side routing only", {
      status: 200,
      headers: { "content-type": "text/plain" },
    });
  },
};
