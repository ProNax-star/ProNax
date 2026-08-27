/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pronax-studio")({
  beforeLoad: () => {
    // Redirect to the real studio implementation
    throw redirect({ to: "/studio" });
  },
});
